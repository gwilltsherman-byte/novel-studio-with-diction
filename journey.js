(() => {
  "use strict";

  if (!window.NovelLearning) return;
  let trigger = document.getElementById("journey-button");
  const standalone = !trigger && window.parent === window
    ? /\/(lessons|diction)(?:\/index\.html|\/)?$/.exec(window.location.pathname)?.[1]
    : null;
  if (!trigger && !standalone) return;

  function studyLocation() {
    return /^#(fiction|vocabulary)\/(week-(?:[1-9]|1[0-9]|20)|map)$/.exec(location.hash);
  }
  function appLink(track, action) {
    const target = new URL("../", location.href);
    const lesson = standalone === "lessons" ? studyLocation() : null;
    if (action) target.searchParams.set("activity",action);
    if (standalone === "diction" && (!action || (action === "review" && window.Diction?.reviewStatus?.().due > 0))) {
      target.hash = "word-tools";
    } else {
      const id = lesson?.[1] === track && (track === "fiction" || lesson[2] !== "map") ? "/" + lesson[2] : "";
      target.hash = "lessons/" + track + id;
    }
    return target.href;
  }
  if (standalone) {
    const bar = document.createElement("div");
    bar.className = "journey-standalone-bar";
    const home = document.createElement("a");
    home.textContent = "Novel Studio";
    const updateLink = () => { home.href = appLink(currentTrack()); };
    updateLink();
    home.addEventListener("click",updateLink);
    window.addEventListener("hashchange",updateLink);
    trigger = document.createElement("button");
    trigger.id = "journey-button";
    bar.append(home,trigger);
    document.body.prepend(bar);
  }

  const dialog = document.createElement("dialog");
  dialog.id = "learning-journey";
  dialog.setAttribute("aria-labelledby", "journey-title");
  dialog.innerHTML = `
    <div class="journey-inner">
      <header class="journey-heading">
        <h2 id="journey-title" tabindex="-1">Learning progress</h2>
        <button type="button" class="journey-close">Close</button>
      </header>
      <section class="journey-level" aria-labelledby="journey-level-title">
        <div class="journey-level-row">
          <h3 id="journey-level-title"></h3>
          <span class="journey-level-total"></span>
        </div>
        <progress class="journey-level-bar" aria-label="Experience toward the next level"></progress>
        <div class="journey-level-caption"><span class="journey-level-next"></span><span class="journey-days"></span></div>
        <p class="journey-latest" hidden></p>
      </section>
      <section class="journey-section" aria-labelledby="journey-quests">
        <div class="journey-section-title"><h3 id="journey-quests">Today’s challenges</h3><span class="journey-quest-count"></span></div>
        <ul class="journey-quest-list"></ul>
      </section>
      <section class="journey-section" aria-labelledby="journey-course-title">
        <h3 id="journey-course-title">Your courses</h3>
        <div class="journey-tracks"></div>
      </section>
      <details class="journey-record">
        <summary>Skills and milestones</summary>
        <p>Questions you have answered independently, counted once per skill.</p>
        <dl class="journey-skills"></dl>
        <p class="journey-memory"></p>
        <ul class="journey-milestones" aria-label="Lifetime milestones"></ul>
        <p class="journey-rewards">Your first successful recall or distinction earns 4 XP. Applying a skill earns 6 XP. Successfully recalling it on a later day earns 8 more.</p>
      </details>
      <p class="journey-storage" hidden></p>
    </div>`;
  document.body.append(dialog);

  const find = selector => dialog.querySelector(selector);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const triggerLabel = el("span", "journey-trigger-label", "Progress");
  const triggerLevel = el("span", "journey-trigger-level");
  trigger.replaceChildren(triggerLabel, triggerLevel);
  trigger.type = "button";
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-controls", dialog.id);
  trigger.setAttribute("aria-expanded", "false");
  const announcement = el("span", "journey-visually-hidden");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", "polite");
  document.body.append(announcement);

  let snapshot = window.NovelLearning.snapshot();
  let scheduled = null;
  const goals = [
    {key:"attempts", title:"Practice three prompts", hint:"Try three different prompts from memory.", action:"practice", button:"Practice"},
    {key:"applications", title:"Put a skill to use", hint:"Apply an idea in your own example, then check it against the model.", action:"apply", button:"Try an application"},
    {key:"retained", title:"Remember it later", hint:"Recall a previously practiced item after a night away.", action:"review", button:"Review due"}
  ];
  const skills = {recall:"Recall",compare:"Distinguish",apply:"Apply"};

  function currentTrack() {
    return standalone === "diction" || /^#(?:word-tools|vocabulary)$|^#(?:lessons\/)?vocabulary(?:\/|$)/.test(location.hash) ? "vocabulary" : "fiction";
  }

  function start(action, track) {
    dialog.close();
    if (standalone) {
      location.assign(appLink(track,action));
      return;
    }
    window.dispatchEvent(new CustomEvent("ns-journey-action", {detail:{action,track}}));
  }

  const goalNodes = {};
  for (const goal of goals) {
    const item = el("li", "journey-quest");
    const score = el("span", "journey-quest-score");
    const description = el("div", "journey-quest-description");
    const heading = el("h4", "", goal.title);
    const hint = el("p", "", goal.hint);
    const action = el("button", "journey-action", goal.button);
    action.type = "button";
    action.addEventListener("click", () => {
      const actionName = goal.key === "retained" && action.dataset.buildReview === "true" ? "practice" : goal.action;
      start(actionName, currentTrack());
    });
    description.append(heading, hint, action);
    item.append(score, description);
    find(".journey-quest-list").append(item);
    goalNodes[goal.key] = {item, score, hint, action};
  }

  const tracks = {};
  for (const [id, name] of Object.entries({fiction:"Fiction", vocabulary:"Vocabulary"})) {
    const card = el("div", "journey-track");
    const title = el("h4", "", name);
    const record = el("p", "journey-track-record");
    const action = el("button", "journey-practice", "Practice " + name.toLowerCase());
    action.type = "button";
    action.addEventListener("click", () => start("practice", id));
    card.append(title, record, action);
    find(".journey-tracks").append(card);
    tracks[id] = record;
  }

  const skillNodes = {};
  for (const [key, name] of Object.entries(skills)) {
    const group = el("div");
    const count = el("dd");
    group.append(el("dt", "", name), count);
    find(".journey-skills").append(group);
    skillNodes[key] = count;
  }

  const milestones = [
    {title:"First application", description:"Apply a skill independently.", target:1, value:d => d.totals.applications},
    {title:"Remembered later", description:"Recall one item on a later day.", target:1, value:d => d.totals.retained},
    {title:"Across both courses", description:"Recall an item on a later day in each course.", target:2,
      value:d => Number(d.tracks.fiction.retained > 0) + Number(d.tracks.vocabulary.retained > 0)}
  ].map(milestone => {
    const row = el("li");
    const description = el("span", "journey-milestone-description");
    description.append(el("strong", "", milestone.title), el("span", "", milestone.description));
    const progress = el("span", "journey-milestone-progress");
    row.append(description, progress);
    find(".journey-milestones").append(row);
    return {...milestone, progress};
  });

  function when(time) {
    const date = new Date(time);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate()+1);
    if (date.toDateString() === today.toDateString()) return "today at " + date.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});
    if (date.toDateString() === tomorrow.toDateString()) return "tomorrow";
    return date.toLocaleDateString(undefined,{month:"short",day:"numeric"});
  }

  function render(data) {
    triggerLevel.textContent = "Lv. " + data.level.number;
    trigger.setAttribute("aria-label", "Learning progress, level " + data.level.number);
    find("#journey-level-title").textContent = "Level " + data.level.number;
    find(".journey-level-total").textContent = data.xp.toLocaleString() + " XP";
    const bar = find(".journey-level-bar");
    bar.max = data.level.required;
    bar.value = data.level.earned;
    find(".journey-level-next").textContent = (data.level.required - data.level.earned) + " XP to level " + (data.level.number+1);
    find(".journey-days").textContent = data.totals.days + (data.totals.days === 1 ? " practice day" : " practice days");
    let completed = 0;
    for (const goal of goals) {
      const {item,score} = goalNodes[goal.key];
      const target = data.today.targets[goal.key];
      const count = Math.min(data.today[goal.key], target);
      const done = count >= target;
      item.classList.toggle("journey-complete", done);
      score.textContent = done ? "✓" : count + "/" + target;
      score.setAttribute("aria-label", done ? "Complete" : count + " of " + target);
      if (done) completed++;
    }
    find(".journey-quest-count").textContent = completed + " of " + goals.length + " complete";

    let reviewHint = "After a later-day recall, this challenge records what you remembered.";
    if (scheduled?.due > 0) {
      reviewHint = scheduled.due + (scheduled.due === 1 ? " review item is due." : " review items are due.") + " Later-day recalls count toward this challenge.";
    } else if (scheduled?.nextDue > Date.now()) {
      reviewHint = "Your next review is due " + when(scheduled.nextDue) + ". Later-day recalls count here.";
    } else if (data.eligibleReviews > 0) {
      reviewHint = "Return to a prompt you practiced on an earlier day and try it from memory.";
    } else if (data.nextReviewAt > Date.now()) {
      reviewHint = "A past prompt can count toward this challenge " + when(data.nextReviewAt) + ".";
    } else if (!data.totals.attempts) {
      reviewHint = "Practice a prompt today, then recall it on a later day.";
    }
    goalNodes.retained.hint.textContent = reviewHint;
    const reviewAction = goalNodes.retained.action;
    const buildReview = !scheduled?.due && !scheduled?.nextDue && !data.totals.attempts;
    reviewAction.dataset.buildReview = String(buildReview);
    reviewAction.textContent = buildReview ? "Practice for later" : scheduled && !scheduled.due ? "Review schedule" : "Review due";

    for (const [id, field] of Object.entries(tracks)) {
      const track = data.tracks[id];
      field.textContent = track.xp.toLocaleString() + " XP · " + track.retained.toLocaleString() + " remembered later";
    }
    for (const [kind, count] of Object.entries(skillNodes)) count.textContent = data.skills[kind].toLocaleString();
    const retained = data.totals.retained;
    find(".journey-memory").textContent = retained === 1 ? "1 distinct question recalled successfully on a later day." : retained.toLocaleString() + " distinct questions recalled successfully on a later day.";
    for (const milestone of milestones) {
      const count = Math.min(milestone.value(data),milestone.target);
      milestone.progress.textContent = count === milestone.target ? "Earned" : count + " / " + milestone.target;
      milestone.progress.classList.toggle("journey-earned", count === milestone.target);
    }
    const storage = find(".journey-storage");
    storage.hidden = data.storageAvailable;
    if (!storage.hidden) storage.textContent = "Progress is available for this visit. Your browser could not save it on this device.";
  }

  function refresh() {
    if (standalone === "diction" && window.Diction?.reviewStatus) scheduled = window.Diction.reviewStatus();
    snapshot = window.NovelLearning.snapshot();
    render(snapshot);
  }
  trigger.addEventListener("click", () => {
    refresh();
    if (!dialog.open) dialog.showModal();
    trigger.setAttribute("aria-expanded","true");
    find("#journey-title").focus({preventScroll:true});
  });
  find(".journey-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => trigger.setAttribute("aria-expanded","false"));
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });

  window.addEventListener("ns-learning-progress", event => {
    const previous = snapshot;
    snapshot = event.detail;
    render(snapshot);
    const gain = snapshot.xp - previous.xp;
    if (gain <= 0) return;
    const message = snapshot.level.number > previous.level.number
      ? "Level " + snapshot.level.number + " reached."
      : snapshot.today.retained > previous.today.retained
      ? "Later-day recall recorded."
      : gain + " XP earned.";
    announcement.textContent = message;
    const latest = find(".journey-latest");
    latest.hidden = false;
    latest.textContent = snapshot.level.number > previous.level.number
      ? "Just reached level " + snapshot.level.number
      : snapshot.today.retained > previous.today.retained
      ? "Latest gain · +" + gain + " XP for later-day recall"
      : "Latest gain · +" + gain + " XP";
    trigger.title = message + " Open learning progress.";
    // Keep earned feedback inside the existing control so the question never moves.
    triggerLevel.dataset.gain = "+" + gain + " XP";
    triggerLevel.classList.remove("journey-gain");
    void triggerLevel.offsetWidth;
    triggerLevel.classList.add("journey-gain");
  });
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  window.NovelJourney = {
    // The phone layout opens progress from a lesson's compact menu.
    open() { trigger.click(); },
    setReviewStatus(value) {
      scheduled = value;
      render(snapshot);
    }
  };
  render(snapshot);
})();
