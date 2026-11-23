(() => {
  "use strict";

  const work = document.getElementById("study-work");
  if (!work) return;

  const milestones = [
    {key:"recalled", label:"Recall", detail:"Recall a lesson answer or make a distinction independently."},
    {key:"applied", label:"Apply", detail:"Use this lesson’s technique in a fresh example and mark it as independently applied."},
    {key:"retained", label:"Remember later", detail:"Recall a previously practiced item independently in a later day’s review."}
  ];
  const details = document.createElement("details");
  details.className = "lesson-milestones";
  details.hidden = true;
  const summary = document.createElement("summary");
  const title = document.createElement("span");
  title.className = "milestones-title";
  title.textContent = "Lesson milestones";
  const marks = document.createElement("span");
  marks.className = "milestones-marks";
  const explanations = document.createElement("ul");
  explanations.className = "milestones-explanations";
  summary.append(title,marks);
  details.append(summary,explanations);
  work.before(details);

  const rows = milestones.map(({key,label,detail}) => {
    const mark = document.createElement("span");
    mark.className = "milestone-mark";
    const glyph = document.createElement("span");
    glyph.className = "milestone-glyph";
    glyph.setAttribute("aria-hidden","true");
    const state = document.createElement("span");
    state.className = "milestone-state";
    mark.append(glyph,document.createTextNode(label),state);
    marks.append(mark);
    const line = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = label + ". ";
    line.append(name,document.createTextNode(detail));
    explanations.append(line);
    return {key,mark,glyph,state};
  });

  let lessonTrack, lessonId;
  function visibility() {
    details.hidden = !lessonId || work.hidden;
  }
  function refresh(value) {
    const achievements = value?.lessons?.[lessonTrack]?.[lessonId];
    for (const row of rows) {
      const complete = Number(achievements?.[row.key]) > 0;
      if (row.mark.dataset.complete === String(complete)) continue;
      row.mark.dataset.complete = String(complete);
      row.glyph.textContent = complete ? "✓" : "";
      row.state.textContent = complete ? ", achieved. " : ", pending. ";
    }
  }
  function select(track,id) {
    if (!["fiction","vocabulary"].includes(track) || typeof id !== "string" || !id) return;
    if (lessonId !== id || lessonTrack !== track) details.open = false;
    lessonTrack = track;
    lessonId = id;
    refresh(window.NovelLearning?.snapshot());
    visibility();
  }
  window.addEventListener("ns-lesson-rendered",event => select(event.detail?.track,event.detail?.lesson));
  window.addEventListener("ns-learning-progress",event => {
    if (lessonId) refresh(event.detail || window.NovelLearning?.snapshot());
  });
  new MutationObserver(visibility).observe(work,{attributes:true,attributeFilter:["hidden"]});
  const current = document.getElementById("lesson-originals")?.dataset;
  select(current?.track,current?.lesson);
})();
