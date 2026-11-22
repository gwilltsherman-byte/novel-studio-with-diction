
(function () {
  "use strict";
  const D = window.Diction = window.Diction || {};
  const formatDate = new Intl.DateTimeFormat(undefined, {month:"short",day:"numeric",year:"numeric"});
  const gradeLabel = {recalled:"Recalled unaided", partial:"Partly recalled", missed:"Still learning"};
  const routeLabel = {recall:"Word recall",reader:"Reader inference",inference:"Reader inference",transfer:"Independent writing",application:"Independent writing"};
  const esc = value => D.esc(String(value ?? ""));
  const day = value => value && Number.isFinite(Date.parse(value)) ? formatDate.format(new Date(value)) : "";
  const count = value => new Intl.NumberFormat().format(value);
  function newest(entries) {
    return [...(entries || [])].sort((a,b) => (Date.parse(b.date)||0) - (Date.parse(a.date)||0));
  }
  function minutesText(value) {
    const mins = Math.round(value);
    if (mins >= 60) return Math.floor(mins / 60) + "h" + (mins % 60 ? " " + mins % 60 + "m" : "");
    return mins ? mins + "m" : value > 0 ? "<1m" : "0m";
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
  function due(s) {
    return !s.transfer && !s.followUpComplete && !!day(s.followUpDue);
  }
  function practiceButton(s,i) {
    if (!due(s)) return '';
    const ready = Date.parse(s.followUpDue) <= Date.now();
    return '<div class="pg-follow"><p><strong>Follow-up writing</strong><span>' + (ready ? "Ready since " : "Scheduled for ") + esc(day(s.followUpDue)) + '</span></p><button type="button" class="secondary" data-pg="follow" data-index="' + i + '">' + (ready ? "Open follow-up" : "Try follow-up early") + '</button></div>';
  }
  function writingRow(s,i,sessions) {
    const title = s.brief || s.title || (s.track ? s.track + " practice" : "Writing practice");
    const mode = s.transfer ? "Follow-up" : (routeLabel[s.route] || "Writing session");
    const reader = s.readerReaction || "";
    const evidence = s.reason || "";
    const baseline = s.basedOn && sessions.find(entry => entry.id === s.basedOn);
    const word = s.wordId && (D.words || []).find(w => w.id === s.wordId);
    const extra = (s.newPassage ? passage(s.newBrief || "Second brief",s.newPassage) : "") +
      (word ? '<p class="pg-metadata">Recall exercise · ' + esc(word.word) + ' · ' + esc(({good:"Recalled",hard:"Partial recall",miss:"Revisit the word"})[s.recallOutcome]||"Attempted") + (s.usedHint ? " · Hint used" : "") + '</p>' : "") +
      (baseline ? '<details class="pg-baseline"><summary>Compare with the earlier writing sample</summary><p class="pg-metadata">' + esc(baseline.brief || baseline.track || "Earlier brief") + ' · ' + esc(day(baseline.date)) + '</p><div class="pg-comparison">' + passage(baseline.usedLookup?"Earlier draft · word lookup used":"Earlier draft",baseline.original) + passage("Follow-up unaided draft",s.original) + '</div></details>' : "");
    return '<details class="pg-entry"><summary><span class="pg-entry-heading"><span class="pg-brief-title">' + esc(title) +
      '</span><span class="pg-metadata">' + esc([s.track,mode,day(s.date)].filter(Boolean).join(" · ")) + '</span></span><span class="pg-expand" aria-hidden="true"></span></summary>' +
      '<div class="pg-detail">' +
      (s.intent ? '<section class="pg-intent"><h4>Intended effect</h4><p>' + esc(s.intent) + '</p></section>' : '') +
      '<div class="pg-comparison">' + passage(s.usedLookup?"First draft · word lookup used":"First draft",s.original) + passage("Revision",s.revision) + '</div>' +
      (evidence ? '<section class="pg-intent"><h4>Revision note</h4><p>' + esc(evidence) + '</p></section>' : '') +
      (s.readerPrediction ? '<section class="pg-intent"><h4>Predicted reader response</h4><p>' + esc(s.readerPrediction) + '</p></section>' : "") +
      '<section class="pg-reader" data-index="' + i + '"><h4>Reader response</h4><div class="pg-readback"><p>' +
      esc(reader || "Record how a reader interpreted your passage when you hear back.") + '</p><div class="actions pg-reader-actions"><button class="secondary" type="button" data-pg="copy-reader">Copy for a reader</button><button class="secondary" type="button" data-pg="edit-reader">' +
      (reader ? 'Edit response' : 'Add reader response') + '</button></div><label class="pg-manual-copy" hidden>Passage and question<textarea rows="5" readonly></textarea></label></div>' +
      '<form hidden class="pg-reader-form"><label>What did the reader say?<textarea rows="3" maxlength="8000" required>' + esc(reader) +
      '</textarea></label><div class="actions"><button type="submit" class="primary">Save response</button><button type="button" class="secondary" data-pg="cancel-reader">Cancel</button></div></form><span class="pg-status" role="status"></span></section>' +
      extra + practiceButton(s,i) + '</div></details>';
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
      '</span><span class="pg-metadata">' + esc([gradeLabel[r.grade] || "Reviewed",day(r.date)].filter(Boolean).join(" · ")) +
      '</span></span><span class="pg-expand" aria-hidden="true"></span></summary><div class="pg-detail">' +
      (r.answer ? passage("Your recall attempt",r.answer) : '<p class="muted">You revealed the word before entering an answer.</p>') +
      '<p class="pg-metadata">' + esc(detail) + '</p></div></details>';
  }
  D.progress = function (options = {}) {
    const sessions = newest(D.state.sessions);
    const history = newest(D.state.reviewHistory);
    const time = sessions.reduce((sum,s) => sum + Math.max(0,Number(s.minutes)||0),0);
    const followups = sessions.filter(s => s.transfer === true);
    const wordWriting = newest(D.state.coachWriting);
    let tab = ["recall","packs"].includes(options.tab) || (options.tab==="sentences" && wordWriting.length) ? options.tab : "writing";
    const packJournal=newest(D.state.packs?.journal || []);
    const pending = sessions.map((s,i) => ({s,i})).filter(({s}) => due(s) && Date.parse(s.followUpDue)<=Date.now())
      .sort((a,b) => Date.parse(a.s.followUpDue)-Date.parse(b.s.followUpDue));
    const root = D.root;
    root.innerHTML = '<div class="pg-view"><header class="pagehead"><div><h1>Your progress</h1><p>Revisit your writing, compare revisions, and see what you recalled.</p></div></header>' +
      '<dl class="pg-stats">' + stat(count(sessions.length),"Writing sessions") + stat(minutesText(time),"Writing practice time") + stat(count(followups.length),"Unaided follow-ups") + '</dl>' +
      (pending.length ? '<div class="pg-ready"><div><strong>' + count(pending.length) + (pending.length === 1 ? " follow-up is ready" : " follow-ups are ready") + '</strong><p>Try a fresh brief and compare your choices with an earlier session.</p></div><button type="button" class="primary" data-pg="follow" data-index="' + pending[0].i + '">Open follow-up</button></div>' : '') +
      '<div class="pg-switch" role="group" aria-label="Practice history"><button type="button" data-pg="writing">Revision journal</button><button type="button" data-pg="recall">Word recall</button><button type="button" data-pg="packs">Pack writing</button>' +
      (wordWriting.length?'<button type="button" data-pg="sentences">Your word sentences</button>':'')+'</div>' +
      '<section id="pg-list"></section></div>';
    const view = root.querySelector(".pg-view");
    const list = view.querySelector("#pg-list");
    function renderList() {
      view.querySelectorAll(".pg-switch button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.pg === tab)));
      if (tab === "writing") {
        list.setAttribute("aria-label","Revision journal");
        list.innerHTML = sessions.length ? '<div class="pg-rows">' + sessions.map((s,i) => writingRow(s,i,sessions)).join("") + '</div>' :
          blank("Your revision journal is open","Complete a writing session to save your first draft and revision side by side.","practice","Start a session");
      } else if(tab==="sentences"){
        list.setAttribute("aria-label","Sentences from guided word practice");
        list.innerHTML='<div class="pg-rows">'+wordWriting.map(s=>'<article class="pg-entry pg-detail"><h2 class="pg-brief-title">'+esc(s.word)+'</h2><p class="pg-metadata">'+esc(day(s.date))+'</p><p>'+esc(s.sentence)+'</p></article>').join('')+'</div>';
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
    view.addEventListener("click", async e => {
      const button = e.target.closest("button[data-pg]");
      if (!button) return;
      const action = button.dataset.pg;
      if (["writing","recall","packs","sentences"].includes(action)) {
        tab = action;
        renderList();
      } else if(action==="pack-library"){
        D.go("packs");
      } else if(action==="pack-sample"){
        const j=packJournal[Number(button.dataset.index)];
        if(j) D.go("packs", !j.completed && Date.parse(j.due)<=Date.now()?{id:j.packId,followup:j.id}:{id:j.packId});
      } else if (action === "follow") {
        const s = sessions[Number(button.dataset.index)];
        if (s) D.go("practice",{transfer:true,sourceId:s.id,track:s.track});
      } else if (action === "copy-reader") {
        const box = button.closest(".pg-reader");
        const s = sessions[Number(box.dataset.index)];
        const copy = (s.revision || s.original || "") + "\n\nWhat impression did this passage leave you with, and which words gave you that impression?";
        const manual = box.querySelector(".pg-manual-copy");
        const status = box.querySelector(".pg-status");
        try {
          await navigator.clipboard.writeText(copy);
          manual.hidden = true;
          status.textContent = "Passage and reader question copied.";
        } catch {
          manual.hidden = false;
          const text = manual.querySelector("textarea");
          text.value = copy;
          text.focus();
          text.select();
          status.textContent = "Use your device’s Copy command to copy the selected text.";
        }
      } else if (action === "edit-reader" || action === "cancel-reader") {
        const box = button.closest(".pg-reader");
        const form = box.querySelector("form");
        const opening = action === "edit-reader";
        box.querySelector(".pg-readback").hidden = opening;
        form.hidden = !opening;
        box.querySelector(".pg-status").textContent = "";
        if (opening) {
          form.querySelector("textarea").value = sessions[Number(box.dataset.index)].readerReaction || "";
          form.querySelector("textarea").focus();
        } else {
          box.querySelector('[data-pg="edit-reader"]').focus();
        }
      } else if (action === "practice" || action === "lexicon" || action === "guided") {
        D.go(action);
      }
    });
    view.addEventListener("submit", e => {
      const form = e.target.closest(".pg-reader-form");
      if (!form) return;
      e.preventDefault();
      const box = form.closest(".pg-reader");
      const textarea = form.querySelector("textarea");
      const reader = textarea.value.trim();
      if (!reader) { textarea.focus(); return; }
      const s = sessions[Number(box.dataset.index)];
      s.readerReaction = reader;
      D.save();
      box.querySelector(".pg-readback p").textContent = reader;
      const edit = box.querySelector('[data-pg="edit-reader"]');
      edit.textContent = "Edit response";
      form.hidden = true;
      box.querySelector(".pg-readback").hidden = false;
      edit.focus();
      box.querySelector(".pg-status").textContent = "Response saved.";
    });
  };
})();

