// The compact progress menu: lesson milestones, due reviews and the learning record sit
// behind one button beside the lesson title, so the exercise can lead the screen.
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const trigger = $("progress-button");
  if (!trigger || !window.NovelSheet) return;
  const embedded = window.parent !== window;
  const svg = "http://www.w3.org/2000/svg";
  const milestones = [
    {key:"recalled", label:"Recall", detail:"Recall a lesson answer or make a distinction independently."},
    {key:"applied", label:"Apply", detail:"Use this lesson’s technique in a fresh example and mark it as independently applied."},
    {key:"retained", label:"Remember later", detail:"Recall a previously practiced item independently in a later day’s review."}
  ];
  let lessonTrack, lessonId, due = 0, last = window.NovelLearning?.snapshot();

  function point(angle) {
    const radians = (angle - 90) * Math.PI / 180;
    return (16 + 12.5 * Math.cos(radians)).toFixed(2) + " " + (16 + 12.5 * Math.sin(radians)).toFixed(2);
  }
  const group = trigger.querySelector(".ring-segments");
  const arcs = milestones.map((_, index) => {
    const start = index * 120 + 9, end = start + 102;
    const path = document.createElementNS(svg, "path");
    path.setAttribute("d", "M" + point(start) + " A12.5 12.5 0 0 1 " + point(end));
    path.setAttribute("class", "ring-arc");
    group.append(path);
    return path;
  });
  const rows = milestones.map(({label, detail}) => {
    const item = document.createElement("li");
    const glyph = document.createElement("span");
    glyph.className = "milestone-glyph";
    glyph.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.className = "milestone-name";
    const state = document.createElement("span");
    state.className = "milestone-state";
    name.append(label + " · ", state);
    const text = document.createElement("p");
    text.className = "milestone-detail";
    text.textContent = detail;
    item.append(glyph, name, text);
    $("milestone-list").append(item);
    return {item, glyph, state};
  });

  const sheet = window.NovelSheet.setup($("progress-sheet"), {onOpen: () => refresh(window.NovelLearning?.snapshot())});
  trigger.addEventListener("click", () => sheet.open(trigger));

  function describe(count) {
    const parts = ["Progress and milestones", count + " of 3 lesson milestones"];
    if (due) parts.push(due + (due === 1 ? " review due" : " reviews due"));
    $("progress-button-label").textContent = parts.join(", ");
  }
  function refresh(snapshot) {
    if (!snapshot) return;
    const achievements = snapshot.lessons?.[lessonTrack]?.[lessonId];
    let count = 0;
    milestones.forEach(({key}, index) => {
      const complete = Number(achievements?.[key]) > 0;
      if (complete) count++;
      arcs[index].dataset.complete = String(complete);
      rows[index].item.dataset.complete = String(complete);
      rows[index].glyph.textContent = complete ? "✓" : "";
      rows[index].state.textContent = complete ? "achieved" : "not yet";
    });
    describe(count);
    $("journey-summary").textContent = "Level " + snapshot.level.number + " · " + snapshot.xp.toLocaleString() + " XP";
  }
  function showGain(snapshot) {
    const gain = snapshot.xp - (last?.xp ?? snapshot.xp);
    last = snapshot;
    // The studio's own progress button shows gains on wider screens.
    if (gain <= 0 || !embedded || !matchMedia("(max-width: 790px)").matches) return;
    const chip = $("ring-gain");
    chip.textContent = "+" + gain;
    chip.classList.remove("is-showing");
    void chip.offsetWidth;
    chip.classList.add("is-showing");
  }

  window.addEventListener("ns-lesson-rendered", event => {
    const {track, lesson} = event.detail || {};
    if (!["fiction","vocabulary"].includes(track) || typeof lesson !== "string") return;
    lessonTrack = track;
    lessonId = lesson;
    refresh(window.NovelLearning?.snapshot());
  });
  window.addEventListener("ns-learning-progress", event => {
    const snapshot = event.detail || window.NovelLearning?.snapshot();
    refresh(snapshot);
    showGain(snapshot);
  });
  window.addEventListener("ns-review-due", event => {
    due = Number(event.detail?.due) || 0;
    const badge = $("ring-badge");
    badge.textContent = due > 99 ? "99+" : String(due);
    badge.hidden = !due;
    refresh(window.NovelLearning?.snapshot());
  });
  window.addEventListener("message", event => {
    if (event.source !== window.parent || event.origin !== location.origin) return;
    if (event.data?.type === "ns-progress-closed" && trigger.isConnected) trigger.focus({preventScroll: true});
  });
  $("open-journey").addEventListener("click", () => {
    if (embedded) window.parent.postMessage({type:"ns-open-progress"}, location.origin);
    else document.getElementById("journey-button")?.click();
  });
})();
