(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const work = $("study-work");
  let current, units = [], step = 0, view = "learn", session, returnFromSource;
  let generation = 0, banks, loading, dueTimer;
  const positions = new Map();

  function node(tag, text, cls) {
    const el = document.createElement(tag);
    if (text != null) el.textContent = text;
    if (cls) el.className = cls;
    return el;
  }
  function button(text, cls, action) {
    const el = node("button", text, cls);
    el.type = "button";
    el.addEventListener("click", action);
    return el;
  }
  function focus(el) {
    el.tabIndex = -1;
    el.focus({preventScroll:true});
    el.scrollIntoView({block:"nearest"});
  }

  function loadBanks() {
    if (!loading) {
      loading = Promise.all(["fiction", "vocabulary"].map(async track => {
        const response = await fetch(track + "-practice.json");
        if (!response.ok) throw new Error("Course practice is unavailable.");
        return [track, await response.json()];
      })).then(entries => (banks = Object.fromEntries(entries))).catch(error => { loading = null; throw error; });
    }
    return loading;
  }

  function sectionUnits(lesson, track) {
    const result = [];
    let unit, heading = lesson.title;
    function begin(title, page) {
      unit = {title, first:page, last:page, refs:[], weight:0};
      result.push(unit);
    }
    for (const page of lesson.pages) {
      for (const [index, block] of page.blocks.entries()) {
        if (block.type === "heading") {
          heading = block.text;
          begin(heading, page.number);
          // The heading itself appears as the section title. Preserve any source links it carried.
          if (block.links?.length) unit.refs.push({links:block.links, page:page.number});
          continue;
        }
        const weight = block.type === "table" ? block.rows.length * 24 : (block.text || block.items?.join(" ") || "").length / 6;
        if (!unit || (unit.weight > 260 && unit.last !== page.number)) begin(heading, page.number);
        unit.refs.push({block, index, page:page.number});
        unit.last = page.number;
        unit.weight += weight;
      }
      if (page.links?.length) {
        if (!unit) begin(heading, page.number);
        unit.refs.push({links:page.links, page:page.number});
      }
    }
    // Begin with the craft or vocabulary itself. Keep the opening course orientation
    // in the section picker and the full source in its original order.
    if (lesson.id === "week-1") {
      const firstTopic = track === "fiction" ? "What fiction is made of: five materials" : "The 20 prefixes and their disguises";
      const firstIndex = result.findIndex(item => item.title === firstTopic);
      if (firstIndex > 0) {
        const orientation = result.splice(0, firstIndex);
        const sources = result.findIndex(item => /^sources?$/i.test(item.title));
        result.splice(sources >= 0 ? sources : result.length, 0, ...orientation);
      }
    }
    return result;
  }
  function positionKey() { return "ns.guided.v1/" + current.track + "/" + current.lesson.id; }
  function rememberedStep() {
    const key = positionKey();
    let value = positions.get(key);
    try { if (value == null) value = Number(localStorage.getItem(key)); } catch { /* use memory */ }
    return Number.isInteger(value) && value >= 0 && value <= units.length ? value : 0;
  }
  function goStep(number, moveFocus = true) {
    step = Math.max(0, Math.min(number, units.length));
    positions.set(positionKey(), step);
    try { localStorage.setItem(positionKey(), String(step)); } catch { /* use memory */ }
    show("learn", moveFocus);
  }
  function dispose() {
    if (session) session.destroy();
    session = null;
  }
  function refreshReview() {
    if (!current || !banks) return;
    const info = window.StudySchedule.summary(banks, current.track, current.lesson.id);
    const reviewStatus = {due:info.globalDue, nextDue:info.nextDue};
    if (window.parent !== window) {
      window.parent.postMessage({type:"ns-review-status", ...reviewStatus}, location.origin);
    } else {
      window.NovelJourney?.setReviewStatus(reviewStatus);
    }
    const review = $("due-review");
    const resumable = window.NovelPractice.hasResume(current.track, current.lesson.id, "review");
    review.firstChild.textContent = resumable ? "Resume review " : "Review both courses ";
    $("due-count").textContent = info.globalDue ? String(info.globalDue) : "";
    const detail = $("due-detail");
    let note = "";
    if (info.globalDue) note = info.globalDue + (info.globalDue === 1 ? " question is ready." : " questions are ready.");
    else if (info.nextDue) {
      const next = new Date(info.nextDue);
      const sameDay = next.toDateString() === new Date().toDateString();
      note = "Next review " + (sameDay ? "today at " + next.toLocaleTimeString(undefined, {hour:"numeric",minute:"2-digit"}) : next.toLocaleDateString(undefined, {month:"short",day:"numeric"})) + ".";
    }
    detail.textContent = note;
    detail.hidden = !note;
    clearTimeout(dueTimer);
    if (info.nextDue) dueTimer = setTimeout(refreshReview, Math.max(1000, Math.min(2147000000, info.nextDue - Date.now() + 500)));
  }

  function opener(root, moveFocus) {
    const [title, scene, question, left, right, explanation, correct] = window.LessonOpeners[current.track][current.lesson.id];
    const card = node("section", null, "opening-card");
    const heading = node("h2", title);
    const passage = node("blockquote", scene);
    const prompt = node("h3", question);
    const choices = node("div", null, "opening-choices");
    const response = node("div", null, "opening-response");
    response.hidden = true;
    function choose(answer) {
      window.NovelLearning?.record({
        type:"opener", key:window.StudySchedule.itemKey(current.track,current.lesson.id,"opener"),
        track:current.track, grade:answer === correct ? "good" : "again"
      });
      for (const el of choices.children) {
        el.disabled = true;
        el.classList.toggle("correct-choice", Number(el.dataset.choice) === correct);
      }
      response.hidden = false;
      const result = node("h4", answer === correct ? "Exactly." : "Look at the other choice.");
      response.replaceChildren(result, node("p", explanation));
      focus(result);
      next.textContent = "Continue lesson";
    }
    const items = [left,right];
    const order = Math.random() < .5 ? [0,1] : [1,0];
    for (const i of order) {
      const choice = button(items[i], "opening-choice", () => choose(i));
      choice.dataset.choice = String(i);
      choices.append(choice);
    }
    const next = button("Read the lesson", "study-link", () => goStep(1));
    card.append(node("p", "Opening exercise", "study-kicker"), heading, passage, prompt, choices, response, next);
    root.append(card);
    if (moveFocus) focus(heading);
  }
  function sectionLabel(unit, i) {
    if (i > 0 && units[i-1].title === unit.title) return unit.title + " · p. " + unit.first;
    return unit.title;
  }
  function picker(root) {
    const label = node("label", "Lesson sections", "section-picker");
    const select = node("select");
    select.append(new Option("Opening exercise", "0"));
    units.forEach((unit, i) => select.append(new Option(sectionLabel(unit, i), String(i + 1))));
    select.value = String(step);
    select.addEventListener("change", () => goStep(Number(select.value)));
    label.append(select);
    root.append(label);
  }
  function words(text) {
    return new Set((text.toLowerCase().match(/[a-z]{4,}/g) || []).filter(word => !["this","that","what","from","with","your","which","page","week","read","first","same","some","into","used","their","they","then","there","words"].includes(word)));
  }
  function overlap(a, b) {
    let n = 0;
    for (const word of a) if (b.has(word)) n++;
    return n;
  }
  function checkFor(unit) {
    const heading = words(unit.title);
    const refs = unit.refs.filter(ref => ref.block);
    const excerpt = refs.map(({block:b}) => b.text || b.rows?.slice(0,4).flat().join(" ") || b.items?.join(" ") || "").join(" ");
    const content = words(excerpt);
    let best = null, high = 0;
    for (const card of banks?.[current.track]?.[current.lesson.id] || []) {
      if (card.page < unit.first || card.page > unit.last) continue;
      const blockMatch = Number.isInteger(card.block) && refs.some(ref => ref.page === card.page && ref.index === card.block);
      if (Number.isInteger(card.block) && !blockMatch) continue;
      const cue = words(card.prompt + " " + card.answer);
      const score = (blockMatch ? 24 : 0) + (card.section === unit.title ? 20 : 0) + overlap(heading,cue) * 3 + Math.min(8,overlap(content,cue));
      if (score > high && (blockMatch || card.section === unit.title || (overlap(heading,cue) && overlap(content,cue) >= 3))) {
        best = card; high = score;
      }
    }
    if (best) return best;
    const lines = refs.flatMap(({block:b}) => {
      if (b.type === "table") return (b.rows || []).slice(b.header ? 1 : 0, 3).map(row => row.join(" — "));
      if (b.type === "list") return (b.items || []).map(x => typeof x === "string" ? x : x.text);
      return b.text ? [b.text] : [];
    }).filter(Boolean);
    if (!lines.length) return null;
    return {id:"guided-p" + refs[0].page + "-b" + refs[0].index, kind:"recall", untracked:true, prompt:"How would you explain “" + unit.title + "” to another writer? Recall one concrete detail from the reading.", answer:lines.slice(0,3).join("\n\n"), criteria:["Compare the idea in your answer with the passage.", "Check one specific detail or example against the source."], page:unit.first};
  }

  function startCheck(unit, card) {
    dispose();
    work.replaceChildren();
    session = window.NovelPractice.mount({root:work,track:current.track,lesson:current.lesson,mode:"section",card,banks:banks || {},onExit:() => show("learn",true),onComplete:grade => {
      dispose(); refreshReview();
      const panel = node("section", null, "guided-result");
      const title = node("h2", grade === "good" ? "Section recalled" : "Section checked");
      const msg = grade === "good" ? "You can continue or return to the passage." : card.untracked ? "Read the section again to find the detail you missed." : "This question will return in spaced review. You can reread the passage now.";
      const actions = node("div", null, "practice-actions");
      actions.append(advanceButton(), button("Reread section", "study-link", () => show("learn",true)));
      panel.append(node("p",unit.title,"study-kicker"), title, node("p",msg), actions);
      work.replaceChildren(panel);
      focus(title);
    }});
  }
  function advanceButton() {
    return step < units.length ? button("Next section", "practice-primary", () => goStep(step + 1)) : button("Practice this lesson", "practice-primary", () => show("practice",true));
  }

  function guided(moveFocus) {
    const container = node("div", null, "guided-view");
    work.replaceChildren(container);
    if (!step) {
      opener(container, moveFocus);
      picker(container);
      return;
    }
    const unit = units[step - 1];
    const header = node("div", null, "guided-heading");
    const pages = unit.first === unit.last ? "Page " + unit.first : "Pages " + unit.first + "–" + unit.last;
    const kicker = node("p","Section " + step + " of " + units.length + " · " + pages,"study-kicker");
    const title = node("h2", unit.title);
    header.append(kicker,title);
    const reading = node("div",null,"lesson-body guided-text");
    for (const ref of unit.refs) {
      if (ref.block) reading.append(current.contentBlock(ref.block));
      else if (ref.links) reading.append(current.sourceLinks(ref.links));
    }
    const actions = node("div", null, "practice-actions guided-actions");
    const card = /^(sources?|source notes|further reading)(\b|$)/i.test(unit.title) ? null : checkFor(unit);
    if (card) {
      actions.append(button("Recall without notes", "practice-primary", () => startCheck(unit,checkFor(unit) || card)));
      const next = advanceButton(); next.className = "study-link"; actions.append(next);
    } else actions.append(advanceButton());
    actions.append(button("Previous section","study-link",() => goStep(step-1)));
    container.append(header,reading);
    window.NovelWorkbook?.append(container,{track:current.track,lessonId:current.lesson.id,unit});
    container.append(actions);
    picker(container);
    if (moveFocus) focus(title);
  }

  function setView(mode) {
    view = mode;
    for (const btn of document.querySelectorAll("[data-view]")) btn.setAttribute("aria-pressed", String(btn.dataset.view === mode || (["review","apply"].includes(mode) && btn.dataset.view === "practice")));
    $("source-pane").hidden = mode !== "text";
    work.hidden = mode === "text";
    $("return-practice").hidden = !returnFromSource;
    $("due-review").setAttribute("aria-pressed", String(mode === "review"));
    $("look-up").hidden = true;
  }
  async function openSource(source, origin) {
    await current.navigate(source.track,source.lessonId);
    if (current.track !== source.track || current.lesson.id !== source.lessonId) return;
    returnFromSource = origin;
    show("text");
    const page = $("source-page-" + source.page);
    if (page) { page.focus({preventScroll:true}); page.scrollIntoView({block:"start"}); }
  }
  async function show(mode, moveFocus = false) {
    const ticket = ++generation;
    dispose();
    setView(mode);
    if (mode === "text") {
      work.replaceChildren();
      if (moveFocus) focus($("lesson-title"));
      return;
    }
    returnFromSource = null;
    if (mode === "learn") {
      guided(moveFocus);
      refreshReview();
      return;
    }
    work.replaceChildren(node("p","Loading practice…","practice-meta"));
    try {
      await loadBanks();
      if (ticket !== generation) return;
      const {track,lesson} = current;
      const origin = {track,lessonId:lesson.id,mode};
      session = window.NovelPractice.mount({root:work,track,lesson,mode,banks,onProgress:refreshReview,onExit:() => show("learn",true),onSource:source => openSource(source,origin)});
      refreshReview();
    } catch {
      if (ticket !== generation) return;
      work.replaceChildren(node("p","Practice could not load. Your lesson text is available."),button("Try again","practice-primary",() => show(mode,true)));
    }
  }
  function open(lessonContext) {
    current = lessonContext;
    units = sectionUnits(current.lesson,current.track);
    step = rememberedStep();
    returnFromSource = null;
    show("learn");
    loadBanks().then(refreshReview).catch(() => {});
  }

  for (const btn of document.querySelectorAll("[data-view]")) btn.addEventListener("click", () => { if (current) show(btn.dataset.view,true); });
  $("due-review").addEventListener("click", () => { if (current) show("review",true); });
  $("jump-original").addEventListener("click", () => { if (current) show("text"); });
  $("return-practice").addEventListener("click", async () => {
    const origin = returnFromSource;
    if (!origin) return;
    await current.navigate(origin.track,origin.lessonId);
    if (current.track === origin.track && current.lesson.id === origin.lessonId) show(origin.mode,true);
  });
  window.addEventListener("focus",refreshReview);
  window.addEventListener("storage",event => { if (!event.key || event.key.startsWith("ns.practice.schedule.v1/")) refreshReview(); });
  document.addEventListener("visibilitychange",() => { if (!document.hidden) refreshReview(); });
  function showActivity(action) {
    if (current && ["practice","apply","review"].includes(action)) show(action, true);
  }
  window.NovelStudy = {open,showActivity};
})();
