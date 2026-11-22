
(function () {
  'use strict';
  const N = window.NS;
  const skills = [
  {
    "id": "distance",
    "title": "Narrative distance",
    "category": "Voice & style",
    "description": "Move the reader closer to a character or give the scene more air.",
    "question": "From which passage could you more easily infer what Inez is afraid of? Which detail did the work?",
    "a": "Inez waited beside the school gate after the other parents had gone. She checked her phone twice and shifted her weight.",
    "b": "The gate ought to have opened by now. A mitten lay by the post. Blue, thank God. Milo’s were green.",
    "editor": "A stays outside Inez and lets her movements carry the unease. B borrows her judgment in “ought” and “thank God.” Naming a color becomes an act of frightened reasoning.",
    "exercise": "Take a moment of waiting from your draft. Write it once using only evidence a stranger could observe, then again through what the waiting character notices and misreads.",
    "transfer": [
      "A plumber opens the wall in his childhood home and finds handwriting on a stud. Write the moment before he calls anyone.",
      "At a wedding, a guest sees someone arrive whom nobody else recognizes. Let the reader feel the effort of staying seated.",
      "On her last shift, a ferry pilot hears an unfamiliar noise from below. Write until she decides whether to turn back."
    ],
    "icon": "feather"
  },
  {
    "id": "cadence",
    "title": "Cadence and emphasis",
    "category": "Voice & style",
    "description": "Choose where a sentence gathers speed, pauses, and lands.",
    "question": "Where does each version make you pause? What do you picture last?",
    "a": "The ceiling fan turned, the ice slipped in his glass, and at last the upstairs tap stopped dripping.",
    "b": "At last the upstairs tap stopped dripping. The ceiling fan turned. In his glass the ice slipped.",
    "editor": "A lets the tap end a gathering rhythm, so its silence feels like an arrival. In B the other sounds outlast it. Breaking the beat changes what the room seems to be waiting for.",
    "exercise": "Pick three physical details from one scene. Give them one long sentence, then arrange the same details into short units. Read both aloud and choose which detail deserves the final stress.",
    "transfer": [
      "A conductor lowers her hands, but one person in the audience is still humming. Write the next five seconds.",
      "At closing time a baker counts the things a regular customer has left behind. Make one item linger.",
      "A driver sees the missed exit while her passenger is midway through a proposal. Write the few seconds before either speaks."
    ],
    "icon": "waves"
  },
  {
    "id": "payoff",
    "title": "Setup and payoff",
    "category": "Novel craft",
    "description": "Plant an early detail whose meaning changes later in the book.",
    "question": "In which version are you likelier to remember the spoon? What else might you believe it means?",
    "a": "Before laying the table, Ada rubbed a thumb over the nick in a spoon. She gave that one to her father.",
    "b": "Ada dealt the spoons like cards. Her father raised his without looking. “Ah,” he said. “The old one.”",
    "editor": "A leaves the ritual private and makes Ada its keeper. B makes recognition mutual. If the spoon returns after a separation, each opening has prepared a different kind of loss.",
    "exercise": "Choose something that returns later in your book. Draft two early appearances: one that belongs to a single observer and one that another character also recognizes. Keep the later scene in mind.",
    "transfer": [
      "A theater usher recognizes a former patron at a bus stop years later. Bring back something from an early performance.",
      "The last person leaving a flooded town has to decide what to take off a wall. Write the departure and a brief earlier visit.",
      "A series of radio messages ends unexpectedly. Write the first and last broadcasts so the opening sounds different on a second reading."
    ],
    "icon": "network"
  },
  {
    "id": "dialogue",
    "title": "Dialogue and subtext",
    "category": "Voice & style",
    "description": "Let characters negotiate two things in the same exchange.",
    "question": "What is being negotiated besides the lamp? Where does power change hands?",
    "a": "“Want the lamp?” his sister said. “It only works if you jiggle it.” He said he remembered how.",
    "b": "“The lamp’s yours.” His sister had unplugged it already. “I said I could take it,” he said.",
    "editor": "A offers shared knowledge as a gentler way into the division of belongings. In B, unplugging the lamp turns an offer into a decision. The brother’s correction is small enough to keep the peace, barely.",
    "exercise": "Choose an exchange in which somebody wants a favor. Write a version where the request arrives through practical details and another where a physical action answers before the other person can speak.",
    "transfer": [
      "Two coworkers share the last ride home. One knows the other got the promotion. Let them talk about the route.",
      "A tailor has finished a wedding suit whose owner has not collected it. Write the call with the owner’s brother.",
      "At a crowded dinner someone asks for a family recipe. Let the answer change the balance between two guests."
    ],
    "icon": "quote"
  },
  {
    "id": "compression",
    "title": "Scene and summary",
    "category": "Novel craft",
    "description": "Decide which part of a long stretch of time deserves the page.",
    "question": "Which version makes time feel repetitive? Which gives you one afternoon to inhabit?",
    "a": "Through the winter they played checkers by the stove. By March he could beat his aunt, but only when she was tired.",
    "b": "“King me,” he said. His aunt had fallen asleep over her red pieces. Outside, a plow was lifting the last brown snow.",
    "editor": "A lets the boy’s growing skill measure the winter. B gives that change a single, possibly hollow victory. The sleeping opponent complicates what winning means.",
    "exercise": "Choose a change that takes weeks in your novel. Compress it into a short paragraph, then dramatize one decisive minute. Decide what the reader gains or loses in each.",
    "transfer": [
      "Write twelve years of a neighborhood shop through an item the owner rarely sells. Find one day worth slowing down for.",
      "A runner recovers enough strength to climb the station steps. Tell the story from the first missed train to the first one she catches.",
      "Two cousins learn to mend fishing nets together. End on the first morning one arrives alone."
    ],
    "icon": "book"
  },
  {
    "id": "ensemble",
    "title": "Ensemble voice",
    "category": "Novel craft",
    "description": "Let a group tell a story without losing the people inside it.",
    "question": "Who gets to speak for the street in each version? Whose disagreement can you hear?",
    "a": "We all said the pear tree had to go. When the men with the saw arrived, Mrs. Cao brought out a ladder and began picking fruit.",
    "b": "Mrs. Cao said the pears were nearly ready. Len said the roots had cracked his path. By noon the ladder and the saw leaned together against the trunk.",
    "editor": "The “we” in A claims agreement that one woman’s action quietly disputes. B gives both neighbors a reason. The objects at the end hold the disagreement open.",
    "exercise": "Take a disputed event in the book. Give it a communal telling with one visible dissenter, then let two individuals carry the same scene. Decide whose silence each version creates.",
    "transfer": [
      "Five former bandmates remember their first performance at a memorial. Write a recollection in which one memory refuses to fit.",
      "A ship’s crew votes on an unplanned stop. Tell us how the decision was remembered after they reached port.",
      "The residents of an apartment building find a piano in the courtyard. Let one person’s idea about its owner change the group’s next move."
    ],
    "icon": "layers"
  },
  {
    "id": "imagery",
    "title": "Image and motif",
    "category": "Voice & style",
    "description": "Let a physical detail do different emotional work on its return.",
    "question": "What makes the room seem occupied in each passage, even after the swimmer leaves?",
    "a": "The wet towel hung from the chair like a second, exhausted swimmer. A pool of light lay beneath it.",
    "b": "After he left, the towel kept dripping. At the next table a girl laid her spelling book just beyond the widening dark.",
    "editor": "A gives the towel a body that can stand in for its owner. B gives the water a consequence for someone else. One image stays with the swimmer; the other passes the scene onward.",
    "exercise": "Choose an image from your draft. Rewrite it once so it echoes the observer’s state and once so it affects somebody else’s action. Keep the physical object the same.",
    "transfer": [
      "In an empty bakery, a blackbird lands on the counter. Write its visit and a second visit after the shop reopens.",
      "A mechanic keeps a bright marble in the cash drawer. Bring it into a scene with a customer who needs a favor.",
      "A child's paper crown survives an argument, a rainstorm, and a move. Write its last appearance without explaining why it matters."
    ],
    "icon": "leaf"
  },
  {
    "id": "causality",
    "title": "Choice and consequence",
    "category": "Novel craft",
    "description": "Give one scene a decision that the next scene has to live with.",
    "question": "Who has to account for the missing letter in each version? What scene might follow?",
    "a": "The envelope slid behind the radiator while Jo sorted the morning post. At noon her brother asked if the solicitor had written.",
    "b": "Jo set the solicitor’s envelope on the radiator and nudged it over the edge. At noon her brother asked if anything had come.",
    "editor": "A prepares a discovery and the chance that an accident will look deliberate. In B the reader already knows Jo acted, so her answer to her brother carries the pressure.",
    "exercise": "Find two consecutive chapters that feel loosely joined. Write the connecting event as an accident, then as a choice someone must conceal or defend. Sketch the next scene each version creates.",
    "transfer": [
      "A café owner gives a stranger the wrong suitcase. Write the moment somebody who could correct the mistake decides what to do.",
      "A student invites an extra guest to a tightly planned dinner. Show how that invitation changes what someone else can say.",
      "A deckhand lets a departing passenger miss the last boat. Carry the story into a second scene where the two must work together."
    ],
    "icon": "compass"
  },
  {
    "id": "register",
    "title": "Diction and register",
    "category": "Voice & style",
    "description": "Hear what a narrator’s vocabulary reveals about loyalty and belonging.",
    "question": "Whose company does this speaker sound accustomed to? Which phrase gives you that impression?",
    "a": "My uncle called it a minor lapse in procedure. For six months afterward he ate his sandwiches in the car park.",
    "b": "Uncle Ray had put his foot in it. For six months afterward he ate his sandwiches in the car park.",
    "editor": "The formal phrase in A feels borrowed from somebody’s defense. B offers a family idiom and puts Ray on first-name terms. Both lead to the same lonely lunch with different loyalties in play.",
    "exercise": "Choose a sentence that reports a failure. Write it in the vocabulary of someone responsible for explaining it and then in the vocabulary of someone who loves the person responsible.",
    "transfer": [
      "A retired nurse has to describe her first dance to a grandson who keeps interrupting. Find the words she uses with him.",
      "A museum guard gives a tour to her old football team. Let us hear when she starts enjoying herself.",
      "Write two postcards from the same holidaymaker on the same day, one to her landlord and one to her oldest friend."
    ],
    "icon": "pen"
  }
];
  const day = 86400000;
  const noteTypes = ['Observation', 'Reading note', 'Question', 'Line of my own'];
  let activeAttempt = null, mode = 'library', filter = 'All', notebookTab = 'commonplace', shelf = 'all';
  const h = value => N.esc(String(value == null ? '' : value));
  const icon = (name, size = 18) => N.icon(name, size);
  const skillFor = id => skills.find(s => s.id === id) || skills[0];
  const getBooks = () => N.state.books || [];
  const attempts = () => N.state.attempts || (N.state.attempts = []);
  const notes = () => N.state.notes || (N.state.notes = []);
  const attempt = id => attempts().find(a => a.id === id);
  const bookFor = id => getBooks().find(b => b.id === id);
  const today = () => new Date().toISOString();
  const due = a => a.status === 'complete' && a.due && Date.parse(a.due) <= Date.now();
  const date = iso => isNaN(Date.parse(iso)) ? '' : new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const textPreview = (txt, max = 180) => { const t = String(txt || '').trim(); return t.length > max ? t.slice(0, max).trimEnd() + '…' : t; };
  const button = (label, action, cls = 'secondary', attrs = '') => '<button type="button" class="btn ' + cls + '" data-pr-act="' + action + '" ' + attrs + '>' + label + '</button>';
  const key = id => 'data-pr-id="' + h(id) + '"';
  const area = (name, label, val, placeholder, rows = 3, required = false) => '<label class="pr-field"><span>' + h(label) + '</span><textarea rows="' + rows + '" name="' + h(name) + '" data-pr-field="' + h(name) + '" placeholder="' + h(placeholder) + '" ' + (required ? 'required' : '') + '>' + h(val) + '</textarea></label>';
  function localAttempts() { return attempts().filter(a => a.bookId === N.state.activeBookId); }
  function rec() {
    const list = localAttempts();
    const open = list.find(a => a.status === 'draft');
    if (open) return {kind:'resume',skillId:open.skillId,attemptId:open.id,title:skillFor(open.skillId).title,reason:'Continue where you left off in this manuscript.'};
    const waiting = attempts().find(a=>a.status==='complete'&&a.returnDraft) || attempts().filter(due).sort((a,b)=>Date.parse(a.due)-Date.parse(b.due))[0];
    if (waiting) return {kind:'transfer',skillId:waiting.skillId,attemptId:waiting.id,title:'Write a fresh scene',reason:waiting.returnDraft?'Continue the independent scene you started.':'A previous experiment is ready for an independent return.'};
    const count = s => list.filter(a=>a.skillId===s.id && a.status==='complete').length;
    const next = skills.slice().sort((a,b)=>count(a)-count(b))[0];
    return {kind:'start',skillId:next.id,title:next.title,reason:count(next) ? 'Return to this choice with a different passage from your book.' : 'Try a new craft choice in a passage from your book.'};
  }
  N.skills = skills;
  N.practiceRecommendation = rec;
  function routePractice() { if (N.state.activeView === 'practice') N.render(); else N.go('practice'); }
  function launch(chapterId, skillId, noteId) {
    const book = N.book(); if (!book) return;
    const s = skillFor(skillId);
    const chapter = book.chapters.find(c=>c.id === (chapterId || book.activeChapterId)) || book.chapters[0];
    const existing = localAttempts().find(a=>a.status==='draft' && a.skillId===s.id && a.chapterId===(chapter?.id || '') && (a.noteId || '')===(noteId || ''));
    let a = existing;
    if (!a) {
      a = {id:N.id(), bookId:book.id, chapterId:chapter?.id || '', skillId:s.id, noteId:noteId || '', status:'draft', stage:0, created:today(), comparison:'', a:'', b:'', reason:'', choice:'A', prediction:'', transfers:[]};
      attempts().unshift(a); N.save();
    }
    activeAttempt = a.id; mode = 'guided'; routePractice();
  }
  N.startTransfer = id => {
    const a = attempt(id); if (!a || a.status !== 'complete') return;
    const s = skillFor(a.skillId);
    if (!a.returnDraft) {
      a.returnDraft = {prompt:s.transfer[(a.transfers || []).length % s.transfer.length], body:'', outcome:'Unaided', started:today()};
      N.save();
    }
    activeAttempt = a.id; mode='transfer'; routePractice();
  };
  N.openPractice = (chapterId, skillId) => {
    if (!skillId && !chapterId) {
      const r = rec(); if (r.kind==='transfer') return N.startTransfer(r.attemptId);
      if (r.kind==='resume') { mode='guided'; activeAttempt=r.attemptId; return routePractice(); }
      return launch(chapterId,r.skillId);
    }
    launch(chapterId,skillId || rec().skillId);
  };
  function backToLibrary() { mode='library'; activeAttempt=null; N.render(); }
  function compare(s) {
    return '<div class="pr-compare"><div><span>Passage A</span><p>'+h(s.a)+'</p></div><div><span>Passage B</span><p>'+h(s.b)+'</p></div></div>';
  }
  function steps(i) {
    return '<ol class="pr-steps" aria-label="Practice progress">'+['Read closely','Write alternatives','Make a choice'].map((v,j)=>'<li'+(i===j?' aria-current="step"':'')+' class="'+(i===j?'current':i>j?'done':'')+'"><b>'+(i>j?'✓':j+1)+'</b>'+v+'</li>').join('')+'</ol>';
  }
  function framing(a) {
    const book = bookFor(a.bookId), ch = book?.chapters.find(c=>c.id===a.chapterId), note=notes().find(n=>n.id===a.noteId);
    let sample = note?.text || ch?.text || '';
    return sample ? '<details class="pr-source"><summary>'+icon('book',16)+' '+h(note ? note.title || note.type : ch.title)+'</summary><p>'+h(textPreview(sample,1100))+'</p></details>' : '';
  }
  function pageHead(kicker,title,lead,action='') {
    return '<header class="view-head pr-head"><div><div class="eyebrow">'+h(kicker)+'</div><h1>'+h(title)+'</h1><p>'+h(lead)+'</p></div>'+action+'</header>';
  }
  function guided(a) {
    const s=skillFor(a.skillId), st=a.stage || 0;
    const back=button('Practice shelf','library','pr-text');
    let body='';
    if(st===0) {
      body='<div class="pr-sectionhead"><h2>Read the two passages</h2></div>'+compare(s)+area('comparison',s.question,a.comparison,'Point to a word, a beat, or a detail that shaped your reading.',3,true);
    } else if(st===1) {
      body='<aside class="pr-editor-note"><strong>One editor’s reading</strong><p>'+h(s.editor)+'</p></aside><div class="pr-sectionhead"><h2>Try the choice in your own prose</h2><p>'+h(s.exercise)+'</p></div>'+framing(a)+'<div class="pr-pair">'+area('a','Your version A',a.a,'Write the first version…',5,true)+area('b','Your version B',a.b,'Try another treatment of the same material…',5,true)+'</div>';
    } else {
      body='<div class="pr-sectionhead"><h2>Choose a version for the book</h2><p>Keep the experiment that serves this scene. You can preserve both in your portfolio.</p></div><div class="pr-choices">'+['A','B'].map(k=>'<label><input type="radio" name="choice" value="'+k+'" data-pr-field="choice" '+(a.choice===k?'checked':'')+'><span><strong>Version '+k+'</strong><em>'+h(textPreview(a[k.toLowerCase()],210))+'</em></span></label>').join('')+'</div>'+area('reason','What makes this choice right here?',a.reason,'What does this version gain, and what does it give up?',2,true)+area('prediction','What do you expect a reader to notice?',a.prediction,'Record the effect you want to test.',2,true);
    }
    return '<div class="pr-page">'+back+pageHead(s.category,s.title,s.description)+steps(st)+'<form class="pr-work panel" data-pr-form="guided">'+body+'<div class="pr-actions">'+(st>0?button('Previous step','prev','secondary'):'<span class="pr-fine">Your responses save as you write.</span>')+'<button class="btn primary" type="submit">'+['Read the annotation','Compare my versions','Save experiment'][st]+'</button></div></form></div>';
  }
  function transfer(a) {
    const r=a.returnDraft;
    const own=r.custom || '';
    return '<div class="pr-page">'+button('Practice shelf','library','pr-text')+pageHead('Independent practice','Write a fresh scene','Try a new situation in your own voice. You can review the earlier experiment after writing.')+'<form class="pr-work panel" data-pr-form="transfer"><div class="pr-brief"><span class="eyebrow">Your prompt</span><p>'+h(r.prompt)+'</p></div><details class="pr-source"'+(own?' open':'')+'><summary>Use my own situation</summary>'+area('custom','Fresh situation',own,'Choose an unfamiliar character, event, or scene from another book.',2)+'</details>'+area('body','Scene',r.body,'Begin the scene…',8,true)+'<label class="pr-field"><span>How did you write it?</span><select name="outcome" data-pr-field="outcome">'+['Unaided','Used a hint or looked back','Would like more practice'].map(k=>'<option'+(r.outcome===k?' selected':'')+'>'+k+'</option>').join('')+'</select></label><div class="pr-actions"><span class="pr-fine">Your own assessment is recorded with the scene.</span><button class="btn primary" type="submit">Save fresh scene</button></div></form></div>';
  }
  function result(a) {
    const s=skillFor(a.skillId), b=bookFor(a.bookId), ch=b?.chapters.find(c=>c.id===a.chapterId);
    return '<div class="pr-page">'+button('Practice shelf','library','pr-text')+pageHead('Portfolio entry',s.title,b?.title || 'Writing experiment')+'<section class="pr-work panel"><div class="pr-sectionhead"><h2>Your two versions</h2></div>'+compare({a:a.a,b:a.b})+'<div class="pr-result-line"><strong>Kept version '+h(a.choice)+'</strong><p>'+h(a.reason)+'</p></div><div class="pr-result-line"><strong>Expected reader response</strong><p>'+h(a.prediction)+'</p></div>'+(a.comparison?'<details class="pr-source"><summary>Original close reading</summary><p>'+h(a.comparison)+'</p></details>':'')+'<div class="pr-actions pr-wrap">'+(ch&&b.id===N.state.activeBookId?button(a.applied?'Open manuscript':'Use in manuscript',a.applied?'manuscript':'apply','primary',key(a.id)):'')+button('Go to portfolio','portfolio','secondary')+'</div></section><section class="pr-return panel"><div><div class="eyebrow">Fresh writing</div><h2>'+((a.transfers||[]).length?'Independent attempts':'Return in a different scene')+'</h2><p>'+((a.transfers||[]).length?'Each scene keeps your own account of the help you used.':'Your suggested return date is '+h(date(a.due))+'. You can try the new scene earlier.')+'</p></div>'+button(a.returnDraft?'Resume fresh scene':due(a)?'Begin fresh scene':'Try a fresh scene now','return','secondary',key(a.id))+'</section>'+(a.transfers||[]).map(t=>'<details class="pr-source"><summary>'+h(date(t.at))+' · '+h(t.outcome)+'</summary><p>'+h(t.prompt)+'</p><p>'+h(t.body)+'</p></details>').join('')+'</div>';
  }
  function libraryView() {
    const r=rec(), list=localAttempts(), books=getBooks(), drafts=list.filter(a=>a.status==='draft');
    const cards=skills.filter(s=>filter==='All'||s.category===filter).map(s=>{
      const done=list.filter(a=>a.status==='complete'&&a.skillId===s.id).length;
      return '<button type="button" class="pr-skill" data-pr-act="start" '+key(s.id)+'><span class="pr-skill-icon">'+icon(s.icon,22)+'</span><span><small>'+h(s.category)+'</small><strong>'+h(s.title)+'</strong><span>'+h(s.description)+'</span>'+(done?'<em>'+done+' saved experiment'+(done===1?'':'s')+'</em>':'')+'</span></button>';
    }).join('');
    return '<div class="pr-page">'+pageHead('Workshop','Craft practice','Study a passage, write two alternatives, and bring the decision back to your manuscript.')+'<section class="pr-feature"><div><div class="eyebrow">Recommended for you</div><h2>'+h(r.title)+'</h2><p>'+h(r.reason)+'</p></div>'+button(r.kind==='resume'?'Resume practice':r.kind==='transfer'?'Begin fresh scene':'Begin practice','recommend','pr-light')+'</section>'+(drafts.length>1?'<div class="pr-sectionhead"><h2>In progress</h2></div><div class="pr-drafts">'+drafts.map(a=>button(h(skillFor(a.skillId).title),'resume','secondary',key(a.id))).join('')+'</div>':'')+'<div class="pr-library-head"><h2>Practice shelf</h2><div class="pr-filters">'+['All','Voice & style','Novel craft'].map(v=>'<button type="button" data-pr-act="filter" '+key(v)+' aria-pressed="'+(filter===v)+'">'+h(v)+'</button>').join('')+'</div></div><div class="pr-skills">'+cards+'</div></div>';
  }
  N.views.practice = () => {
    const a=attempt(activeAttempt);
    if(a && mode==='transfer' && a.returnDraft) return transfer(a);
    if(a && mode==='result') return result(a);
    if(a && mode==='guided' && a.status==='draft' && a.bookId===N.state.activeBookId) return guided(a);
    return libraryView();
  };
  const noteIcons={'Observation':'leaf','Reading note':'book','Question':'compass','Line of my own':'feather'};
  function notebook() {
    const isNotes=notebookTab==='commonplace', b=N.book();
    const visible=isNotes?notes().filter(n=>shelf==='all'||n.bookId===b.id):attempts().filter(a=>a.status==='complete'&&(shelf==='all'||a.bookId===b.id));
    const cards=visible.map(x=>{
      if(isNotes) return '<article class="pr-record panel"><div class="pr-record-head"><span>'+icon(noteIcons[x.type]||'book',17)+' '+h(x.type)+'</span><time>'+h(date(x.updated||x.created))+'</time></div><h3>'+h(x.title || x.type)+'</h3><p>'+h(textPreview(x.text,200))+'</p><div class="pr-record-foot"><small>'+h(x.bookId?(bookFor(x.bookId)?.title||'Archived book'):'Across books')+'</small>'+button('Open note','edit-note','pr-text',key(x.id))+'</div></article>';
      return '<article class="pr-record panel"><div class="pr-record-head"><span>'+icon('feather',17)+' Experiment</span><time>'+h(date(x.completed))+'</time></div><h3>'+h(skillFor(x.skillId).title)+'</h3><p>'+h(textPreview(x.reason,170))+'</p><div class="pr-record-foot"><small>'+h(bookFor(x.bookId)?.title||'Archived book')+'</small>'+button('View entry','result','pr-text',key(x.id))+'</div></article>';
    }).join('');
    return '<div class="pr-page">'+pageHead('Across your books','Writer’s notebook','Collect material worth returning to and keep a record of the craft choices you have tried.',button(icon('plus',17)+' Add a note','new-note','primary'))+'<div class="pr-notebook-toolbar"><div class="pr-tabs">'+[['commonplace','Commonplace'],['portfolio','Practice portfolio']].map(([id,title])=>'<button data-pr-act="tab" '+key(id)+' aria-pressed="'+(id===notebookTab)+'">'+title+'</button>').join('')+'</div><label class="pr-shelf"><span class="pr-sr">Filter notebook</span><select data-pr-shelf><option value="all" '+(shelf==='all'?'selected':'')+'>All books</option><option value="book" '+(shelf==='book'?'selected':'')+'>Current book</option></select></label></div>'+(cards?'<div class="pr-records">'+cards+'</div>':'<section class="pr-empty panel">'+icon(isNotes?'book':'feather',28)+'<h2>'+(isNotes?'Start a commonplace book':'Your experiments will live here')+'</h2><p>'+(isNotes?'Keep an overheard phrase, a passage you admire, or a question that might grow into a scene.':'Complete a craft practice to save your alternatives, reasoning, and later independent scenes.')+'</p>'+button(isNotes?'Write the first note':'Explore craft practice',isNotes?'new-note':'browse','secondary')+'</section>')+'</div>';
  }
  N.views.notebook=notebook;
  function openNote(id) {
    const n=notes().find(x=>x.id===id), b=N.book(); if(!b)return;
    const opt=(v,t,on)=>'<option value="'+h(v)+'"'+(on?' selected':'')+'>'+h(t)+'</option>';
    const body='<form id="pr-note-form" data-pr-form="note" '+(n?key(n.id):'')+'><div class="pr-modal-grid"><label class="pr-field"><span>Kind of note</span><select name="type">'+noteTypes.map(t=>opt(t,t,n?.type===t)).join('')+'</select></label><label class="pr-field"><span>Notebook</span><select name="bookId">'+opt('','Across books',!n?.bookId)+getBooks().map(v=>opt(v.id,v.title,n?.bookId===v.id)).join('')+'</select></label></div><label class="pr-field"><span>Title</span><input name="title" required value="'+h(n?.title)+'" placeholder="Give the idea a name"></label>'+area('text','Note',n?.text,'What caught your attention?',5,true)+'<label class="pr-field"><span>Source <small>(optional)</small></span><input name="source" value="'+h(n?.source)+'" placeholder="A book, conversation, walk, or scene"></label></form>';
    const footer=(n?button('Use in practice','from-note','secondary',key(n.id)):'')+button('Cancel','close','secondary')+'<button class="btn primary" type="submit" form="pr-note-form">Save note</button>';
    N.modal(n?'Commonplace note':'Add a note',body,footer);
  }
  function selectSkill(n) {
    const body='<form id="pr-note-practice" data-pr-form="from-note" '+key(n.id)+'><p class="pr-modal-copy">Use “'+h(n.title)+'” as the starting material for your next experiment.</p><label class="pr-field"><span>Craft decision</span><select name="skill">'+skills.map(s=>'<option value="'+h(s.id)+'">'+h(s.title)+'</option>').join('')+'</select></label></form>';
    N.modal('Practice from a note',body,button('Cancel','close','secondary')+'<button class="btn primary" type="submit" form="pr-note-practice">Start practice</button>');
  }
  function applyDialog(a) {
    const b=bookFor(a.bookId),ch=b?.chapters.find(c=>c.id===a.chapterId);
    if(!ch || b.id!==N.state.activeBookId) return;
    N.modal('Use in manuscript','<div class="pr-modal-copy"><p>Append version '+h(a.choice)+' to the end of “'+h(ch.title)+'” as a new paragraph. The existing chapter stays intact.</p><blockquote>'+h(textPreview(a[a.choice.toLowerCase()],850))+'</blockquote></div>',button('Cancel','close','secondary')+button('Append paragraph','confirm-apply','primary',key(a.id)));
  }
  function saveNote(form) {
    if(!form.reportValidity()) return;
    const data=new FormData(form); const values={type:data.get('type'),bookId:data.get('bookId')||'',title:String(data.get('title')||'').trim(),text:String(data.get('text')||'').trim(),source:String(data.get('source')||'').trim(),updated:today()};
    if(!values.title||!values.text){N.toast('Add a title and a note.');return;}
    let n=notes().find(x=>x.id===form.dataset.prId);
    if(n) Object.assign(n,values); else {n=Object.assign({id:N.id(),created:today()},values);notes().unshift(n);}
    N.save(); return n;
  }
  document.addEventListener('input',event=>{
    const t=event.target, field=t.dataset.prField, form=t.closest('form[data-pr-form]'); if(!field || !form)return;
    const a=attempt(activeAttempt); if(!a)return;
    if(form.dataset.prForm==='guided'&&a.status==='draft') {a[field]=t.value;N.save();}
    if(form.dataset.prForm==='transfer'&&a.returnDraft) {a.returnDraft[field]=t.value;N.save();}
  });
  document.addEventListener('change',event=>{
    if(event.target.matches('[data-pr-shelf]')){shelf=event.target.value;N.render();}
  });
  document.addEventListener('submit',event=>{
    const form=event.target.closest('form[data-pr-form]'); if(!form)return;
    event.preventDefault();const kind=form.dataset.prForm, a=attempt(activeAttempt), data=new FormData(form);
    if(kind==='note'){const n=saveNote(form);if(n){N.closeModal();N.render();N.toast('Note saved.');}return;}
    if(kind==='from-note'){const n=notes().find(x=>x.id===form.dataset.prId); if(n){N.closeModal();launch(null,data.get('skill'),n.id);}return;}
    if(!a||!form.reportValidity())return;
    if(kind==='guided'&&a.status==='draft'){
      for(const [k,v] of data) a[k]=String(v).trim();
      const needed=[['comparison'],['a','b'],['reason','prediction']][a.stage || 0];
      if(needed.some(x=>!a[x])) {N.toast('Write a response in each field to continue.');return;}
      if(a.stage<2) a.stage++;
      else {a.status='complete';a.completed=today();a.due=new Date(Date.now()+day*7).toISOString();mode='result';N.toast('Experiment saved to your portfolio.');}
      N.save();N.render();scrollContent();
    }
    if(kind==='transfer'&&a.returnDraft){
      const body=String(data.get('body')||'').trim();if(!body) {N.toast('Write your scene before saving.');return;}
      const outcome=String(data.get('outcome')||'Unaided'), gap=Math.max(0,Math.floor((Date.now()-Date.parse(a.transfers?.[0]?.at || a.completed))/day));
      (a.transfers||(a.transfers=[])).unshift({at:today(),prompt:String(data.get('custom')||'').trim()||a.returnDraft.prompt,body,outcome,gapDays:gap});
      a.due=new Date(Date.now()+day*(outcome==='Unaided'?Math.min(60,14*a.transfers.length):3)).toISOString();
      delete a.returnDraft;mode='result';N.save();N.render();scrollContent();N.toast('Independent scene saved.');
    }
  });
  function scrollContent() {
    const el=document.querySelector('#main');el?.scrollTo?.(0,0);window.scrollTo?.(0,0);
  }
  document.addEventListener('click',event=>{
    const el=event.target.closest('[data-pr-act]'); if(!el)return;
    const act=el.dataset.prAct,id=el.dataset.prId,a=attempt(id || activeAttempt);
    if(act==='library')backToLibrary();
    else if(act==='filter'){filter=id;N.render();}
    else if(act==='recommend')N.openPractice();
    else if(act==='start')launch(null,id);
    else if(act==='resume'&&a){activeAttempt=a.id;mode='guided';routePractice();}
    else if(act==='prev'&&a&&a.stage>0){a.stage--;N.save();N.render();scrollContent();}
    else if(act==='return')N.startTransfer(id);
    else if(act==='apply'&&a)applyDialog(a);
    else if(act==='confirm-apply'&&a){
      const b=bookFor(a.bookId),ch=b?.chapters.find(c=>c.id===a.chapterId);
      if(!ch || a.applied)return;
      ch.text=(String(ch.text||'').trimEnd()+(ch.text?'\n\n':''))+a[a.choice.toLowerCase()];a.applied=today();N.save();N.closeModal();N.render();N.toast('Paragraph added to the chapter.');
    }
    else if(act==='manuscript'&&a){const b=bookFor(a.bookId);if(b){b.activeChapterId=a.chapterId;N.save();N.go('editor');}}
    else if(act==='portfolio'){notebookTab='portfolio';N.go('notebook');}
    else if(act==='result'&&a){activeAttempt=a.id;mode='result';routePractice();}
    else if(act==='browse'){mode='library';N.go('practice');}
    else if(act==='tab'){notebookTab=id;N.render();}
    else if(act==='new-note')openNote();
    else if(act==='edit-note')openNote(id);
    else if(act==='from-note'){const form=document.getElementById('pr-note-form');const n=form&&saveNote(form);if(n)selectSkill(n);}
    else if(act==='close')N.closeModal();
  });
})();

