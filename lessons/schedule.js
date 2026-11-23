(() => {
  "use strict";

  const prefix = "ns.practice.schedule.v1/";
  const day = 24 * 60 * 60 * 1000;
  const intervals = [1, 3, 7, 14, 30, 60, 90, 180];
  const sessionSize = 6;
  const records = new Map();
  const pending = new Map();
  const indexedLessons = new Map();
  let loaded = false;
  let storageAvailable = true;

  // Store one record per card, so practice in one tab cannot replace another lesson's history.
  try {
    const testKey = prefix + "probe";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
  } catch { storageAvailable = false; }

  function parseRecord(raw) {
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      if (data && Number.isSafeInteger(data.at) && data.at >= 0 &&
          Number.isSafeInteger(data.due) && data.due >= data.at &&
          Number.isInteger(data.level) && data.level >= 0 && data.level <= intervals.length &&
          ["again", "hard", "good"].includes(data.grade)) return data;
    } catch { /* A damaged entry does not affect other cards. */ }
    return null;
  }

  function refreshRecord(key) {
    if (pending.has(key)) return pending.get(key);
    try {
      const record = parseRecord(window.localStorage.getItem(prefix + key));
      if (record) records.set(key, record);
      else records.delete(key);
    } catch { storageAvailable = false; }
    return records.get(key);
  }

  function loadRecords() {
    if (loaded) return;
    // Only read records for attempted cards. A first visit need not do thousands of
    // synchronous storage reads (or read any unrelated writing or vocabulary data).
    try {
      const storage = window.localStorage;
      for (const storedKey of Object.keys(storage)) {
        if (storedKey.startsWith(prefix)) refreshRecord(storedKey.slice(prefix.length));
      }
      loaded = true;
    } catch { storageAvailable = false; }
  }

  window.addEventListener("storage", event => {
    if (event.key === null) {
      records.clear();
      for (const [key, value] of pending) records.set(key, value);
      loaded = false;
    } else if (loaded && event.key.startsWith(prefix)) {
      refreshRecord(event.key.slice(prefix.length));
    }
  });

  function rate(key, grade) {
    if (typeof key !== "string" || !["again", "hard", "good"].includes(grade)) {
      throw new TypeError("A card key and a valid practice rating are required.");
    }
    const prior = refreshRecord(key);
    const now = Date.now();
    let level = prior?.level || 0;
    let due;
    if (grade === "again") {
      level = 0;
      due = now + 10 * 60 * 1000;
    } else if (grade === "hard") {
      level = Math.max(0, level - 1);
      due = now + (level === 0 ? day / 4 : Math.min(3, intervals[level - 1] / 2) * day);
    } else if (prior && now < prior.due) {
      // A same-session recovery after feedback earns another retrieval at the original due time.
      due = prior.due;
    } else {
      level = Math.min(intervals.length, level + 1);
      due = now + intervals[level - 1] * day;
    }
    const record = {at: now, due, level, grade};
    records.set(key, record);
    pending.set(key, record);
    try {
      for (const [pendingKey, value] of pending) {
        const existing = parseRecord(window.localStorage.getItem(prefix + pendingKey));
        if (!existing || existing.at <= value.at) {
          window.localStorage.setItem(prefix + pendingKey, JSON.stringify(value));
        } else {
          records.set(pendingKey, existing);
        }
        pending.delete(pendingKey);
      }
      storageAvailable = true;
    } catch { storageAvailable = false; }
    return {due: records.get(key).due, storageAvailable};
  }

  function itemKey(track, lessonId, cardId) {
    return [track, lessonId, cardId].map(encodeURIComponent).join("/");
  }

  function* inventory(banks) {
    loadRecords();
    for (const [track, lessons] of Object.entries(banks || {})) {
      for (const [lessonId, cards] of Object.entries(lessons || {})) {
        if (!Array.isArray(cards)) continue;
        const path = encodeURIComponent(track) + "/" + encodeURIComponent(lessonId);
        let indexed = indexedLessons.get(path);
        if (!indexed || indexed.cards !== cards || indexed.items.length !== cards.length) {
          const items = cards.map(card => ({key: itemKey(track, lessonId, card.id), track, lessonId, card}));
          indexed = {cards, items};
          indexedLessons.set(path, indexed);
        }
        yield* indexed.items;
      }
    }
  }

  function summary(banks, track, lessonId) {
    const now = Date.now();
    let total = 0, seen = 0, due = 0, globalDue = 0, nextDue = null;
    for (const item of inventory(banks)) {
      const local = item.track === track && item.lessonId === lessonId;
      if (local) total++;
      const record = records.get(item.key);
      if (!record) continue;
      if (local) seen++;
      if (record.due <= now) {
        globalDue++;
        if (local) due++;
      } else if (nextDue === null || record.due < nextDue) nextDue = record.due;
    }
    return {total, seen, due, globalDue, nextDue, storageAvailable};
  }

  // Alternate the kind of thinking and, in mixed review, the studied lesson.
  // Oldest due date or original lesson order breaks ties.
  function take(pool, chosen, mixLessons) {
    const last = chosen[chosen.length - 1];
    let best = 0, bestScore = Infinity;
    for (const [index, item] of pool.entries()) {
      let score = 0;
      for (const previous of chosen) {
        if (previous.card.kind === item.card.kind) score += previous === last ? 3 : 1;
        if (mixLessons && previous.track === item.track && previous.lessonId === item.lessonId) {
          score += previous === last ? 8 : 3;
        }
      }
      if (score < bestScore) { best = index; bestScore = score; }
      if (score === 0) break;
    }
    chosen.push(pool.splice(best, 1)[0]);
  }

  function start({banks, track, lessonId, mode}) {
    const now = Date.now();
    const all = [...inventory(banks)];
    const isLocal = item => item.track === track && item.lessonId === lessonId;
    const due = all.filter(item => records.get(item.key)?.due <= now)
      .sort((a, b) => records.get(a.key).due - records.get(b.key).due);
    const chosen = [];
    if (mode === "review") {
      while (due.length && chosen.length < sessionSize) take(due, chosen, true);
    } else {
      const localDue = due.filter(isLocal);
      const fresh = all.filter(item => isLocal(item) && !records.has(item.key));
      const otherDue = due.filter(item => !isLocal(item));
      const mix = otherDue.length && localDue.length + fresh.length >= 3;
      const limit = mix ? sessionSize - 1 : sessionSize;
      while ((localDue.length || fresh.length) && chosen.length < limit) {
        const reviewTurn = localDue.length && (!fresh.length || chosen.length % 2 === 0);
        take(reviewTurn ? localDue : fresh, chosen, false);
      }
      if (mix) take(otherDue, chosen, true);
    }
    const items = chosen.map(({key, track, lessonId, card}) => ({key, track, lessonId, card}));
    return {items, storageAvailable};
  }

  window.StudySchedule = {start, rate, summary, itemKey};
})();
