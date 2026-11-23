
(function () {
  "use strict";
  const D = window.Diction = window.Diction || {};
  const escape = value => D.esc(String(value ?? "")).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const q = selector => D.root.querySelector(selector);
  const on = (selector, event, handler) => {
    const element = q(selector);
    if (element) element.addEventListener(event, handler);
  };
  const words = () => D.words || [];
  const findWord = id => words().find(word => word.id === id);
  const findNote = id => D.state.notes.find(note => note.id === id);
  const savedWord = id => D.state.notes.find(note => note.wordId === id);
  const tracks = ["Attribution", "Movement", "Uncertainty"];
  const intervals = [1, 3, 7, 14, 30, 60];
  const day = 86400000;
  const tag = text => '<span class="lx-tag">' + escape(text) + '</span>';
  const heading = (title, intro, action = '') => '<header class="pagehead lx-head"><div><h1>' + escape(title) + '</h1><p>' + escape(intro) + '</p></div>' + action + '</header>';
  const button = (id, label, kind = 'secondary') => '<button type="button" class="' + kind + '" id="' + id + '">' + escape(label) + '</button>';
  const readDate = value => new Date(value).getTime();
  function dueLabel(value) {
    const due = readDate(value);
    if (!Number.isFinite(due)) return "Unscheduled";
    const minutes = Math.ceil((due - Date.now()) / 60000);
    if (minutes <= 0) return "Ready now";
    if (minutes < 60) return "In " + minutes + (minutes === 1 ? " minute" : " minutes");
    return new Date(due).toLocaleString(undefined, {month:"short", day:"numeric", hour:"numeric", minute:"2-digit"});
  }
  function reviewItem(id) {
    const entry = findWord(id);
    if (entry) return entry;
    const packEntry=D.packReviewItem?.(id);
    if(packEntry)return packEntry;
    const note = findNote(id);
    if (!note) return D.coach?.reviewItem(id) || null;
    return {id, word:note.word, track:"Notebook", sense:note.sense, prompt:note.sense, example:note.source, hint:"Try recalling the sentence where you first noticed it.", custom:true};
  }
  function reviewKey(note) {
    return (note.wordId && findWord(note.wordId)) ? note.wordId : note.id;
  }
  function scheduleNew(id) {
    if (!D.state.reviews[id]) {
      D.state.reviews[id] = {level:0, due:new Date().toISOString()};
      D.onReviewChange?.();
    }
  }
  function entryDate(value) {
    return new Date(value).toLocaleDateString(undefined, {month:"short",day:"numeric",year:"numeric"});
  }
  const iconSearch = '<span aria-hidden="true" class="lx-search-icon"></span>';
  function searchField(label, value) {
    return '<label class="lx-search">' + iconSearch + '<input id="lx-search" type="search" aria-label="' + escape(label) + '" placeholder="' + escape(label) + '" value="' + escape(value || '') + '"></label>';
  }
  function back(id, label) {
    return '<button type="button" class="lx-back" id="' + id + '">' + escape(label) + '</button>';
  }
  function empty(title, copy, action = '') {
    return '<section class="panel lx-empty"><span class="lx-empty-mark" aria-hidden="true">¶</span><h2>' + escape(title) + '</h2><p>' + escape(copy) + '</p>' + action + '</section>';
  }
  function footerLinks(actions) { return '<div class="actions lx-actions">' + actions + '</div>'; }
  function navigate(view, options) { D.go(view, options || {}); }

  D.lexicon = function (options = {}) {
    if (options.id && findWord(options.id)) { studyDetail(findWord(options.id), options); return; }
    let filter = tracks.includes(options.track) ? options.track : "All";
    const labels = ["All", ...tracks];
    D.root.innerHTML = '<section class="lx-view">' + heading("Word study", "Explore a word’s meaning, its usual company, and what a nearby choice would change.") +
      '<div class="lx-tools">' + searchField("Search words or meanings", options.query) + '<div class="lx-filters" aria-label="Filter by collection">' +
      labels.map(t => '<button type="button" data-filter="' + t + '" aria-pressed="' + (t === filter) + '">' + (t === "All" ? "All words" : t) + '</button>').join('') + '</div></div>' +
      '<p id="lx-count" class="lx-count" aria-live="polite"></p><div id="lx-list" class="lx-grid"></div></section>';
    function update() {
      const query = q("#lx-search").value.trim().toLowerCase();
      const entries = words().filter(w => (filter === "All" || filter === w.track) && [w.word,w.sense,w.neighbor,w.pattern].join(" ").toLowerCase().includes(query));
      q("#lx-count").textContent = entries.length + (entries.length === 1 ? " word" : " words");
      q("#lx-list").innerHTML = entries.length ? entries.map(w =>
        '<button type="button" class="lx-card" data-word="' + escape(w.id) + '">' + tag(w.track) + '<span class="lx-card-title">' + escape(w.word) + '</span><span class="lx-card-body">' + escape(w.sense) + '</span></button>').join('') :
        empty("No matching words", "Try a different search or choose another collection.");
    }
    on("#lx-search","input",update);
    D.root.querySelectorAll("[data-filter]").forEach(b => b.addEventListener("click", () => {
      filter=b.dataset.filter;
      D.root.querySelectorAll("[data-filter]").forEach(other => other.setAttribute("aria-pressed", other === b));
      update();
    }));
    on("#lx-list","click", e => {
      const b = e.target.closest("[data-word]");
      if (b) navigate("lexicon",{id:b.dataset.word,track:filter,query:q("#lx-search").value});
    });
    update();
  };

  function studyDetail(w, options) {
    const saved = savedWord(w.id);
    D.root.innerHTML = '<section class="lx-view">' + back('lx-index',"All word studies") +
      '<header class="pagehead lx-head"><div>' + tag(w.track) + '<h1>' + escape(w.word) + '</h1><p>' + escape(w.sense) + '</p></div></header>' +
      '<div class="lx-detail"><article class="panel lx-sheet"><h2>In a sentence</h2><blockquote>' + escape(w.example) + '</blockquote><h3>Common phrasing</h3><p>' + escape(w.pattern) + '</p></article>' +
      '<article class="panel lx-sheet"><h2>Compare the choice</h2><p class="lx-near">' + escape(w.word) + ' <i>or</i> ' + escape(w.neighbor) + '</p><p>' + escape(w.contrast) + '</p></article></div>' +
      footerLinks(button("lx-review","Practice this word","primary") + button("lx-save", saved ? "Open notebook entry" : "Save to notebook")) + '</section>';
    on("#lx-index", "click", () => navigate("lexicon", {track:options.track,query:options.query}));
    on("#lx-review", "click", () => navigate("review",{id:w.id}));
    on("#lx-save", "click", () => {
      let note = savedWord(w.id);
      if (!note) {
        note = {id:newId(),wordId:w.id,word:w.word,sense:w.sense,source:w.example,sourceName:"Diction word study",goal:"",created:new Date().toISOString()};
        D.state.notes.unshift(note); scheduleNew(w.id); D.save();
      }
      navigate("notebook", {id:note.id});
    });
  }
  function newId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return "note-" + window.crypto.randomUUID();
    return "note-" + Date.now().toString(36) + Math.random().toString(36).slice(2,10);
  }
  D.notebook = function (options = {}) {
    if (options.edit || options.new) { noteForm(options.edit ? findNote(options.edit) : null); return; }
    if (options.id && findNote(options.id)) { noteDetail(findNote(options.id)); return; }
    D.root.innerHTML = '<section class="lx-view">' + heading("Notebook", "Keep words, source sentences, and the choices you want to try in your own work.", button("lx-new","Add an entry","primary")) +
      (D.state.notes.length ? '<div class="lx-tools">' + searchField("Search your notebook", "") + '</div>' : '') + '<div id="lx-notes"></div></section>';
    function update(){
      const query=(q("#lx-search")?.value || "").trim().toLowerCase();
      const entries=D.state.notes.filter(n => [n.word,n.sense,n.source,n.sourceName,n.goal].join(" ").toLowerCase().includes(query));
      q("#lx-notes").innerHTML=entries.length ? '<div class="lx-note-list">' + entries.map(n =>
        '<button type="button" class="lx-note" data-note="' + escape(n.id) + '"><span class="lx-note-text"><span class="lx-card-title">' + escape(n.word) + '</span><span class="lx-card-body">' + escape(n.sense || n.goal || n.source) + '</span></span>' + tag(n.wordId ? "Word study" : "Personal entry") + '</button>').join('') + '</div>' :
        query ? empty("No matching entries","Try part of a word, a source, or a writing goal.") :
        empty("Your first entry", "Capture a word from your reading, or save a word study and add your own notes.",button("lx-explore","Explore word studies"));
      on("#lx-explore","click", () => navigate("lexicon"));
    }
    update();
    on("#lx-new","click", () => navigate("notebook",{new:true}));
    on("#lx-search","input",update);
    on("#lx-notes","click", e => {
      const b=e.target.closest("[data-note]");
      if (b) navigate("notebook",{id:b.dataset.note});
    });
  };
  function noteDetail(note) {
    const key = reviewKey(note);
    D.root.innerHTML='<section class="lx-view">' + back("lx-index","All notebook entries") + heading(note.word, note.sense) +
      '<article class="panel lx-sheet">' + (note.source ? '<h2>Source sentence</h2><blockquote>' + escape(note.source) + '</blockquote>' : '') +
      (note.sourceName ? '<p class="lx-caption">' + escape(note.sourceName) + '</p>' : '') +
      '<h3>How I want to use it</h3><p class="lx-pre">' + escape(note.goal || "Add a writing goal when you edit this entry.") + '</p>' +
      '<p class="lx-caption">Saved ' + escape(entryDate(note.created)) + '</p></article>' +
      footerLinks(button("lx-review","Practice recall","primary")+button("lx-pack","Add to a pack")+button("lx-edit","Edit entry")+button("lx-remove","Delete entry","lx-link")) +
      '<div id="lx-confirm" role="status"></div></section>';
    on("#lx-index","click", () => navigate("notebook"));
    on("#lx-edit","click", () => navigate("notebook",{edit:note.id}));
    on("#lx-pack","click", () => navigate("packs",{addNote:note.id}));
    on("#lx-review","click", () => navigate("review",{id:key}));
    on("#lx-remove","click", () => {
      q("#lx-confirm").innerHTML='<div class="notice lx-confirm">Delete this notebook entry? ' + button("lx-yes","Delete","secondary") + ' ' + button("lx-no","Keep entry","secondary") + '</div>';
      q("#lx-no").focus();
      on("#lx-no","click", () => { q("#lx-confirm").replaceChildren(); q("#lx-remove").focus(); });
      on("#lx-yes","click", () => {
        D.state.notes=D.state.notes.filter(n=>n.id!==note.id);
        if (key === note.id && !D.packReviewItem?.(key)) {
          delete D.state.reviews[key];
          D.onReviewChange?.();
          if (D.state.lexicalAttempt?.id === key) delete D.state.lexicalAttempt;
        }
        D.save(); navigate("notebook");
      });
    });
  }
  function noteForm(note) {
    const input=(name,label,required,area,limit,value) => '<label class="field lx-field"><span class="field-label">' + label + '</span>' +
      (area ? '<textarea rows="3" name="' + name + '" maxlength="' + limit + '"' + (required?' required':'') + '>' + escape(value) + '</textarea>' :
      '<input name="' + name + '" maxlength="' + limit + '" value="' + escape(value) + '"' + (required?' required':'') + '>') + '</label>';
    D.root.innerHTML='<section class="lx-view">' + back("lx-index","Notebook") + heading(note?"Edit entry":"Add an entry","Give the word a meaning cue you can use to test yourself later.") +
      '<form class="panel lx-sheet lx-form" id="lx-noteform">' + input("word","Word or phrase",true,false,100,note?.word) + input("sense","Meaning in your own words",true,true,600,note?.sense) +
      input("source","Source sentence (optional)",false,true,2200,note?.source) + input("sourceName","Source or author (optional)",false,false,240,note?.sourceName) +
      input("goal","Writing goal (optional)",false,true,900,note?.goal) + footerLinks('<button class="primary" type="submit">Save entry</button>'+ button("lx-cancel","Cancel")) + '</form></section>';
    function cancel(){ navigate("notebook",note ? {id:note.id} : {}); }
    on("#lx-index","click",cancel); on("#lx-cancel","click",cancel);
    on("#lx-noteform","submit", e => {
      e.preventDefault();
      const form=e.currentTarget;
      const fields={};
      for (const name of ["word","sense","source","sourceName","goal"]) fields[name]=form.elements[name].value.trim();
      for (const name of ["word","sense"]) {
        if (!fields[name]) { form.elements[name].value=""; form.elements[name].reportValidity(); return; }
      }
      const entry=note || {id:newId(),created:new Date().toISOString()};
      const changedCue=note && (fields.word!==note.word || fields.sense!==note.sense);
      if (changedCue && D.packReviewItem?.(entry.id)) entry.id=newId();
      if (changedCue && entry.wordId) delete entry.wordId;
      Object.assign(entry,fields);
      if (!note) D.state.notes.unshift(entry);
      if (changedCue && reviewKey(entry)===entry.id) {
        delete D.state.reviews[entry.id];
        if (D.state.lexicalAttempt?.id===entry.id) delete D.state.lexicalAttempt;
      }
      scheduleNew(reviewKey(entry)); D.save(); navigate("notebook",{id:entry.id});
    });
  }
  function getQueue() {
    return Object.entries(D.state.reviews)
      .map(([id,record])=>({item:reviewItem(id),due:record?.due}))
      .filter(r=>r.item && Number.isFinite(readDate(r.due)))
      .sort((a,b)=>readDate(a.due)-readDate(b.due));
  }
  D.reviewStatus = () => {
    const queue = getQueue(), now = Date.now();
    const future = queue.find(row => readDate(row.due) > now);
    return {due:queue.filter(row => readDate(row.due) <= now).length, nextDue:future ? readDate(future.due) : null};
  };
  function startAttempt(id, fromStudy = false) {
    if (!reviewItem(id)) return;
    if (D.state.lexicalAttempt?.id !== id) {
      D.state.lexicalAttempt={id,stage:"attempt",answer:"",hinted:false,skipped:false,fromStudy};
      D.save();
    }
    attemptView();
  }
  D.review = function(options={}) {
    if (options.id && reviewItem(options.id)) { startAttempt(options.id, true); return; }
    const current = D.state.lexicalAttempt;
    if (current && reviewItem(current.id)) { attemptView(); return; }
    const queue=getQueue(), due=queue.filter(r=>readDate(r.due)<=Date.now());
    const next=queue.find(r=>readDate(r.due)>Date.now());
    D.root.innerHTML='<section class="lx-view">' + heading("Review queue","Recall each word from its meaning, then compare your choice and set the next review.") +
      (due.length ? '<section class="panel lx-sheet"><h2>' + due.length + (due.length===1?" word is":" words are") + ' ready</h2><p>The oldest due review comes first.</p>' + button("lx-start","Begin review","primary") + '</section>' :
      empty("You’re up to date",next ? "Next scheduled review: " + dueLabel(next.due) + "." : "Save an entry or practice a word to start your schedule.",button("lx-explore","Explore word studies","primary"))) +
      (queue.length ? '<section class="lx-scheduled"><h2>Your schedule</h2><div class="lx-note-list">' + queue.map(r=>
      '<button type="button" class="lx-note" data-review="' + escape(r.item.id) + '"><span class="lx-card-title">' + escape(r.item.track || "Personal") + ' recall</span>' + tag(dueLabel(r.due)) + '</button>').join('') + '</div></section>' : '') + '</section>';
    on("#lx-start","click",()=>startAttempt(due[0].item.id));
    on("#lx-explore","click",()=>navigate("lexicon"));
    on(".lx-scheduled","click",e=>{const b=e.target.closest("[data-review]");if(b) startAttempt(b.dataset.review);});
  };
  function attemptView() {
    const attempt = D.state.lexicalAttempt;
    const w = reviewItem(attempt.id);
    const revealed=attempt.stage==="compare";
    const allowRecall=!attempt.hinted && !attempt.skipped && !!attempt.answer.trim();
    D.root.innerHTML='<section class="lx-view">' + heading("Word recall", revealed ? "Compare the meaning you had in mind with the study entry." : "Find a word or phrase that conveys this meaning.") +
      '<article class="panel lx-sheet lx-review"><p class="eyebrow">Meaning cue</p><h2 class="lx-cue">' + escape(w.prompt || w.sense) + '</h2>' +
      (revealed ?
        '<div class="lx-answer"><h3>Your attempt</h3><p>' + escape(attempt.answer || "Couldn’t recall a word this time.") + '</p><h3>Study word</h3><p class="lx-answer-word">' + escape(w.word) + '</p><p>' + escape(w.sense) + '</p>' +
        (w.example ? '<blockquote>' + escape(w.example) + '</blockquote>' : '') + (w.contrast ? '<p>' + escape(w.contrast) + '</p>' : '') +
        '</div><h3>How did recall feel?</h3><p class="muted">A different word can fit. Rate how readily you could retrieve this particular word.</p>' + footerLinks(
        (allowRecall?button("lx-recalled","Recalled it","primary"):"") + button("lx-partial",attempt.hinted?"Recalled with help":"Close",allowRecall?"secondary":"primary") + button("lx-missed","Need another try")) :
        '<form id="lx-attemptform"><label class="field lx-field"><span class="field-label">Your word or phrase</span><input id="lx-answer" autocomplete="off" maxlength="160" required value="' + escape(attempt.answer) + '"></label>' +
        (attempt.hinted ? '<p class="notice lx-confirm">' + escape(w.hint || "Think of how you used it in a sentence.") + '</p>' : '') +
        footerLinks('<button type="submit" class="primary">Compare answer</button>' + (!attempt.hinted ? button("lx-hint","Show hint") : "") + button("lx-skip","Can’t recall","lx-link")) + '</form>') +
        '</article></section>';
    if (!revealed) {
      on("#lx-answer","input",e=>{attempt.answer=e.target.value;D.save();});
      on("#lx-hint","click",()=>{attempt.hinted=true;D.save();attemptView();q("#lx-answer").focus();});
      on("#lx-attemptform","submit",e=>{
        e.preventDefault(); attempt.answer=q("#lx-answer").value.trim();
        if (!attempt.answer) { q("#lx-answer").value="";q("#lx-answer").reportValidity();return; }
        attempt.stage="compare"; D.save(); attemptView();
      });
      on("#lx-skip","click",()=>{attempt.skipped=true;attempt.stage="compare";D.save();attemptView();});
    } else {
      on("#lx-recalled","click",()=>grade("recalled"));
      on("#lx-partial","click",()=>grade("partial"));
      on("#lx-missed","click",()=>grade("missed"));
    }
  }
  D.recordRecall = function ({id,word,grade:outcome,answer="",assisted=false,fromStudy=false}) {
    const previous = D.state.reviews[id];
    const earlyRepeat = Boolean(previous?.lastReviewed && Date.parse(previous.due) > Date.now());
    const old = Number(previous?.level) || 0;
    const level=outcome==="recalled" ? Math.min(intervals.length,old+1) : 0;
    const delay=outcome==="recalled" ? intervals[level-1]*day : outcome==="partial" ? day : 10*60000;
    const date=new Date().toISOString(), due=new Date(Date.now()+delay).toISOString();
    D.state.reviews[id]={...D.state.reviews[id],level,due,lastReviewed:date,lastGrade:outcome};
    if (!Array.isArray(D.state.reviewHistory)) D.state.reviewHistory=[];
    D.state.reviewHistory.push({id,word,date,grade:outcome,assisted,fromStudy,answer,due});
    if (answer.trim() || outcome === "missed") {
      const correct = !assisted && outcome === "recalled" && D.coach.matches(answer,word);
      const grade = outcome === "missed" ? "again" : correct ? "good" : "hard";
      D.learningAttempt(id, "recall", grade, earlyRepeat);
    }
    D.onReviewChange?.();
    return {date,due};
  };
  function grade(outcome) {
    const a=D.state.lexicalAttempt;
    if (!a || a.stage!=="compare") return;
    const w=reviewItem(a.id);
    if (!w) return;
    const {due}=D.recordRecall({id:a.id,word:w.word,grade:outcome,answer:a.answer,assisted:a.hinted || a.skipped,fromStudy:!!a.fromStudy});
    delete D.state.lexicalAttempt; D.save();
    const next=getQueue().find(r=>readDate(r.due)<=Date.now());
    D.root.innerHTML='<section class="lx-view">' + heading("Review saved","Your next review reflects how this attempt went.") +
      '<article class="panel lx-sheet"><h2>' + escape(w.word) + '</h2><p>Next review: <strong>' + escape(dueLabel(due)) + '</strong>.</p>' +
      footerLinks((next ? button("lx-next","Review next word","primary") : "") + button("lx-queue","See review queue",next?"secondary":"primary") + button("lx-progress","View progress","lx-link")) + '</article></section>';
    on("#lx-next","click",()=>startAttempt(next.item.id));on("#lx-queue","click",()=>navigate("review"));on("#lx-progress","click",()=>navigate("progress"));
  }
})();

