
(function () {
  "use strict";
  const D = window.Diction = window.Diction || {};
  const formatDate = new Intl.DateTimeFormat(undefined, {month:"short",day:"numeric",year:"numeric"});
  const gradeLabel = {recalled:"Recalled unaided", partial:"Partly recalled", missed:"Still learning"};
  const esc = value => D.esc(String(value ?? ""));
  const day = value => value && Number.isFinite(Date.parse(value)) ? formatDate.format(new Date(value)) : "";
  const count = value => new Intl.NumberFormat().format(value);
  function newest(entries) {
    return [...(entries || [])].sort((a,b) => (Date.parse(b.date)||0) - (Date.parse(a.date)||0));
  }
  function stat(value, label) {
    return '<div><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd></div>';
  }
  function passage(heading,text) {
    return '<div class="pg-passage"><h4>' + esc(heading) + '</h4><p>' + esc(text || "No passage saved.") + '</p></div>';
  }
  function blank(title, description, action, label) {
    return '<div class="panel pg-blank"><span aria-hidden="true" class="pg-pilcrow">¶</span><h3>' + esc(title) + '</h3><p>' + esc(description) + '</p><button type="button" class="primary" data-pg="' + action + '">' + esc(label) + '</button></div>';
  }
  function delayedRecall(history) {
    let tested=0,recalled=0;
    const last=new Map();
    for(const r of [...history].reverse()){
      const now=Date.parse(r.date),previous=last.get(r.id);
      if(!r.fromStudy && now-previous>=86400000){tested++;if(r.grade==='recalled'&&!r.assisted)recalled++;}
      last.set(r.id,now);
    }
    return '<div class="pg-ready"><div><strong>Recall after a day</strong><p>'+(tested?recalled+' of '+tested+' delayed attempts marked recalled without a hint.':'A result appears after you review a previously practiced sense at least a day later.')+'</p></div></div>';
  }
  function recallRow(r) {
    const detail = [day(r.date),r.assisted ? "Used assistance" : "",r.due ? "Review scheduled for " + day(r.due) : ""].filter(Boolean).join(" · ");
    return '<details class="pg-entry"><summary><span class="pg-entry-heading"><span class="pg-brief-title">' + esc(r.word || "Vocabulary review") +
      '</span><span class="pg-metadata">' + esc([r.grade === "recalled" && r.assisted ? "Recalled with help" : gradeLabel[r.grade] || "Reviewed",day(r.date)].filter(Boolean).join(" · ")) +
      '</span></span><span class="pg-expand" aria-hidden="true"></span></summary><div class="pg-detail">' +
      (r.answer ? passage("Your recall attempt",r.answer) : '<p class="muted">You revealed the word before entering an answer.</p>') +
      '<p class="pg-metadata">' + esc(detail) + '</p></div></details>';
  }
  D.progress = function (options = {}) {
    const history = newest(D.state.reviewHistory);
    const wordWriting = newest(D.state.coachWriting);
    const packJournal = newest(D.state.packs?.journal);
    const tabs = {recall:"Word recall", packs:"Pack exercises", sentences:"Word sentences"};
    let tab = Object.hasOwn(tabs, options.tab) ? options.tab : "recall";
    const wordCount = new Set(history.map(entry => entry.id).filter(Boolean)).size;
    const dueCount = Object.values(D.state.reviews || {}).filter(review => Date.parse(review?.due) <= Date.now()).length;
    const root = D.root;
    root.innerHTML = '<div class="pg-view"><header class="pagehead"><h1>Vocabulary progress</h1></header>' +
      '<dl class="pg-stats">' + stat(count(history.length),"Recall attempts") + stat(count(wordCount),"Senses practiced") + stat(count(dueCount),"Due for review") + '</dl>' +
      '<div class="pg-switch" role="group" aria-label="Practice history">' +
      Object.entries(tabs).map(([key, label]) => '<button type="button" data-pg="' + key + '">' + label + '</button>').join('') + '</div>' +
      '<section id="pg-list"></section></div>';
    const view = root.querySelector(".pg-view");
    const list = view.querySelector("#pg-list");
    function renderList() {
      view.querySelectorAll(".pg-switch button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.pg === tab)));
      if (tab === "sentences") {
        list.setAttribute("aria-label","Sentences from guided word practice");
        list.innerHTML=wordWriting.length?'<div class="pg-rows">'+wordWriting.map(s=>'<article class="pg-entry pg-detail"><h2 class="pg-brief-title">'+esc(s.word)+'</h2><p class="pg-metadata">'+esc(day(s.date))+'</p><p>'+esc(s.sentence)+'</p></article>').join('')+'</div>':
          blank('Your practice sentences','Use a new word in a sentence during guided word practice.','guided','Practice a word');
      } else if(tab==="packs"){
        list.setAttribute("aria-label","Writing from vocabulary packs");
        list.innerHTML=packJournal.length?'<div class="pg-rows">'+packJournal.map((j,i)=>{
          const ready=!j.completed && Date.parse(j.due)<=Date.now();
          const action=j.completed?'Follow-up completed':ready?'Ready to revisit':'Follow-up '+day(j.due);
          return '<details class="pg-entry"><summary><span class="pg-entry-heading"><span class="pg-brief-title">'+esc(j.title)+'</span><span class="pg-metadata">'+esc(day(j.date)+' · '+action)+'</span></span><span class="pg-expand" aria-hidden="true"></span></summary><div class="pg-detail"><p>'+esc(j.prompt)+'</p><div class="pg-comparison">'+passage('Original passage',j.passage)+(j.completed?passage('Unaided follow-up',j.followupPassage):'')+'</div><p>'+esc(j.rationale)+'</p>'+(j.completed?'<p>'+esc(j.followupReason)+'</p>':'')+'<button type="button" class="secondary" data-pg="pack-sample" data-index="'+i+'">'+(ready?'Open fresh brief':'Open pack')+'</button></div></details>';
        }).join('')+'</div>':blank('Your pack writing samples','Finish a writing brief in any vocabulary pack. Its passage and later follow-up will appear here.','pack-library','Browse packs');
      } else {
        list.setAttribute("aria-label","Word recall");
        list.innerHTML = history.length ? delayedRecall(history)+'<p class="pg-metadata pg-history-intro">Your self-assessments, in order from most recent.</p><div class="pg-rows">' + history.map(recallRow).join("") + '</div>' :
          blank("Your first recall attempt","Practice your next word. When you return for a review, your recall attempt will appear here.","guided","Practice my next word");
      }
    }
    renderList();
    view.addEventListener("click", e => {
      const button = e.target.closest("button[data-pg]");
      if (!button) return;
      const action = button.dataset.pg;
      if (Object.hasOwn(tabs, action)) {
        tab = action;
        renderList();
      } else if(action==="pack-library"){
        D.go("packs");
      } else if(action==="pack-sample"){
        const j=packJournal[Number(button.dataset.index)];
        if(j) D.go("packs", !j.completed && Date.parse(j.due)<=Date.now()?{id:j.packId,followup:j.id}:{id:j.packId});
      } else if (action === "guided") {
        D.go("guided");
      }
    });
  };
})();
