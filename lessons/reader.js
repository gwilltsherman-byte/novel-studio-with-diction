(() => {
  "use strict";
  const tracks = {fiction: "Fiction", vocabulary: "Vocabulary"};
  const storageKey = "ns.lesson-reader.v1";
  const embedded = window.parent !== window;
  const requests = new Map();
  const $ = id => document.getElementById(id);
  const isTrack = value => Object.hasOwn(tracks, value);
  const element = (tag, text) => {
    const node = document.createElement(tag);
    if (text != null) node.textContent = String(text);
    return node;
  };

  let generation = 0;
  let current = null;
  let selectionWord = "";
  let tableNumber = 0;
  let pending = null;
  let memory = {};
  function readState() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey));
      if (value && typeof value === "object" && !Array.isArray(value)) memory = value;
    } catch { /* The reader is usable with storage disabled. */ }
    return memory;
  }
  function writeState(state, announce = false) {
    memory = state;
    try { localStorage.setItem(storageKey, JSON.stringify(state)); }
    catch {
      if (announce) {
        $("storage-status").textContent = "Progress can only be kept for this visit because browser storage is unavailable.";
        $("storage-status").hidden = false;
      }
    }
  }
  function selectedKey(track, lesson) { return track + "/" + lesson; }
  function remember(track, lesson) {
    const state = readState();
    state.track = track;
    state.recent = {...state.recent, [track]: lesson};
    writeState(state);
  }
  function doneSet() {
    const stored = readState().done;
    return new Set(Array.isArray(stored) ? stored : []);
  }
  function course(track) {
    if (!requests.has(track)) {
      const task = fetch(track + ".json", {credentials: "same-origin"}).then(response => {
        if (!response.ok) throw new Error("Course unavailable");
        return response.json();
      }).then(data => {
        if (!Array.isArray(data.lessons) || !data.lessons.length) throw new Error("No lessons");
        return data;
      }).catch(error => {
        requests.delete(track);
        throw error;
      });
      requests.set(track, task);
    }
    return requests.get(track);
  }
  function route() {
    const [track, lesson] = location.hash.slice(1).split("/");
    try { return isTrack(track) ? {track, lesson: lesson ? decodeURIComponent(lesson) : null} : {}; }
    catch { return {}; }
  }
  function address(track, lesson) {
    return "#" + track + "/" + encodeURIComponent(lesson);
  }
  function setAddress(track, lesson, push) {
    const hash = address(track, lesson);
    if (location.hash === hash) return;
    if (push && !embedded) history.pushState(null, "", hash);
    else history.replaceState(null, "", hash);
  }
  function notify(message) {
    if (embedded) window.parent.postMessage(message, location.origin);
  }

  function lessonName(lesson) { return lesson.title || lesson.label || lesson.id; }
  function sideLabel(lesson) {
    return lesson.label && lesson.label !== lessonName(lesson) ? lesson.label : "";
  }
  function fullName(lesson) {
    const label = sideLabel(lesson);
    return label ? label + " · " + lessonName(lesson) : lessonName(lesson);
  }
  function showList() {
    const {track, lessons, lesson} = current;
    const done = doneSet();
    const nav = document.createDocumentFragment(), options = document.createDocumentFragment();
    let previousGroup, list, group;
    for (const item of lessons) {
      const category = item.group || (/^week[- ]?\d+/i.test(item.id) ? "Weekly lessons" : "Course materials");
      if (previousGroup !== category) {
        const heading = element("h3", category);
        heading.className = "group-title";
        list = element("ul");
        nav.append(heading, list);
        group = element("optgroup");
        group.label = category;
        options.append(group);
        previousGroup = category;
      }
      const completed = done.has(selectedKey(track, item.id));
      const li = element("li"), link = element("a");
      link.href = address(track, item.id);
      link.dataset.lesson = item.id;
      if (item.id === lesson.id) link.setAttribute("aria-current", "page");
      if (sideLabel(item)) {
        const label = element("span", sideLabel(item));
        label.className = "lesson-label";
        link.append(label);
      }
      const name = element("span", lessonName(item));
      name.className = "lesson-name";
      link.append(name);
      if (completed) {
        const mark = element("span", "✓");
        mark.className = "done";
        mark.setAttribute("aria-hidden", "true");
        link.append(mark);
        link.setAttribute("aria-label", fullName(item) + ", completed");
      }
      li.append(link);
      list.append(li);
      const option = element("option", (completed ? "✓ " : "") + fullName(item));
      option.value = item.id;
      group.append(option);
    }
    $("lesson-list").replaceChildren(nav);
    $("lesson-picker").replaceChildren(options);
    $("lesson-picker").value = lesson.id;
    $("mobile-picker").hidden = false;
    const count = lessons.filter(item => done.has(selectedKey(track, item.id))).length;
    $("progress").textContent = count + " of " + lessons.length + " completed";
    $("progress").hidden = false;
    const marked = done.has(selectedKey(track, lesson.id));
    $("complete").setAttribute("aria-pressed", String(marked));
    $("complete-label").textContent = marked ? "Completed" : "Mark complete";
  }

  function safeLink(raw, label) {
    let url;
    try { url = new URL(raw); } catch { return null; }
    if (!["https:", "http:"].includes(url.protocol)) return null;
    const link = element("a", label || url.hostname);
    link.href = url.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  }
  function sourceLinks(items) {
    const links = element("div");
    links.className = "source-links";
    for (const item of items || []) {
      if (!item) continue;
      const target = typeof item === "string" ? {url: item} : item;
      const link = safeLink(target.url, target.text || target.label);
      if (link) links.append(link);
    }
    return links;
  }
  function columnPractice(table, block) {
    if (current.track !== "vocabulary" || block.header !== true || table.rows.length < 2) return null;
    const headings = [...table.rows[0].cells].map(cell => cell.textContent.trim().replace(/\s+/g, " "));
    if (new Set(headings.filter(Boolean)).size < 2) return null;
    const practice = element("div");
    practice.className = "column-practice";
    const label = element("label", "Cover a column");
    const select = element("select");
    table.id = "practice-table-" + (++tableNumber);
    select.setAttribute("aria-controls", table.id);
    const none = element("option", "Choose column");
    none.value = "";
    select.append(none);
    headings.forEach((heading, index) => {
      if (!heading) return;
      const option = element("option", heading);
      option.value = String(index);
      select.append(option);
    });
    const reveal = element("button", "Reveal");
    reveal.type = "button";
    reveal.className = "secondary";
    reveal.setAttribute("aria-controls", table.id);
    reveal.hidden = true;
    function cover(value) {
      const column = value === "" ? -1 : Number(value);
      for (const row of [...table.rows].slice(1)) {
        for (const cell of row.cells) {
          const hidden = cell.cellIndex === column;
          cell.classList.toggle("covered-cell", hidden);
          if (hidden) cell.setAttribute("aria-label", headings[column] + " covered");
          else cell.removeAttribute("aria-label");
        }
      }
      select.value = value;
      reveal.hidden = value === "";
    }
    select.addEventListener("change", () => cover(select.value));
    reveal.addEventListener("click", () => { cover(""); select.focus(); });
    label.append(select);
    practice.append(label, reveal);
    return practice;
  }
  function contentBlock(block) {
    const output = document.createDocumentFragment();
    let node;
    switch (block.type) {
      case "heading":
        node = element(block.level === 3 ? "h3" : "h2", block.text);
        break;
      case "list":
        node = element(block.ordered ? "ol" : "ul");
        for (const item of block.items || []) node.append(element("li", typeof item === "string" ? item : item.text));
        if (!node.children.length && block.text) node.append(element("li", block.text));
        break;
      case "table": {
        node = element("div");
        node.className = "table-wrap";
        const table = element("table");
        if (block.caption) table.append(element("caption", block.caption));
        for (const [i, row] of (block.rows || []).entries()) {
          const tr = element("tr");
          for (const value of row) {
            const isHeader = i === 0 && block.header === true;
            const td = element(isHeader ? "th" : "td");
            td.append(element("span", typeof value === "string" ? value : value?.text ?? value));
            if (isHeader) td.scope = "col";
            tr.append(td);
          }
          table.append(tr);
        }
        const practice = columnPractice(table, block);
        if (practice) output.append(practice);
        node.append(table);
        break;
      }
      case "pre":
        node = element("pre", block.text);
        break;
      case "link":
        node = safeLink(block.url, block.text) || element("p", block.text);
        break;
      default:
        node = element("p", block.text);
    }
    output.append(node);
    if (block.links?.length) {
      const links = sourceLinks(block.links);
      if (links.childElementCount) output.append(links);
    }
    return output;
  }
  function showText() {
    selectionWord = "";
    $("look-up").hidden = true;
    tableNumber = 0;
    const pages = current.lesson.pages || [];
    const result = document.createDocumentFragment();
    for (const [index, page] of pages.entries()) {
      const section = element("section");
      section.className = "source-page";
      section.id = "source-page-" + (page.number ?? index + 1);
      section.tabIndex = -1;
      const pageLabel = "Page " + (page.number ?? index + 1);
      section.setAttribute("aria-label", pageLabel);
      if (pages.length > 1) {
        const label = element("div", pageLabel);
        label.className = "page-label";
        section.append(label);
      }
      for (const block of page.blocks || []) section.append(contentBlock(block));
      if (page.links?.length) {
        const links = sourceLinks(page.links);
        if (links.childElementCount) section.append(links);
      }
      result.append(section);
    }
    $("lesson-body").replaceChildren(result);
  }
  function turnLink(id, lesson) {
    const link = $(id);
    link.hidden = !lesson;
    if (lesson) {
      link.href = address(current.track, lesson.id);
      link.dataset.lesson = lesson.id;
      link.querySelector("strong").textContent = fullName(lesson);
    } else {
      link.removeAttribute("href");
      delete link.dataset.lesson;
    }
  }
  function render(focus) {
    const {track, lesson, lessons} = current;
    const index = lessons.indexOf(lesson);
    const trackName = tracks[track];
    for (const button of document.querySelectorAll("[data-track]")) {
      button.setAttribute("aria-pressed", String(button.dataset.track === track));
    }
    document.body.dataset.course = track;
    $("lesson-title").textContent = lessonName(lesson);
    $("context").textContent = [trackName, sideLabel(lesson)].filter(Boolean).join(" · ");
    document.title = lessonName(lesson) + " · " + trackName + " · Novel Studio";
    showList();
    showText();
    window.NovelStudy.open({track, lesson, contentBlock, sourceLinks, navigate: open});
    turnLink("prev", lessons[index - 1]);
    turnLink("next", lessons[index + 1]);
    $("retry").hidden = true;
    $("notice").hidden = true;
    $("article").hidden = false;
    const originals = $("lesson-originals");
    originals.dataset.track = track;
    originals.dataset.lesson = lesson.id;
    window.dispatchEvent(new CustomEvent("ns-lesson-rendered", {detail: {track, lesson: lesson.id}}));
    if (focus) {
      $("lesson-title").focus({preventScroll: true});
      const narrow = matchMedia("(max-width: 790px)").matches;
      if (narrow) $("reading").scrollIntoView({block: "start"});
      else window.scrollTo(0, 0);
    }
  }
  async function open(track, requested, {push = false, focus = false, action} = {}) {
    const state = readState();
    track = isTrack(track) ? track : isTrack(state.track) ? state.track : "fiction";
    const version = ++generation;
    pending = {track, requested, action};
    try {
      const {lessons} = await course(track);
      if (generation !== version) return;
      const preferred = requested || state.recent?.[track];
      const lesson = lessons.find(item => item.id === preferred) || lessons.find(item => item.id === "week-1") || lessons[0];
      setAddress(track, lesson.id, push);
      if (current?.track !== track || current.lesson.id !== lesson.id || $("article").hidden) {
        current = {track, lessons, lesson};
        remember(track, lesson.id);
        render(focus);
      }
      notify({type: "ns-lesson-change", track, lesson: lesson.id});
      if (action && (!requested || lesson.id === requested)) window.NovelStudy.showActivity(action);
    } catch {
      if (generation !== version) return;
      $("notice").textContent = "This course could not be loaded. Check your connection and try again.";
      $("notice").hidden = false;
      $("retry").hidden = false;
      $("article").hidden = true;
    }
  }
  function followHash() {
    const {track, lesson} = route();
    open(track, lesson);
  }
  document.querySelectorAll("button[data-track]").forEach(button => button.addEventListener("click", () => {
    open(button.dataset.track, null, {push: true});
  }));
  $("lesson-picker").addEventListener("change", event => open(current.track, event.target.value, {push: true, focus: true}));
  document.addEventListener("click", event => {
    const link = event.target.closest("a[data-lesson]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(current.track, link.dataset.lesson, {push: true, focus: true});
  });
  document.querySelector(".skip").addEventListener("click", event => {
    event.preventDefault();
    if (current) $("lesson-title").focus();
  });
  $("complete").addEventListener("click", () => {
    if (!current) return;
    const state = readState(), done = doneSet();
    const key = selectedKey(current.track, current.lesson.id);
    if (done.has(key)) done.delete(key);
    else done.add(key);
    state.done = Array.from(done);
    writeState(state, true);
    showList();
  });
  function selectedTerm() {
    const selection = window.getSelection();
    const body = $("article");
    if (!selection || selection.isCollapsed || !body.contains(selection.anchorNode) || !body.contains(selection.focusNode)) return "";
    const term = selection.toString().trim().replace(/\s+/g, " ");
    return term && term.length <= 120 && term.split(" ").length <= 10 ? term : "";
  }
  if (embedded) {
    const lookup = $("look-up");
    document.addEventListener("selectionchange", () => {
      const term = selectedTerm();
      if (!term && document.activeElement === lookup) return;
      selectionWord = term;
      lookup.hidden = !term;
    });
    lookup.addEventListener("pointerdown", event => event.preventDefault());
    lookup.addEventListener("click", () => {
      if (!selectionWord) return;
      notify({type: "ns-lesson-workspace", workspace: "diction", word: selectionWord});
      lookup.hidden = true;
      selectionWord = "";
      window.getSelection()?.removeAllRanges();
    });
  }
  $("workspace").addEventListener("click", event => {
    if (!embedded || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    notify({type: "ns-lesson-workspace", workspace: "diction"});
  });
  $("retry").addEventListener("click", () => {
    if (pending) open(pending.track, pending.requested, {action:pending.action});
  });
  window.addEventListener("message", event => {
    if (!embedded || event.source !== window.parent || event.origin !== location.origin) return;
    const data = event.data;
    if (data?.type === "ns-open-lesson" && isTrack(data.track)) open(data.track, data.lesson, {action:data.action});
  });
  window.addEventListener("hashchange", followHash);
  window.addEventListener("popstate", followHash);
  window.addEventListener("storage", event => { if (event.key === storageKey && current) showList(); });
  followHash();
})();
