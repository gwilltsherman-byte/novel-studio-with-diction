(() => {
  "use strict";

  const prefix = "ns.workbook.v1/";
  const unsaved = new Map();
  const lastChoice = new Map();

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

  function exerciseId(fixedCoursePrompt) {
    let hash = 2166136261;
    for (const character of fixedCoursePrompt) {
      hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
    }
    return "workbook-" + (hash >>> 0).toString(36);
  }

  function append(root, {track, lessonId, unit}) {
    const tasks = prompts(unit);
    if (!tasks.length) return;
    const scope = prefix + encodeURIComponent(track) + "/" + encodeURIComponent(lessonId) + "/";
    const key = task => scope + encodeURIComponent(task.id);
    const choiceScope = scope + unit.title;
    const details = element("details", "", "workbook");
    const summary = element("summary", tasks.length === 1 ? "Write your response" : "Work on these assignments (" + tasks.length + ")");
    details.append(summary);
    const body = element("div", "", "workbook-body");
    const prompt = element("p", "", "workbook-prompt");
    const fieldLabel = element("label", "Your workbook response", "workbook-label");
    const field = element("textarea", "", "workbook-response practice-response");
    field.rows = 7;
    fieldLabel.append(field);
    const footer = element("div", "", "workbook-footer");
    const status = element("span", "", "workbook-status");
    status.setAttribute("role", "status");
    const count = element("span", "", "workbook-count");
    footer.append(status, count);
    const select = element("select");
    if (tasks.length > 1) {
      const selectLabel = element("label", "Assignment", "workbook-label");
      tasks.forEach((task, index) => {
        const short = task.label.length > 80 ? task.label.slice(0, 77) + "…" : task.label;
        const option = element("option", short);
        option.value = String(index);
        select.append(option);
      });
      selectLabel.append(select);
      body.append(selectLabel);
    }
    const check = element("button", "Check this exercise", "practice-secondary");
    check.type = "button";
    const checkPanel = element("div", "", "workbook-check");
    const criterion = element("p", "", "workbook-prompt");
    const evidenceLabel = element("label", "Which phrase or decision in your response meets this requirement? Explain how.", "workbook-label");
    const evidence = element("textarea", "", "workbook-evidence");
    evidence.rows = 3;
    evidenceLabel.append(evidence);
    const confirm = element("button", "I met this requirement", "practice-primary");
    const revise = element("button", "Revise my response", "practice-secondary");
    confirm.type = revise.type = "button";
    const checkActions = element("div", "", "practice-actions");
    checkActions.append(confirm, revise);
    const checkStatus = element("p");
    checkStatus.setAttribute("role", "status");
    checkPanel.append(element("h4", "Check against the assignment"), criterion, evidenceLabel, checkActions, checkStatus);
    body.append(prompt, fieldLabel, footer, check, checkPanel);
    details.append(body);
    root.append(details);
    let current = tasks[0];
    let itemKey;
    const noteKey = () => "ns.workbook.evidence.v1/" + itemKey;
    const creditKey = () => "ns.workbook.checked.v1/" + itemKey;
    function toggleCheck(open) {
      checkPanel.hidden = !open;
      check.setAttribute("aria-expanded", String(open));
    }
    function updateCheck() {
      check.disabled = !field.value.trim();
      if (check.disabled) toggleCheck(false);
      const checked = Boolean(read(creditKey()).value);
      check.textContent = checked ? "Review your self-check" : "Check this exercise";
      confirm.hidden = checked;
      confirm.disabled = !field.value.trim() || !evidence.value.trim();
      checkStatus.textContent = checked ? "You have checked this assignment." : "";
    }

    function showStatus(durable) {
      const message = !durable ? "Only kept in this open page. Copy your response before closing." :
        field.value ? "Saved on this device." : "Your response saves on this device as you write.";
      if (status.textContent !== message) status.textContent = message;
      const length = (field.value.match(/\S+/g) || []).length;
      count.textContent = length.toLocaleString() + (length === 1 ? " word" : " words");
    }
    function choose(index) {
      current = tasks[index];
      select.value = String(index);
      lastChoice.set(choiceScope, current.id);
      prompt.textContent = current.prompt;
      itemKey = [track, lessonId, exerciseId(current.id)].join("/");
      criterion.textContent = current.criterion;
      evidence.value = read(noteKey()).value;
      toggleCheck(false);
      const stored = read(key(current));
      field.value = stored.value;
      showStatus(stored.durable);
      updateCheck();
    }
    field.addEventListener("input", () => {
      showStatus(write(key(current), field.value));
      updateCheck();
    });
    check.addEventListener("click", () => {
      if (!field.value.trim()) return;
      toggleCheck(checkPanel.hidden);
      if (!checkPanel.hidden) evidence.focus();
    });
    evidence.addEventListener("input", () => {
      const saved = write(noteKey(), evidence.value);
      updateCheck();
      if (!saved) checkStatus.textContent = "Your self-check is kept in this open page.";
    });
    confirm.addEventListener("click", () => {
      if (!field.value.trim() || !evidence.value.trim() || read(creditKey()).value) return;
      write(creditKey(), "1");
      window.NovelLearning?.record({type:"attempt", track, key:itemKey, kind:"apply", grade:"good", retry:false});
      updateCheck();
      checkStatus.tabIndex = -1;
      checkStatus.focus();
    });
    revise.addEventListener("click", () => {
      toggleCheck(false);
      field.focus();
    });
    select.addEventListener("change", () => choose(Number(select.value)));
    let index = tasks.findIndex(task => task.id === lastChoice.get(choiceScope));
    if (index < 0) index = tasks.findIndex(task => read(key(task)).value);
    choose(Math.max(0, index));
  }

  window.NovelWorkbook = {append};
})();
