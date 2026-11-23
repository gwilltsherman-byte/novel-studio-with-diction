(() => {
  "use strict";

  if (window.NovelLearning) return;
  const changeEvent = "ns-learning-progress";
  // In the combined app, both workspaces use one live ledger. An independently opened
  // workspace uses the same storage format and receives normal cross-tab storage events.
  try {
    const host = window.parent;
    if (host !== window && host.location.origin === window.location.origin && host.NovelLearning) {
      window.NovelLearning = host.NovelLearning;
      const relay = event => window.dispatchEvent(new CustomEvent(changeEvent, {detail:event.detail}));
      host.addEventListener(changeEvent, relay);
      window.addEventListener("pagehide", () => host.removeEventListener(changeEvent, relay));
      window.addEventListener("pageshow", () => host.addEventListener(changeEvent, relay));
      return;
    }
  } catch { /* An independently embedded workspace can keep its own record. */ }

  const prefix = "ns.learning.v1/";
  const grades = ["again", "hard", "good"];
  const kinds = ["recall", "compare", "apply"];
  const minDelay = 20 * 60 * 60 * 1000;
  const levelSize = 30;
  const entries = new Map();
  const unsaved = new Map();
  let loaded = false, durable = true, cached = null;

  function dayOf(time) {
    const d = new Date(time);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
  }
  function midnightAfter(time) {
    const d = new Date(time);
    d.setHours(24, 0, 0, 0);
    return d.getTime();
  }
  function encode(entry) {
    return JSON.stringify([entry.first, entry.last, entry.kind, entry.grade, entry.retry]);
  }
  function decode(path, raw) {
    if (!raw) return null;
    const parts = /^(\d{4}-\d{2}-\d{2})\/(fiction|vocabulary)\/(attempt|opener)\/(.+)$/.exec(path);
    if (!parts) return null;
    try {
      const [first,last,kind,grade,retry] = JSON.parse(raw);
      if (!Number.isSafeInteger(first) || first < 0 || !Number.isSafeInteger(last) || last < first ||
          !kinds.includes(kind) || !grades.includes(grade) || typeof retry !== "boolean") return null;
      return {day:parts[1], track:parts[2], type:parts[3], id:parts[4], first,last,kind,grade,retry};
    } catch { return null; }
  }
  // One row per item and local date makes same-day repeats idempotent. Its first
  // response determines credit; its latest exposure sets the clock for delayed recall.
  function merge(a, b) {
    if (!a || !b) return a || b;
    let first = a;
    if (b.first < a.first || (b.first === a.first && grades.indexOf(b.grade) < grades.indexOf(a.grade))) first = b;
    return {...first, last:Math.max(a.last,b.last)};
  }
  function load() {
    if (loaded) return;
    loaded = true;
    try {
      const store = window.localStorage;
      for (const key of Object.keys(store)) {
        if (!key.startsWith(prefix)) continue;
        const path = key.slice(prefix.length);
        const entry = decode(path,store.getItem(key));
        if (entry) entries.set(path,merge(entry,unsaved.get(path)));
      }
    } catch { durable = false; }
  }

  function eventRow(event, time) {
    if (!event || !["attempt","opener"].includes(event.type) ||
        !["fiction","vocabulary"].includes(event.track) || !grades.includes(event.grade) ||
        typeof event.key !== "string" || !event.key.trim() || event.key.length > 700) return null;
    const kind = event.type === "opener" ? "compare" : event.kind;
    if (!kinds.includes(kind)) return null;
    return {day:dayOf(time), track:event.track, type:event.type, id:event.key, kind, grade:event.grade,
      retry:event.retry === true, first:time, last:time};
  }

  function record(event) {
    const entry = eventRow(event,Date.now());
    if (!entry) return snapshot();
    load();
    const path = [entry.day,entry.track,entry.type,entry.id].join("/");
    const next = merge(entries.get(path),entry);
    entries.set(path,next);
    unsaved.set(path,next);
    try {
      const store = window.localStorage;
      for (const [key,value] of unsaved) {
        const saved = merge(decode(key,store.getItem(prefix + key)),value);
        store.setItem(prefix + key,encode(saved));
        entries.set(key,saved);
        unsaved.delete(key);
      }
      durable = true;
    } catch { durable = false; }
    return announce();
  }

  function tally() { return {xp:0, attempts:0, applications:0, retained:0}; }

  // "Attempts", applications and retained skills in the lifetime totals count
  // distinct items. A day's quests can credit the same item again on a later day.
  function snapshot() {
    load();
    const now = Date.now(), day = dayOf(now);
    if (cached && cached.value.today.date === day && now >= cached.at && now < cached.until) return cached.value;
    const today = {date:day, attempts:0, applications:0, retained:0, targets:{attempts:3, applications:1, retained:1}};
    const tracks = {fiction:tally(), vocabulary:tally()};
    const lessons = {fiction:{}, vocabulary:{}};
    const totals = {days:0, attempts:0, applications:0, retained:0, openers:0};
    const skills = {recall:0, compare:0, apply:0};
    const byItem = new Map(), days = new Set();
    let eligibleReviews = 0, nextReviewAt = null;
    for (const entry of entries.values()) {
      const key = [entry.track,entry.type,entry.id].join("/");
      if (!byItem.has(key)) byItem.set(key,[]);
      byItem.get(key).push(entry);
    }
    for (const history of byItem.values()) {
      history.sort((a,b) => a.first - b.first);
      const first = history[0], track = tracks[first.track];
      let seen = false, successful = false, remembered = false, prior = null, successKind;
      for (const item of history) {
        if (!item.retry) {
          days.add(item.day);
          seen = true;
          if (item.type === "opener") {
            if (!successful && item.grade === "good") {
              successful = true;
              track.xp++;
              totals.openers++;
            }
          } else {
            if (item.day === day) today.attempts++;
            if (item.grade === "good") {
              if (!successful) {
                successful = true;
                successKind = item.kind;
                skills[item.kind]++;
                track.xp += item.kind === "apply" ? 6 : 4;
                if (item.kind === "apply") track.applications++;
              }
              if (item.day === day && item.kind === "apply") today.applications++;
              if (prior && item.day !== prior.day && item.first - prior.last >= minDelay) {
                track.xp += 8;
                remembered = true;
                if (item.day === day) today.retained++;
              }
            }
          }
        }
        prior = item;
      }
      if (seen && first.type === "attempt") {
        track.attempts++;
        if (remembered) track.retained++;
        // The reader uses track/lesson/card keys; standalone word practice has its own IDs.
        const route = /^(fiction|vocabulary)\/(week-(?:[1-9]|1[0-9]|20)|map)\/[^/]+$/.exec(first.id);
        if (successful && route && route[1] === first.track && (route[2] !== "map" || first.track === "fiction")) {
          const course = lessons[first.track];
          const lesson = course[route[2]] ||= {recalled:0,applied:0,retained:0};
          if (successKind === "apply") lesson.applied++;
          else lesson.recalled++;
          if (remembered) lesson.retained++;
        }
        const eligibleAt = Math.max(prior.last + minDelay, prior.day === day ? midnightAfter(now) : 0);
        if (eligibleAt <= now) eligibleReviews++;
        else if (nextReviewAt === null || eligibleAt < nextReviewAt) nextReviewAt = eligibleAt;
      }
    }
    totals.days = days.size;
    for (const metric of ["attempts","applications","retained"]) totals[metric] = tracks.fiction[metric] + tracks.vocabulary[metric];
    const xp = tracks.fiction.xp + tracks.vocabulary.xp;
    const level = {number:1 + Math.floor(xp / levelSize), earned:xp % levelSize, required:levelSize};
    const value = {xp, level, today, tracks, lessons, totals, skills, eligibleReviews, nextReviewAt, storageAvailable:durable};
    cached = {value, at:now, until:Math.min(midnightAfter(now),nextReviewAt ?? Infinity)};
    return value;
  }

  function announce() {
    cached = null;
    const value = snapshot();
    window.dispatchEvent(new CustomEvent(changeEvent,{detail:value}));
    return value;
  }
  window.addEventListener("storage", event => {
    if (event.key === null) {
      entries.clear();
      for (const [path,value] of unsaved) entries.set(path,value);
      loaded = false;
      announce();
    } else if (event.key.startsWith(prefix)) {
      const path = event.key.slice(prefix.length);
      try {
        const fresh = decode(path,window.localStorage.getItem(event.key));
        const value = merge(fresh,unsaved.get(path));
        if (value) entries.set(path,value);
        else entries.delete(path);
      } catch { durable = false; }
      announce();
    }
  });
  window.NovelLearning = {snapshot,record};
})();
