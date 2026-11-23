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
    function add(prompt, label = "", identity = prompt) {
      const id = identity.replace(/\s+/g, " ").trim().toLowerCase();
      if (!id || seen.has(id)) return;
      seen.add(id);
      tasks.push({id, label: label || prompt, prompt});
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
            add([label, ...details].join("\n"), label, label + " " + instruction);
          }
        }
      }
    }
    if (!tasks.length && named) {
      add("Use the instructions in this section to work on “" + unit.title + "” below.", unit.title, unit.title);
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
    body.append(prompt, fieldLabel, footer);
    details.append(body);
    root.append(details);
    let current = tasks[0];

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
      const stored = read(key(current));
      field.value = stored.value;
      showStatus(stored.durable);
    }
    field.addEventListener("input", () => showStatus(write(key(current), field.value)));
    select.addEventListener("change", () => choose(Number(select.value)));
    let index = tasks.findIndex(task => task.id === lastChoice.get(choiceScope));
    if (index < 0) index = tasks.findIndex(task => read(key(task)).value);
    choose(Math.max(0, index));
  }

  window.NovelWorkbook = {append};
})();
