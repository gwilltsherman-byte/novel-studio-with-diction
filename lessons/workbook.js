// The lesson workbook. Each assignment opens directly into its own draft screen, which
// keeps the prompt, the writing, the save status, the word count and the self-check together.
(() => {
  "use strict";

  const prefix = "ns.workbook.v1/";
  const caretPrefix = "ns.workbook.caret.v1/";
  const openKey = "ns.workbook.open.v1";
  const unsaved = new Map();
  const rowUpdates = new WeakMap();
  const screen = document.getElementById("draft-screen");
  let draft = null;
  let restored = false;
  let openMemory = null;
  let rowCount = 0;

  function text(value) {
    return String(typeof value === "string" ? value : value?.text || "").trim();
  }

  function element(tag, content, className) {
    const result = document.createElement(tag);
    if (content) result.textContent = content;
    if (className) result.className = className;
    return result;
  }

  const assignmentTitle = /\b(drills?|pages due|capstone|worksheets?|reading assignments|revision passes|tests|map a practice page|test a signature|draw eight shapes|score the pauses|how to build a week yourself|how to keep it)\b/i;
  const explicitTask = /(?:^|\s)(?:(?:awake )?drill|exercise|pages due)\s*:/i;
  const writingTask = /(?:^|[.!?]\s+)(?:\d+[.)]\s*)?(?:write|rewrite|draft|retell|revise|transcribe|outline|describe|draw|sketch|annotate|submit|rescore|map|chart|coin|finish a story|give about|choose one shape|build a second strand|record yourself|make a list)\b/i;
  const taskHeader = /^(task|exercise|work to do|questions? for your draft|revision question|test|job|sketch it|effect to try)$/i;

  // Task identity is part of each saved response's storage key. Keep this logic stable.
  function prompts(unit) {
    const tasks = [];
    const named = assignmentTitle.test(unit.title);
    const seen = new Set();
    function add(prompt, label = "", identity = prompt, criterion = "") {
      const id = identity.replace(/\s+/g, " ").trim().toLowerCase();
      if (!id || seen.has(id)) return;
      seen.add(id);
      const instruction = prompt.replace(/^\s*(?:\d+[.)]\s*)?(?:(?:awake )?drill|exercise|pages due)\s*:\s*/i, "")
        .replace(/^\s*\d+[.)]\s*/, "");
      tasks.push({id, label: label || prompt, prompt, criterion: criterion || instruction});
    }
    for (const ref of unit.refs) {
      const b = ref.block;
      if (!b) continue;
      if (b.type === "list") {
        for (const item of b.items || []) {
          const task = text(item);
          if (named || explicitTask.test(task) || writingTask.test(task)) add(task);
        }
      }
      if (b.type === "paragraph" && (explicitTask.test(b.text) || writingTask.test(b.text) ||
          (named && /^\s*\d+[.)]\s/.test(b.text)))) {
        add(b.text, /capstone/i.test(unit.title) ? "Full capstone" : "");
      }
      if (b.type === "table" && b.header && b.rows?.length > 1) {
        const headers = b.rows[0].map(text);
        const target = headers.findIndex((name, index) => index > 0 && taskHeader.test(name));
        if (target >= 0 && (headers[target].toLowerCase() !== "job" || /capstone|proportion/i.test(unit.title))) {
          for (const row of b.rows.slice(1)) {
            const label = text(row[0]), instruction = text(row[target]);
            if (!instruction || !label) continue;
            const details = row.slice(1).map((cell, index) =>
              text(cell) ? headers[index + 1] + " — " + text(cell) : "").filter(Boolean);
            add([label, ...details].join("\n"), label, label + " " + instruction, instruction);
          }
        }
      }
    }
    if (!tasks.length && named) {
      const instruction = unit.refs.map(ref => ref.block).find(b => b?.type === "paragraph" && b.text.trim());
      add("Use the instructions in this section to work on “" + unit.title + "” below.", unit.title, unit.title,
        instruction?.text || "Name the instruction you followed in “" + unit.title + "”.");
    }
    return tasks;
  }

  const capital = value => value.charAt(0).toUpperCase() + value.slice(1);
  // A short title ("Scene and summary") and the instruction, for the list and the draft screen.
  function describe(task) {
    if (task.label !== task.prompt) {
      const lines = task.prompt.startsWith(task.label + "\n") ? task.prompt.split("\n").slice(1) : [task.prompt];
      const summary = lines.length > 1 || / — /.test(lines[0]) ? task.criterion : lines[0];
      return {number: "", title: capital(task.label.replace(/\.$/, "")), summary, lines};
    }
    let rest = task.prompt.trim(), number = "";
    const numbered = /^(\d+)[.)]\s*/.exec(rest);
    if (numbered) { number = numbered[1]; rest = rest.slice(numbered[0].length); }
    const named = /^((?:awake )?drill|exercise|pages due)\s*:\s*/i.exec(rest);
    if (named) {
      const body = capital(rest.slice(named[0].length));
      return {number, title: capital(named[1].toLowerCase()), summary: body, lines: [body]};
    }
    const lead = /^([^.!?:;,]{2,40}?)\.\s+(?=\S)/.exec(rest);
    if (lead && lead[1].trim().split(/\s+/).length <= 4 && /^[A-Z“"]/.test(lead[1])) {
      const body = rest.slice(lead[0].length);
      return {number, title: lead[1], summary: body, lines: [body]};
    }
    return {number, title: "", summary: rest, lines: [rest]};
  }

  function read(key) {
    if (unsaved.has(key)) return {value:unsaved.get(key), durable:false};
    try { return {value:localStorage.getItem(key) || "", durable:true}; }
    catch { return {value:"", durable:false}; }
  }
  function write(key, value) {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
      unsaved.delete(key);
      return true;
    } catch {
      unsaved.set(key, value);
      return false;
    }
  }
  // Which draft is open survives a reload, so a returning writer lands where they left.
  function readOpen() {
    try { return JSON.parse(sessionStorage.getItem(openKey)) || null; } catch { return openMemory; }
  }
  function saveOpen(value) {
    openMemory = value;
    try {
      if (value) sessionStorage.setItem(openKey, JSON.stringify(value));
      else sessionStorage.removeItem(openKey);
    } catch { /* memory is enough for this page */ }
  }

  function exerciseId(fixedCoursePrompt) {
    let hash = 2166136261;
    for (const character of fixedCoursePrompt) {
      hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
    }
    return "workbook-" + (hash >>> 0).toString(36);
  }
  function keysFor(ctx, task) {
    const itemKey = [ctx.track, ctx.lessonId, exerciseId(task.id)].join("/");
    return {
      response: prefix + encodeURIComponent(ctx.track) + "/" + encodeURIComponent(ctx.lessonId) + "/" + encodeURIComponent(task.id),
      itemKey,
      note: "ns.workbook.evidence.v1/" + itemKey,
      credit: "ns.workbook.checked.v1/" + itemKey,
      caret: caretPrefix + itemKey
    };
  }
  const countWords = value => (value.match(/\S+/g) || []).length;
  const wordLabel = count => count.toLocaleString() + (count === 1 ? " word" : " words");
  function excerpt(value) {
    const line = value.trim().split(/\n+/)[0].replace(/\s+/g, " ");
    return line.length > 90 ? line.slice(0, 88).trimEnd() + "…" : line;
  }

  function row(ctx, task) {
    const info = describe(task);
    const keys = keysFor(ctx, task);
    const id = "assignment-" + (++rowCount);
    const item = element("li", "", "assignment");
    item.dataset.task = task.id;
    if (info.number) item.dataset.number = info.number;
    const title = element("p", info.title || info.summary, "assignment-title");
    title.id = id;
    item.append(title);
    if (info.title && info.summary) item.append(element("p", info.summary, "assignment-text"));
    const state = element("p", "", "assignment-state");
    const action = element("button", "", "assignment-action");
    action.type = "button";
    action.setAttribute("aria-describedby", id);
    action.addEventListener("click", () => openDraft(ctx, task));
    item.append(state, action);
    function update() {
      const value = read(keys.response).value;
      const started = Boolean(value.trim());
      const checked = Boolean(read(keys.credit).value);
      action.textContent = started ? "Continue your response" : "Write this exercise";
      action.classList.toggle("is-started", started);
      state.replaceChildren();
      state.hidden = !started;
      if (started) {
        state.append(element("span", wordLabel(countWords(value)) + (checked ? " · Self-check done" : ""), "assignment-meta"),
          element("span", "“" + excerpt(value) + "”", "assignment-excerpt"));
      }
    }
    rowUpdates.set(item, update);
    update();
    return item;
  }

  function append(root, ctx) {
    const tasks = prompts(ctx.unit);
    if (!tasks.length) return;
    const section = element("section", "", "workbook");
    const heading = element("h3", "Lesson workbook", "workbook-heading");
    heading.id = "workbook-heading-" + (++rowCount);
    section.setAttribute("aria-labelledby", heading.id);
    const note = element("p", tasks.length === 1 ? "One assignment. Your response saves on this device as you write."
      : tasks.length + " assignments. Responses save on this device as you write.", "workbook-note");
    const list = element("ol", "", "assignment-list");
    for (const task of tasks) list.append(row(ctx, task));
    list.classList.toggle("is-numbered", Boolean(list.querySelector("[data-number]")));
    section.append(heading, note, list);
    root.append(section);
    const open = readOpen();
    if (!restored && open?.track === ctx.track && open.lessonId === ctx.lessonId) {
      const task = tasks.find(item => item.id === open.task);
      restored = true;
      if (task) queueMicrotask(() => openDraft(ctx, task, {restoring: true}));
    }
  }

  // Measure where the caret sits inside a growing textarea, to bring that sentence into view.
  function caretOffset(field, index) {
    const mirror = document.createElement("div");
    const style = getComputedStyle(field);
    for (const name of ["boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopWidth",
      "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "fontFamily", "fontSize", "fontWeight", "fontStyle",
      "letterSpacing", "lineHeight", "textTransform", "wordSpacing", "textIndent", "tabSize"]) mirror.style[name] = style[name];
    Object.assign(mirror.style, {position: "absolute", visibility: "hidden", top: "0", left: "-9999px", whiteSpace: "pre-wrap", overflowWrap: "break-word"});
    mirror.textContent = field.value.slice(0, index);
    const marker = document.createElement("span");
    marker.textContent = "​";
    mirror.append(marker);
    document.body.append(mirror);
    const top = marker.offsetTop;
    mirror.remove();
    return top;
  }
  function grow(field) {
    field.style.height = "auto";
    field.style.height = field.scrollHeight + 2 + "px";
  }

  function openDraft(ctx, task, {restoring = false} = {}) {
    if (draft) closeDraft({quiet: true});
    const info = describe(task);
    const keys = keysFor(ctx, task);
    const lessonTitle = ctx.lesson?.title || ctx.lesson?.label || "Lesson";
    const place = ctx.lesson?.label && ctx.lesson.label !== lessonTitle ? ctx.lesson.label : ctx.lessonId === "map" ? "Course map" : "";
    draft = {ctx, task, keys, scroll: window.scrollY};
    saveOpen({track: ctx.track, lessonId: ctx.lessonId, task: task.id});

    const back = element("button", "", "draft-back");
    back.type = "button";
    back.setAttribute("aria-label", "Back to " + lessonTitle);
    back.innerHTML = '<svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m10 3-5 5 5 5"/></svg>';
    back.append(element("span", lessonTitle));
    back.addEventListener("click", () => closeDraft());
    const nav = element("nav", "", "draft-nav");
    nav.setAttribute("aria-label", "Lesson");
    nav.append(back);

    const kicker = element("p", "Lesson workbook" + (place ? " · " + place : ""), "draft-kicker");
    const heading = element("h1", "Your draft");
    heading.id = "draft-title";
    heading.tabIndex = -1;

    const sentinel = element("div", "", "draft-sentinel");
    const prompt = element("div", "", "draft-prompt");
    prompt.id = "draft-prompt";
    const promptLabel = element("p", info.title || (info.number ? "Assignment " + info.number : ctx.unit.title), "draft-prompt-label");
    const promptText = element("div", "", "draft-prompt-text");
    for (const line of info.lines) {
      const split = / — /.exec(line);
      const paragraph = element("p");
      if (split && split.index < 40) {
        paragraph.append(element("strong", line.slice(0, split.index)), " — " + line.slice(split.index + 3));
      } else paragraph.textContent = line;
      promptText.append(paragraph);
    }
    const more = element("button", "Show whole prompt", "draft-prompt-more");
    more.type = "button";
    more.hidden = true;
    more.setAttribute("aria-expanded", "false");
    prompt.append(promptLabel, promptText, more);

    const field = element("textarea", "", "draft-text");
    field.id = "draft-text";
    field.setAttribute("aria-labelledby", "draft-title draft-prompt-label");
    field.setAttribute("aria-describedby", "draft-status");
    field.placeholder = "Begin your draft here.";
    field.rows = 8;
    promptLabel.id = "draft-prompt-label";

    const footer = element("div", "", "draft-footer");
    const status = element("span", "", "draft-status");
    status.id = "draft-status";
    status.setAttribute("role", "status");
    const count = element("span", "", "draft-count");
    footer.append(status, count);

    const check = element("button", "Check this exercise", "practice-primary draft-check");
    check.type = "button";
    check.setAttribute("aria-controls", "draft-self-check");
    const checkPanel = element("section", "", "workbook-check");
    checkPanel.id = "draft-self-check";
    checkPanel.setAttribute("aria-label", "Self-check");
    const criterion = element("p", task.criterion, "workbook-criterion");
    const evidenceLabel = element("label", "Which phrase or decision in your response meets this requirement? Explain how.", "workbook-label");
    const evidence = element("textarea", "", "workbook-evidence");
    evidence.rows = 3;
    evidenceLabel.append(evidence);
    const confirm = element("button", "I met this requirement", "practice-primary");
    const revise = element("button", "Revise my response", "practice-secondary");
    confirm.type = revise.type = "button";
    const checkActions = element("div", "", "practice-actions");
    checkActions.append(confirm, revise);
    const checkStatus = element("p", "", "workbook-check-status");
    checkStatus.setAttribute("role", "status");
    checkPanel.append(element("h2", "Check against the assignment"), criterion, evidenceLabel, checkActions, checkStatus);

    screen.replaceChildren(nav, kicker, heading, sentinel, prompt, field, footer, check, checkPanel);
    document.body.dataset.screen = "draft";
    screen.hidden = false;
    document.getElementById("look-up").hidden = true;

    function showStatus(durable) {
      const message = !durable ? "Only kept in this open page. Copy your response before closing." :
        field.value.trim() ? "Saved on this device" : "Saves on this device as you write";
      if (status.textContent !== message) status.textContent = message;
      count.textContent = wordLabel(countWords(field.value));
    }
    function toggleCheck(open) {
      checkPanel.hidden = !open;
      check.setAttribute("aria-expanded", String(open));
    }
    function updateCheck() {
      check.disabled = !field.value.trim();
      if (check.disabled) toggleCheck(false);
      const checked = Boolean(read(keys.credit).value);
      check.textContent = checked ? "Review your self-check" : "Check this exercise";
      confirm.hidden = checked;
      confirm.disabled = !field.value.trim() || !evidence.value.trim();
      checkStatus.textContent = checked ? "You have checked this assignment." : "";
    }
    function saveCaret() {
      write(keys.caret, JSON.stringify({start: field.selectionStart, end: field.selectionEnd}));
    }
    draft.saveCaret = saveCaret;

    const stored = read(keys.response);
    field.value = stored.value;
    evidence.value = read(keys.note).value;
    showStatus(stored.durable);
    toggleCheck(false);
    updateCheck();

    field.addEventListener("input", () => {
      showStatus(write(keys.response, field.value));
      updateCheck();
      grow(field);
    });
    for (const type of ["select", "keyup", "pointerup", "blur"]) field.addEventListener(type, saveCaret);
    check.addEventListener("click", () => {
      if (!field.value.trim()) return;
      toggleCheck(checkPanel.hidden);
      if (!checkPanel.hidden) evidence.focus();
    });
    evidence.addEventListener("input", () => {
      const saved = write(keys.note, evidence.value);
      updateCheck();
      if (!saved) checkStatus.textContent = "Your self-check is kept in this open page.";
    });
    confirm.addEventListener("click", () => {
      if (!field.value.trim() || !evidence.value.trim() || read(keys.credit).value) return;
      write(keys.credit, "1");
      window.NovelLearning?.record({type:"attempt", track:ctx.track, key:keys.itemKey, kind:"apply", grade:"good", retry:false});
      updateCheck();
      checkStatus.tabIndex = -1;
      checkStatus.focus();
    });
    revise.addEventListener("click", () => {
      toggleCheck(false);
      field.focus();
    });

    // Keep the prompt in reach: once the writing scrolls under it, it shrinks to a few lines.
    function measurePrompt() {
      const clamped = prompt.classList.contains("is-stuck") && !prompt.classList.contains("is-expanded");
      more.hidden = !clamped || promptText.scrollHeight <= promptText.clientHeight + 2;
    }
    more.addEventListener("click", () => {
      const expanded = !prompt.classList.contains("is-expanded");
      prompt.classList.toggle("is-expanded", expanded);
      more.setAttribute("aria-expanded", String(expanded));
      more.textContent = expanded ? "Show less" : "Show whole prompt";
      more.hidden = false;
    });
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(([entry]) => {
        const stuck = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        prompt.classList.toggle("is-stuck", stuck);
        if (!stuck) {
          prompt.classList.remove("is-expanded");
          more.textContent = "Show whole prompt";
          more.setAttribute("aria-expanded", "false");
        }
        measurePrompt();
      });
      observer.observe(sentinel);
      draft.observer = observer;
    }

    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      if (!draft || draft.task !== task) return;
      grow(field);
      let caret = null;
      try { caret = JSON.parse(read(keys.caret).value || "null"); } catch { caret = null; }
      const end = field.value.length;
      const start = Number.isInteger(caret?.start) ? Math.min(caret.start, end) : end;
      const stop = Number.isInteger(caret?.end) ? Math.min(Math.max(caret.end, start), end) : start;
      field.setSelectionRange(start, stop);
      // With a keyboard and pointer, land on the exact sentence. On touch, wait for the writer's tap.
      if (matchMedia("(pointer: fine)").matches) {
        field.focus({preventScroll: true});
        if (field.value) {
          const top = field.getBoundingClientRect().top + window.scrollY + caretOffset(field, start);
          window.scrollTo(0, Math.max(0, top - window.innerHeight * .45));
        }
      } else if (!restoring) heading.focus({preventScroll: true});
    });
  }

  function closeDraft({quiet = false, returnFocus = !quiet} = {}) {
    if (!draft) return;
    const {task, scroll} = draft;
    draft.saveCaret?.();
    draft.observer?.disconnect();
    draft = null;
    saveOpen(null);
    screen.hidden = true;
    screen.replaceChildren();
    delete document.body.dataset.screen;
    const rows = [...document.querySelectorAll("#study-work .assignment")];
    for (const item of rows) rowUpdates.get(item)?.();
    if (quiet) return;
    const item = rows.find(element => element.dataset.task === task.id);
    if (item) {
      item.scrollIntoView({block: "center"});
      if (returnFocus) item.querySelector(".assignment-action").focus({preventScroll: true});
    } else window.scrollTo(0, scroll);
  }

  window.addEventListener("ns-lesson-rendered", event => {
    const {track, lesson} = event.detail || {};
    if (draft && (draft.ctx.track !== track || draft.ctx.lessonId !== lesson)) closeDraft({quiet: true});
  });
  window.addEventListener("pagehide", () => draft?.saveCaret?.());
  document.addEventListener("visibilitychange", () => { if (document.hidden) draft?.saveCaret?.(); });

  window.NovelWorkbook = {append, closeDraft, get open() { return Boolean(draft); }};
})();
