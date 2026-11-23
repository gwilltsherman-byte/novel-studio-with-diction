(() => {
  "use strict";

  const kindLabels = {recall: "Recall", compare: "Distinguish", apply: "Apply"};
  const mounts = new WeakMap();
  const pending = new Map();

  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text != null) element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  function button(text, className, action) {
    const element = node("button", text, className);
    element.type = "button";
    element.addEventListener("click", action);
    return element;
  }

  function focusHeading(element) {
    element.tabIndex = -1;
    element.focus();
  }

  function normalAnswer(value) {
    return value.normalize("NFKC").toLocaleLowerCase().trim()
      .replace(/[’‘]/g, "'").replace(/[‐‑–—]/g, "-")
      .replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim();
  }

  function locationLabel(item) {
    const track = item.track === "fiction" ? "Fiction" : "Vocabulary";
    const week = /^week-(\d+)$/.exec(item.lessonId);
    return track + " · " + (week ? "Week " + week[1] : "Course map");
  }

  function dateLabel(date) {
    const next = new Date(date);
    if (next.toDateString() === new Date().toDateString()) {
      return "today at " + new Intl.DateTimeFormat(undefined, {hour: "numeric", minute: "2-digit"}).format(next);
    }
    return new Intl.DateTimeFormat(undefined, {month: "short", day: "numeric"}).format(date);
  }

  function getPending(key) {
    try {
      const value = sessionStorage.getItem(key);
      return value ? JSON.parse(value) : pending.get(key);
    } catch {
      return pending.get(key);
    }
  }

  function savePending(key, value) {
    if (value) pending.set(key, value);
    else pending.delete(key);
    try {
      if (value) sessionStorage.setItem(key, JSON.stringify(value));
      else sessionStorage.removeItem(key);
    } catch { /* The current page can keep the attempt in memory. */ }
  }

  function sessionKey(track, lessonId, mode) {
    return "ns.practice-session.v1." + (mode === "review" ? "review" : track + "." + lessonId);
  }

  function hasResume(track, lessonId, mode) {
    if (mode === "section") return false;
    const state = getPending(sessionKey(track, lessonId, mode));
    return Boolean(state && Array.isArray(state.queue) && state.queue[state.position]);
  }

  function mount({root, track, lesson, mode, card: sectionCard, banks, onExit, onSource, onComplete}) {
    mounts.get(root)?.destroy();
    const scheduler = window.StudySchedule;
    const sectionCheck = mode === "section";
    const storageKey = sessionKey(track, lesson.id, mode);
    const sourceCard = ref => sectionCheck ? sectionCard : banks[ref.track]?.[ref.lessonId]?.find(card => card.id === ref.cardId);
    let state = sectionCheck ? null : getPending(storageKey);
    let durable = true;

    function freshSession() {
      const result = sectionCheck ? {items: [{
        key: sectionCard.untracked ? "" : scheduler.itemKey(track, lesson.id, sectionCard.id),
        track, lessonId: lesson.id, card: sectionCard
      }]} : scheduler.start({banks, track, lessonId: lesson.id, mode});
      durable = result.storageAvailable !== false;
      return {
        queue: result.items.map(({key, track: itemTrack, lessonId, card}) => ({
          key, track: itemTrack, lessonId, cardId: card.id, retry: false
        })),
        position: 0,
        stage: "write",
        draft: "",
        passed: false,
        grades: {}
      };
    }

    // Discard a stale deck after a curriculum change, keeping the scheduler's learning history.
    if (!state || !Array.isArray(state.queue) || !Number.isInteger(state.position) ||
      state.position < 0 || !state.queue[state.position] ||
      !state.queue.every(ref => ref && typeof ref.key === "string" && sourceCard(ref)) ||
      typeof state.draft !== "string" || !state.grades || !["write", "feedback"].includes(state.stage)) {
      state = freshSession();
    }

    function remember() { if (!sectionCheck) savePending(storageKey, state); }

    const view = {
      destroy() {
        if (mounts.get(root) !== view) return;
        root.classList.remove("practice-session");
        mounts.delete(root);
      }
    };
    mounts.set(root, view);
    root.classList.add("practice-session");

    function exit() {
      view.destroy();
      onExit();
    }

    function summary() {
      return scheduler.summary(banks, track, lesson.id);
    }

    function storageNote(element) {
      if (!durable) {
        element.append(node("p", "Review progress can only be kept for this visit.", "practice-meta"));
      }
    }

    function finish() {
      savePending(storageKey, null);
      const stats = summary();
      const grades = Object.values(state.grades);
      const missed = grades.filter(entry => entry.first === "again");
      const available = mode === "review" ? stats.globalDue > 0 : stats.seen < stats.total || stats.due > 0;
      const panel = node("section", null, "practice-summary");
      const title = node("h2", grades.length ? "Session complete" : mode === "review" ? "You’re up to date" : "Lesson practice is up to date");
      panel.append(title);
      if (grades.length) {
        const independent = grades.filter(entry => entry.first === "good").length;
        const effortful = grades.filter(entry => entry.first === "hard").length;
        panel.append(node("p", grades.length + (grades.length === 1 ? " prompt practiced" : " prompts practiced") + ".", "practice-counter"));
        const list = node("ul", null, "practice-result");
        const results = [[independent, "recalled independently"], [effortful, "partly recalled"], [missed.length, "to revisit"]];
        for (const [count, label] of results) {
          if (count) list.append(node("li", count + " " + label));
        }
        panel.append(list);
        if (missed.length) {
          const details = node("details");
          details.append(node("summary", "Questions to revisit"));
          const items = node("ul");
          for (const item of missed) {
            const question = sourceCard(item);
            if (question) items.append(node("li", question.prompt));
          }
          details.append(items);
          panel.append(details);
        }
      } else if (mode === "review" && !stats.nextDue) {
        panel.append(node("p", "Practice a lesson to add its questions to your review queue."));
      }
      if (stats.globalDue > 0) {
        panel.append(node("p", stats.globalDue + (stats.globalDue === 1 ? " question is" : " questions are") + " due for review."));
      } else if (Number.isFinite(stats.nextDue)) {
        panel.append(node("p", "Your next review is due " + dateLabel(stats.nextDue) + "."));
      }
      const actions = node("div", null, "practice-actions");
      if (available && grades.length) {
        actions.append(button(mode === "review" ? "Continue reviewing" : "Practice another set", "practice-primary", () => {
          state = freshSession();
          render();
        }));
      }
      actions.append(button("Back to lesson", actions.children.length ? "practice-secondary" : "practice-primary", exit));
      panel.append(actions);
      durable = stats.storageAvailable !== false;
      storageNote(panel);
      root.replaceChildren(panel);
      focusHeading(title);
    }

    function record(grade) {
      const ref = state.queue[state.position];
      if (sectionCheck) {
        if (!sectionCard.untracked) scheduler.rate(ref.key, grade);
        view.destroy();
        (onComplete || onExit)(grade);
        return;
      }
      const outcome = scheduler.rate(ref.key, grade);
      if (outcome?.storageAvailable === false) durable = false;
      if (!ref.retry) {
        state.grades[ref.key] = {...ref, first: grade};
        // Leave at least one intervening retrieval. A miss at the end returns in a future session.
        if (grade === "again" && state.position + 1 < state.queue.length) {
          state.queue.splice(Math.min(state.position + 3, state.queue.length), 0, {...ref, retry: true});
        }
      }
      state.position += 1;
      state.stage = "write";
      state.draft = "";
      state.passed = false;
      render();
    }

    function showAnswer(passed) {
      state.passed = passed;
      state.stage = "feedback";
      render();
    }

    function renderQuestion(card, section) {
      const form = node("form");
      const label = node("label", card.kind === "apply" ? "Your draft" : "Your answer");
      const field = node("textarea", null, "practice-response");
      field.id = "practice-response";
      label.htmlFor = field.id;
      field.required = true;
      field.rows = card.kind === "apply" ? 5 : 3;
      field.value = state.draft;
      if (card.accepted?.length) {
        field.spellcheck = false;
        field.setAttribute("autocorrect", "off");
        field.setAttribute("autocapitalize", "off");
      }
      field.addEventListener("input", () => {
        field.setCustomValidity("");
        state.draft = field.value;
        remember();
      });
      form.addEventListener("submit", event => {
        event.preventDefault();
        if (!field.value.trim()) {
          field.setCustomValidity("Write an answer or choose “I don’t know yet.”");
          field.reportValidity();
          return;
        }
        state.draft = field.value;
        showAnswer(false);
      });
      field.addEventListener("keydown", event => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.isComposing) {
          event.preventDefault();
          form.requestSubmit();
        }
      });
      const controls = node("div", null, "practice-actions");
      const check = node("button", "Check my answer", "practice-primary");
      check.type = "submit";
      controls.append(check, button("I don’t know yet", "practice-secondary", () => showAnswer(true)));
      form.append(label, field, controls);
      section.append(form);
    }

    function feedback(card, ref, section) {
      const panel = node("section", null, "practice-feedback");
      const accepted = (card.accepted || []).map(normalAnswer);
      const matches = accepted.includes(normalAnswer(state.draft));
      let titleText = card.kind === "apply" ? "Compare your draft" : "Compare your answer";
      if (state.passed) titleText = "Study the answer";
      else if (accepted.length) titleText = matches ? "You recalled it" : "Check the target answer";
      const title = node("h3", titleText);
      panel.append(title);
      const comparison = node("div", null, "practice-comparison");
      function answer(label, text) {
        const group = node("div", null, "practice-answer");
        group.append(node("h4", label), node("p", text));
        comparison.append(group);
      }
      if (state.draft.trim()) answer(card.kind === "apply" ? "Your draft" : "Your answer", state.draft);
      answer(card.kind === "apply" ? "One possible response" : accepted.length ? "Lesson answer" : "Model answer", card.answer);
      panel.append(comparison);
      if (card.criteria?.length) {
        const rubric = node("div", null, "practice-criteria");
        const checks = node("ul");
        for (const criterion of card.criteria) checks.append(node("li", criterion));
        rubric.append(node("h4", "What to look for"), checks);
        panel.append(rubric);
      }
      if (onSource && card.page) {
        panel.append(button("Read page " + card.page, "practice-secondary", () => onSource({
          track: ref.track, lessonId: ref.lessonId, page: card.page
        })));
      }
      const actions = node("div", null, "practice-actions practice-ratings");
      if (state.passed) {
        if (!sectionCheck || !card.untracked) {
          panel.append(node("p", ref.retry || state.position + 1 === state.queue.length
            ? "This question will come back in a later review."
            : "You’ll try this question again after another prompt."));
        }
        actions.append(button("Continue", "practice-primary", () => record("again")));
      } else {
        panel.append(node("p", "Before you checked, how much could you produce on your own?"));
        actions.append(
          button("Missed it", "practice-secondary", () => record("again")),
          button("Got part of it", "practice-secondary", () => record("hard")),
          button(accepted.length && !matches ? "My wording means the same" : "Got it", "practice-primary", () => record("good"))
        );
      }
      panel.append(actions);
      section.append(panel);
      return title;
    }

    function render() {
      if (!state.queue[state.position]) { finish(); return; }
      remember();
      const ref = state.queue[state.position];
      const card = sourceCard(ref);
      const section = node("section", null, "practice-card");
      const meta = node("div", null, "practice-meta");
      const originals = state.queue.filter(item => !item.retry).length;
      const counter = sectionCheck ? "Section check" : ref.retry ? "Try again" : "Question " + (Object.keys(state.grades).length + 1) + " of " + originals;
      meta.append(node("span", counter, "practice-counter"), node("span", locationLabel(ref)));
      const label = kindLabels[card.kind] || "Recall";
      const prompt = node("h2", card.prompt, "practice-prompt");
      section.append(meta, node("p", label, "practice-kind"), prompt);
      if (card.context) section.append(node("p", card.context, "practice-context"));
      let focus = prompt;
      if (state.stage === "write") renderQuestion(card, section);
      else focus = feedback(card, ref, section);
      const controls = node("div", null, "practice-actions practice-session-footer");
      controls.append(button(sectionCheck ? "Read section again" : "Pause practice", "practice-secondary", exit));
      section.append(controls);
      storageNote(section);
      root.replaceChildren(section);
      focusHeading(focus);
    }

    render();
    return view;
  }

  window.NovelPractice = {mount, hasResume};
})();
