// Look up a word without leaving the passage. Word tools supplies the definition; the lesson,
// its scroll position and the reader's selection stay exactly where they were.
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const button = $("look-up");
  if (!button || window.parent === window || !window.NovelSheet) return;
  let hub = null;
  try { hub = window.parent.CombinedStudio; } catch { hub = null; }
  if (!hub?.lookup) return;

  const label = $("look-up-label");
  const results = $("lookup-results");
  const status = $("lookup-status");
  const openFull = $("lookup-open");
  let term = "", saved = null, request = 0, limit = 3, shown = null;
  const sheet = window.NovelSheet.setup($("lookup-sheet"), {onClose: restore});

  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text != null) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function within(target) {
    return Boolean(target) && ["article", "draft-prompt"].some(id => $(id)?.contains(target));
  }
  function selectedTerm() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !within(selection.anchorNode) || !within(selection.focusNode)) return "";
    const text = selection.toString().trim().replace(/\s+/g, " ");
    return text && text.length <= 120 && text.split(" ").length <= 10 ? text : "";
  }
  // Answers that must come from memory stay closed to lookups, as in Word tools.
  function restriction() {
    const work = $("study-work");
    if (work?.querySelector(".practice-card form")) return "Finish this recall attempt to look up a word.";
    if (work?.querySelector(".opening-choice:not(:disabled)")) return "Answer the opening exercise to look up a word.";
    return "";
  }

  document.addEventListener("selectionchange", () => {
    if (sheet.isOpen) return;
    const next = selectedTerm();
    if (!next && document.activeElement === button) return;
    term = next;
    button.hidden = !term;
    if (term) label.textContent = "Look up “" + (term.length > 26 ? term.slice(0, 24).trimEnd() + "…" : term) + "”";
  });
  button.addEventListener("pointerdown", event => event.preventDefault());
  button.addEventListener("click", () => { if (term) open(term); });
  openFull.addEventListener("click", () => {
    const word = shown?.word || term;
    window.parent.postMessage({type: "ns-lesson-workspace", workspace: "diction", word}, location.origin);
  });

  function open(text) {
    const selection = window.getSelection();
    saved = {range: selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null, scroll: window.scrollY};
    shown = null;
    limit = 3;
    const blocked = restriction();
    openFull.hidden = Boolean(blocked);
    sheet.open(button);
    button.hidden = true;
    if (blocked) {
      results.replaceChildren(node("p", blocked, "lookup-message"));
      status.textContent = "";
      return;
    }
    define(text);
  }
  function restore() {
    request++;
    const memo = saved;
    saved = null;
    if (!memo) return;
    if (Math.abs(window.scrollY - memo.scroll) > 1) window.scrollTo(0, memo.scroll);
    if (memo.range?.startContainer.isConnected && memo.range.endContainer.isConnected) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(memo.range);
      term = selectedTerm() || term;
      button.hidden = !term;
      if (!button.hidden) button.focus({preventScroll: true});
    }
  }

  async function define(text) {
    const ticket = ++request;
    results.replaceChildren(node("p", "Looking up “" + text + "”…", "lookup-message"));
    status.textContent = "";
    try {
      const found = await hub.lookup(text);
      if (ticket !== request || !sheet.isOpen) return;
      shown = found;
      render();
    } catch {
      if (ticket !== request || !sheet.isOpen) return;
      results.replaceChildren(node("p", "The dictionary could not load. Check your connection, or open Word tools to try again.", "lookup-message"));
    }
  }

  async function save(sense, control) {
    if (control.getAttribute("aria-disabled") === "true") return;
    control.setAttribute("aria-disabled", "true");
    try {
      await hub.saveSense(shown.word, sense);
      sense.saved = true;
      control.textContent = "Saved to notebook";
      status.textContent = "Saved " + shown.word + " to your notebook.";
    } catch {
      control.removeAttribute("aria-disabled");
      status.textContent = "This word could not be saved. Try again in Word tools.";
    }
  }

  function render() {
    const found = shown;
    const head = found.word || found.query;
    const parts = [node("h3", head, "lookup-word")];
    if (found.from && found.from.toLowerCase() !== head.toLowerCase()) parts.push(node("p", "From “" + found.from + "”", "lookup-from"));
    if (found.senses.length) {
      const list = node("ol", null, "lookup-senses");
      for (const sense of found.senses.slice(0, limit)) {
        const item = node("li");
        const control = node("button", sense.saved ? "Saved to notebook" : "Save to notebook", "lookup-save");
        control.type = "button";
        if (sense.saved) control.setAttribute("aria-disabled", "true");
        control.addEventListener("click", () => save(sense, control));
        item.append(node("small", [sense.pos, sense.source].filter(Boolean).join(" · ")), node("p", sense.definition), control);
        list.append(item);
      }
      parts.push(list);
      if (limit < found.senses.length) {
        const more = node("button", "More meanings", "sheet-link lookup-more");
        more.type = "button";
        more.addEventListener("click", () => {
          const first = limit;
          limit += 5;
          render();
          results.querySelectorAll(".lookup-save")[first]?.focus();
        });
        parts.push(more);
      }
    } else {
      parts.push(node("p", found.word
        ? "“" + found.word + "” is in the word index, but your dictionary editions have no definition for it yet. Word tools can add a full edition."
        : found.suggestions.length ? "No exact entry. Try a related spelling below." : "No matching words.", "lookup-message"));
      const own = node("details", null, "lookup-own");
      own.append(node("summary", "Save my own meaning"));
      const form = node("form");
      const fieldLabel = node("label", "Meaning of “" + head + "”");
      const field = node("textarea");
      field.rows = 2;
      field.maxLength = 600;
      field.required = true;
      fieldLabel.append(field);
      const submit = node("button", "Save to notebook", "lookup-save");
      form.append(fieldLabel, submit);
      form.addEventListener("submit", async event => {
        event.preventDefault();
        const meaning = field.value.trim();
        if (!meaning) { field.reportValidity(); return; }
        try {
          await hub.saveSense(head, {definition: meaning}, true);
          status.textContent = "Saved your meaning of " + head + ".";
          define(head);
        } catch { status.textContent = "Your meaning could not be saved. Try again in Word tools."; }
      });
      own.append(form);
      parts.push(own);
    }
    if (found.suggestions.length) {
      const related = node("div", null, "lookup-related");
      const row = node("div");
      for (const word of found.suggestions) {
        const choice = node("button", word);
        choice.type = "button";
        choice.addEventListener("click", () => { limit = 3; define(word); });
        row.append(choice);
      }
      related.append(node("p", found.word ? "Related spellings" : "Matching words"), row);
      parts.push(related);
    }
    results.replaceChildren(...parts);
    status.textContent = found.senses.length ? found.senses.length + (found.senses.length === 1 ? " meaning" : " meanings") + " for " + head + "." : "";
  }
})();
