
(() => {
  "use strict";
  const D = window.Diction;
  const tracks = ["Attribution", "Movement", "Uncertainty"];
  const day = 86400000;
  // All briefs and comparisons are original editorial exercises.
  const briefs = {
    Attribution: [
      ["The June opening", "At a public meeting, the transit director announces that the footbridge will open in June. The published schedule listed April. This is the first public update. Write the opening of a short local news story.", "The director said the bridge would open in June.", "The director conceded the bridge would open in June.", "Said reports the announcement. Conceded suggests a point yielded under pressure. The notes establish a delay, but give no account of a dispute."],
      ["An unfinished portrait", "A museum label dates a portrait to 1890. In an interview, a conservator says a newly found letter puts it a decade later. The museum has yet to review the letter. Introduce the discovery for a general reader.", "The conservator dates the portrait to 1900.", "The letter settles the date of the portrait.", "The first sentence attributes an assessment. Settles puts the narrator behind a conclusion that the museum has yet to consider."],
      ["After the final whistle", "A captain tells a local reporter that the squad practiced penalties on Tuesday. Asked why it lost, the captain says the goalkeeper anticipated their shots. Write the first two sentences of a match report.", "The captain credited the goalkeeper’s anticipation.", "The captain blamed the goalkeeper’s anticipation.", "Credited recognizes an opponent’s skill. Blamed can make the speaker sound defensive. Check the interview notes before assigning that attitude."],
      ["The evening route", "At a hearing, a bus operator says the last service regularly leaves before her shift ends. Timetables confirm the departure time. Officials have agreed to review the route. Write for commuters reading tomorrow’s news.", "The operator described the gap in service.", "The operator denounced the gap in service.", "Described reports what the operator did. Denounced adds force and public condemnation. Details of her words or delivery would support that stronger account."],
      ["One missing page", "An archivist opens a donated diary and finds that the entry for May 8 is missing. Its owner says it was missing when she received it. Write two sentences for the opening of a reported essay.", "The owner said the page was already missing.", "The owner insisted the page was already missing.", "Insisted can suggest someone challenged the owner. Decide whether the scene supplies that pressure or whether the missing page creates enough tension on its own."]
    ],
    Movement: [
      ["The station doors", "At closing time, a porter guides a tall crate through a narrow station door. He turns it twice and pauses when a corner catches. The platform is empty. Let someone who cannot see the scene picture it in two sentences.", "The porter eased the crate through the door.", "The porter heaved the crate through the door.", "Eased directs attention to control. Heaved emphasizes effort. A sentence about the catching corner might do more for the reader than a stronger verb."],
      ["Water on the sill", "In an empty kitchen, water gathers at a cracked window frame. It traces a thin line down the wall. Describe the first thing a visitor notices as she steps inside.", "Water threaded down the plaster.", "Water poured down the plaster.", "Threaded suggests a narrow path. Poured makes the volume feel larger. The thin line gives the reader a way to judge the image."],
      ["The last chair", "A stagehand crosses a bare stage with a folding chair. One rubber foot drags against the boards. From the back row, the noise is audible between two piano notes. Write the moment from the back row.", "One foot scraped across the boards.", "One foot struck the boards.", "Scraped lets the sound continue through the crossing. Struck makes it a single impact. The pace of the surrounding sentence can reinforce either sound."],
      ["Out in the tide", "A loose rowing boat moves away from a pier. Its oars lie on the seats. The water is almost flat. Describe the moment for a reader standing on shore.", "The boat drifted beyond the pier.", "The boat cut away from the pier.", "Drifted leaves propulsion to the water. Cut gives the movement direction and energy. Consider whether the reader should imagine an unseen rower."],
      ["The stalled lift", "A mechanic frees a jammed lift. A steel cable starts to tighten, the cab rises a hand’s breadth, then the lights go out. Write the moment as seen from the landing.", "The cab inched up.", "The cab sprang up.", "Inched invites the reader to watch a small advance. Sprang compresses time and suggests stored force. The observed distance alone could fit either pace."]
    ],
    Uncertainty: [
      ["The orchard trial", "A grower mulched half an orchard. This spring those trees flowered four days earlier than the others. The mulched side also gets more sun. Write a brief item for a gardening column.", "The mulched trees flowered earlier.", "Mulching brought the trees into flower earlier.", "The first sentence describes timing. The second attributes the difference to mulch. Sun exposure offers another explanation that matters to a gardener."],
      ["Night calls", "A biologist recorded owls calling on six nights this month, twice as many nights as last month. This month the recorder ran for twice as many hours. Write a caption for a wildlife newsletter.", "The recorder picked up calls on more nights.", "More owls have moved into the woods.", "The first claim stays close to what the recorder captured. The second introduces new birds. Longer recording time could account for the additional nights."],
      ["The early queue", "A bakery placed benches outside on Monday. Three customers interviewed on Friday say they like them. The owner has not counted sales or visitors. Write a dispatch for a neighborhood paper.", "Three customers welcomed the benches.", "The benches have won over the neighborhood.", "Three conversations support a limited observation. A claim about the neighborhood asks those voices to stand for a larger group."],
      ["The quiet corridor", "After soft flooring goes into one hospital corridor, a nurse says the evening rounds seem quieter. No sound measurements have been taken. Write a short paragraph for a design magazine.", "To the evening nurse, rounds sound quieter.", "The flooring reduces noise during rounds.", "The nurse supplies a perception. A claim about what the flooring does needs a comparison that isolates its effect."],
      ["The rooftop count", "Volunteers counted 42 butterflies on a planted roof, compared with 30 last year. This year four people counted for an afternoon. Last year two people counted for an hour. Write a short update for the building’s residents.", "Volunteers recorded more butterflies this year.", "The butterfly population has grown.", "A count describes sightings. Inferring population growth depends in part on comparable observation time and effort."]
    ]
  };
  const routes = {
    recall: ["Find the word", "I knew the effect I wanted but struggled to summon the wording."],
    reader: ["Hear the implication", "I found the words but am unsure what a reader will infer."],
    transfer: ["Try a fresh brief", "I can explain the choice. I want to see if I notice it while drafting."]
  };
  const html = value => D.esc(String(value ?? ""));
  const indexFor = (track, advance = 0, avoid = -1) => {
    const collection=briefs[track], history=D.state.sessions.filter(s=>s.track===track);
    const lastSeen=Array(collection.length).fill(-1);
    for(const s of history){
      for(const label of [s.brief,s.newBrief]){
        const i=collection.findIndex(b=>b[0]===label);
        if(i>=0) lastSeen[i]=Math.max(lastSeen[i],Date.parse(s.date)||0);
      }
    }
    const start=(history.length+advance)%collection.length;
    const order=collection.map((_,i)=>(i+start)%collection.length).filter(i=>i!==avoid);
    return order.reduce((best,i)=>lastSeen[i]<lastSeen[best]?i:best,order[0]);
  };
  const uid = () => window.crypto?.randomUUID?.() || "session-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
  const dateText = iso => new Date(iso).toLocaleDateString(undefined, {month:"short", day:"numeric"});
  let lastPulse = 0;
  let scene;
  function pulse(d) {
    const now = Date.now();
    if (lastPulse && !document.hidden) d.activeMs = (d.activeMs || 0) + Math.min(Math.max(0, now - lastPulse), 60000);
    lastPulse = now;
  }
  function start(options) {
    const drafts = D.state.drafts;
    const source = options.transfer ? (D.state.sessions.find(s => s.id === options.sourceId) || D.state.sessions.filter(s => !s.transfer && !s.followUpComplete && (!options.track || options.track === s.track)).slice().sort((a,b) => String(a.followUpDue).localeCompare(String(b.followUpDue)))[0]) : null;
    const old = drafts.practice;
    if(options.draftId && old?.id!==options.draftId){
      const stored=Object.values(drafts.practiceShelf||{}).find(d=>d.id===options.draftId);
      if(stored){
        delete drafts.practiceShelf[stored.key];
        if(old)drafts.practiceShelf[old.key]=old;
        drafts.practice=stored;D.save();return stored;
      }
    }
    if (old && !options.transfer && !options.track && !options.own) return old;
    const track = tracks.includes(options.track) ? options.track : tracks.includes(source?.track) ? source.track : tracks[D.state.sessions.length % tracks.length];
    const key = (options.transfer ? "follow:" + (source?.id || track) : (options.own ? "own:" : "brief:") + track);
    if (old?.key === key) return old;
    drafts.practiceShelf ||= {};
    if (old) drafts.practiceShelf[old.key] = old;
    const d = drafts.practiceShelf[key] || {
      id:uid(), key, track, isFollowUp:!!options.transfer, basedOn:source?.id || null, own:!!options.own,
      brief:indexFor(track, options.transfer ? 2 : 0, source?.briefIndex ?? -1), step:"draft", original:"", intent:"", activeMs:0, created:Date.now()
    };
    delete drafts.practiceShelf[key];
    drafts.practice = d; D.save();
    return d;
  }
  function frame(d,title,subtitle,inner,step) {
    const names = d.isFollowUp ? ["Write","Review"] : ["Write","Reflect","Practice","Revise"];
    const status = d.isFollowUp ? "Independent follow-up" : "Writing practice";
    D.root.innerHTML = '<section class="practice-page">' +
      '<div class="practice-top"><button type="button" class="back" data-exit>Back to studio</button><span class="practice-step-count">Step ' + (step+1) + ' of ' + names.length + '</span></div>' +
      '<header class="pagehead"><p class="eyebrow">' + html(status) + '</p><h1 tabindex="-1">' + html(title) + '</h1><p class="muted">' + html(subtitle) + '</p></header>' +
      '<ol class="practice-steps" aria-label="Session steps">' + names.map((n,i) => '<li class="'+(i<=step?'on':'')+'"'+(i===step?' aria-current="step"':'')+'>'+n+'</li>').join("") + '</ol>' +
      inner + '</section>';
    scene = D.root.querySelector(".practice-page");
    scene.querySelector("[data-exit]").onclick = () => {pulse(d);D.save();D.go("home");};
    scene.querySelectorAll("[data-key]").forEach(el => {
      el.addEventListener("input", () => {
        pulse(d);
        if (!d.firstInputAt && el.dataset.key === "original" && el.value.trim()) d.firstInputAt = Date.now();
        d[el.dataset.key] = el.value;
        if(el.dataset.key==="answer"){
          const changeCue=scene.querySelector("[data-change-cue]");
          if(changeCue)changeCue.hidden=!!el.value.trim();
        }
        D.save();
      });
    });
    const form = scene.querySelector("form");
    form?.addEventListener("submit",e => {
      e.preventDefault();
      for (const el of form.querySelectorAll("[required]")) {
        if (typeof el.value === "string" && !el.value.trim()) {el.setCustomValidity("Enter a response to continue."); el.reportValidity(); el.setCustomValidity(""); return;}
      }
      pulse(d); advance(d);
    });
    scene.querySelector("[data-back]")?.addEventListener("click",() => {
      pulse(d);
      d.step = d.step === "reflect" || d.isFollowUp ? "draft" : d.step === "exercise" ? "reflect" : "exercise";
      D.save(); show(d,true);
    });
  }
  const field = (d,key,label,opts={}) => '<div class="field"><label class="field-label" for="practice-'+key+'">'+html(label)+'</label><textarea id="practice-'+key+'" rows="'+(opts.rows||3)+'" data-key="'+key+'" maxlength="12000"'
    +(opts.optional?'':' required')+(opts.hint?' placeholder="'+html(opts.hint)+'"':'')+'>'+html(d[key])+'</textarea></div>';
  const actions = (caption,back=true) => '<div class="actions">'+(back?'<button type="button" data-back class="secondary">Back</button>':'')+'<button type="submit" class="primary">'+html(caption)+'</button></div>';
  function box(title,body) {return '<aside class="practice-brief"><p class="eyebrow">Writing brief</p><h2>'+html(title)+'</h2><p>'+html(body)+'</p></aside>';}
  function original(d) {return '<details class="practice-original"><summary>Your original passage</summary><blockquote>'+html(d.original)+'</blockquote><p class="muted">Intended effect · '+html(d.intent)+'</p></details>';}
  function draft(d) {
    const b=briefs[d.track][d.brief];
    const prompt=d.own ? box("Your own passage","Choose a short passage you are working on. Include only text you want to keep in this browser.") : box(b[0],b[1]);
    const source = D.state.sessions.find(s=>s.id===d.basedOn);
    const foot= d.isFollowUp && source ? '<p class="practice-small">Follow-up to your session on '+html(dateText(source.date))+'. Scheduled for '+html(dateText(source.followUpDue))+'.</p>':'';
    frame(d,d.isFollowUp?"Write independently.":d.own?"Bring a passage.":"Begin with a paragraph.",d.isFollowUp?"Write a fresh response unaided. You can review the earlier work once you finish.":"What should your reader take away? Jot down your intention, then write the passage.",
      '<div class="practice-layout"><div>'+prompt+(!d.isFollowUp?'<button type="button" class="practice-switch" data-toggle>'+ (d.own?'Use a studio brief':'Use my own passage')+'</button>':'')+foot+'</div><form class="panel practice-form">'+
      field(d,"intent","What should the reader take away?",{rows:2,hint:"Name the impression or feeling you want to leave."})+
      field(d,"original",d.own?"Your passage":"Your first draft",{rows:7,hint:"Write in your own voice…"})+
      actions(d.isFollowUp?"Review my passage":"Reflect on my draft",false)+'</form></div>',0);
    scene.querySelector("[data-toggle]")?.addEventListener("click",()=>{
      pulse(d);
      const next = start({track:d.track,own:!d.own});
      show(next,true);
    });
  }
  function reflect(d) {
    const questions = {
      Attribution: [[/\b(conced(?:e|ed)|admit(?:ted)?|confess(?:ed)?|insist(?:ed)?|claim(?:ed)?)\b/i,"What does this verb imply about the speaker’s attitude, and where does the passage establish it?"]],
      Movement: [[/\b(rush(?:ed)?|push(?:ed)?|drag(?:ged)?|ease[d]?|thread(?:ed)?|slip(?:ped)?)\b/i,"What pace or force will a reader picture from this verb?"]],
      Uncertainty: [[/\b(prov(?:e|es|ed)|caus(?:e|es|ed)|definitely|always|clearly|may|might|suggest(?:s|ed)?)\b/i,"How certain does this make the finding sound? What evidence can the reader examine?"]]
    };
    const match = questions[d.track].map(([rx,q]) => [d.original.match(rx),q]).find(([m])=>m);
    const lens = match ? '<div class="practice-lens"><p class="eyebrow">A word to examine</p><strong>“'+html(match[0][0])+'”</strong><p>'+html(match[1])+'</p></div>':'';
    frame(d,"What held you up?","Reread your first version and choose the skill you want to work on.",
      '<div class="practice-layout"><aside class="practice-brief"><p class="eyebrow">Your first draft</p><blockquote>'+html(d.original)+'</blockquote><p class="practice-small">'+html(d.intent)+'</p>'+lens+'</aside><form class="panel practice-form"><fieldset><legend class="field-label">Choose a practice route</legend>'+
      Object.entries(routes).map(([k,[a,c]])=>'<label class="practice-choice"><input type="radio" name="route" value="'+k+'" required '+(d.route===k?'checked':'')+'><span><strong>'+a+'</strong><span>'+c+'</span></span></label>').join("")+'</fieldset>'+actions("Start my exercise")+'</form></div>',1);
    scene.querySelectorAll('input[name="route"]').forEach(el=>el.onchange=()=>{d.route=el.value; D.save();});
  }
  function wordFor(d) {
    if (d.wordId) {const current=D.words.find(w=>w.id===d.wordId); if(current)return current;}
    const words=D.words.filter(w=>w.track===d.track);
    const pool=words.length?words:D.words;
    return pool[D.state.sessions.filter(s=>s.route==="recall"&&s.track===d.track).length%pool.length];
  }
  function exercise(d) {
    const b=briefs[d.track][d.brief];
    let title,sub,aside,body,caption;
    if(d.route==="recall") {
      const w=wordFor(d);
      if (!w) {d.route="reader";D.save();return exercise(d);}
      d.wordId=w.id;
      title="Find the wording.";sub="Read the cue. Try a word or phrase from memory before revealing the study note.";
      aside='<aside class="practice-brief"><p class="eyebrow">'+html(d.track)+' · Recall cue</p><h2>'+html(w.prompt || w.sense)+'</h2></aside>';
      if(!d.revealed&&!d.answer&&!d.hinted) aside+='<button class="practice-switch" type="button" data-change-cue>Try a different cue</button>';
      if(!d.revealed) {
        body=field(d,"answer","What comes to mind?",{optional:true,hint:"Enter a word or leave blank if nothing comes to mind."})+
          (d.hinted?'<p class="notice">Hint · '+html(w.hint || w.pattern)+'</p>':'<button type="button" class="practice-switch" data-hint>Show a hint</button>');
        caption="Reveal study note";
      } else {
        body='<p class="eyebrow">Study note</p><h2>'+html(w.word)+'</h2><p>'+html(w.sense)+'</p><blockquote>'+html(w.example)+'</blockquote><p>'+html(w.contrast)+'</p>'+
          '<p class="practice-small">Your attempt · '+html(d.answer?.trim() || "No word recalled")+'</p>'+
          '<label class="field-label" for="practice-rating">How did recall go?</label><select required id="practice-rating" data-key="rating"><option value="">Choose an outcome</option>'+
          [["miss","I need to learn this sense"],["hard","I needed help or recalled another fitting word"],["good","I recalled this word unaided"]].filter(([k])=>k!=="good"||(!d.hinted && d.answer?.trim())).map(([k,v])=>'<option value="'+k+'" '+(d.rating===k?'selected':'')+'>'+v+'</option>').join("")+'</select>';
        caption="Return to my passage";
      }
    } else if(d.route==="reader") {
      title="Read for implication.";sub="Compare two versions of the same moment. Predict what changes for a reader.";
      aside='<aside class="practice-brief"><p class="eyebrow">'+(d.own?"Practice comparison":"From the brief")+'</p><h2>'+html(b[0])+'</h2><p>'+html(b[1])+'</p></aside>';
      body='<div class="practice-pair"><div><span>Version A</span><p>'+html(b[2])+'</p></div><div><span>Version B</span><p>'+html(b[3])+'</p></div></div>';
      if(!d.revealed) {body+=field(d,"prediction","What might a reader infer from each?",{rows:4}); caption="Compare interpretations";}
      else {body+='<p class="eyebrow">Editorial interpretation</p><p>'+html(b[4])+'</p><details class="practice-original"><summary>Your prediction</summary><p>'+html(d.prediction)+'</p></details>';caption="Return to my passage";}
    } else {
      title="Try a different brief.";sub="Apply your judgment to a new assignment. Write the passage as you would for publication.";
      d.secondBrief ??= indexFor(d.track,2,d.brief);
      const next=briefs[d.track][d.secondBrief];
      aside=box(next[0],next[1]);
      body=field(d,"newPassage","Your new passage",{rows:7,hint:"Write a fresh passage…"});
      caption="Review my choices";
    }
    frame(d,title,sub,'<div class="practice-layout"><div>'+aside+'</div><form class="panel practice-form">'+body+actions(caption)+'</form></div>',2);
    scene.querySelector("[data-hint]")?.addEventListener("click",()=>{pulse(d);d.hinted=true;D.save();show(d);});
    scene.querySelector("[data-change-cue]")?.addEventListener("click",()=>{
      if(d.answer?.trim()) return;
      const pool=D.words.filter(w=>w.track===d.track), i=pool.findIndex(w=>w.id===d.wordId);
      if(pool.length){pulse(d);d.wordId=pool[(i+1)%pool.length].id;D.save();show(d);}
    });
  }
  function revise(d) {
    if(d.revision==null)d.revision=d.original;
    const b=briefs[d.track][d.brief];
    const side=d.isFollowUp?'<aside class="practice-brief"><p class="eyebrow">Editorial lens</p><h2>'+html(b[0])+'</h2><p>'+html(b[4])+'</p></aside>':d.route==="transfer"?'<aside class="practice-brief"><p class="eyebrow">Your second passage</p><blockquote>'+html(d.newPassage)+'</blockquote></aside>':box(d.own?"Your intended effect":b[0],d.own?d.intent:b[1]);
    frame(d,d.isFollowUp?"Review the result.":"Make your revision.","Read your original through a reader’s eyes. Keep a choice that already serves your purpose.",
      '<div class="practice-layout"><div>'+side+original(d)+'</div><form class="panel practice-form">'+
      field(d,"revision","Final version",{rows:6})+field(d,"reason","Which choice did you keep or change, and why?",{rows:3})+
      (d.route==="reader"?field(d,"ownPrediction","What do you predict a reader will infer from your final version?",{rows:2}):'')+
      field(d,"readerReaction","A reader’s response to this version (optional)",{optional:true,rows:2,hint:"Paste their words, or add them later in Progress."})+
      actions("Save session")+'</form></div>',d.isFollowUp?1:3);
  }
  function advance(d) {
    if(d.step==="draft") d.step=d.isFollowUp?"revise":"reflect";
    else if(d.step==="reflect") {
      if(d.practicedRoute!==d.route){d.revealed=false;d.practicedRoute=d.route;}
      d.step="exercise";
    } else if(d.step==="exercise") {
      if(d.route!=="transfer"&&!d.revealed)d.revealed=true;else d.step="revise";
    } else if(d.step==="revise") return finish(d);
    D.save(); show(d,true);
  }
  function finish(d) {
    const now=Date.now(), date=new Date(now).toISOString();
    const previous=D.state.sessions.find(s=>s.id===d.basedOn);
    const record={
      id:d.id,date,track:d.track,briefIndex:d.brief,brief:d.own?"Own passage":briefs[d.track][d.brief][0],
      route:d.isFollowUp?"follow-up":d.route,original:d.original.trim(),intent:d.intent.trim(),revision:d.revision.trim(),
      reason:d.reason?.trim() || "",readerReaction:d.readerReaction?.trim() || "",readerPrediction:d.ownPrediction?.trim() || "",comparisonPrediction:d.prediction?.trim() || "",
      minutes:Math.round(d.activeMs/6000)/10,activeMs:d.activeMs,transfer:d.isFollowUp,usedLookup:!!d.usedLookup,
      basedOn:d.basedOn || null,followUpComplete:false,followUpDue:d.isFollowUp?null:new Date(now+7*day).toISOString(),
      elapsedSinceOriginalDays:previous?Math.round((now-Date.parse(previous.date))/day*10)/10:null
    };
    if(d.route==="recall"){
      record.wordId=d.wordId;record.recallOutcome=d.rating;record.attempt=d.answer?.trim()||"";record.usedHint=!!d.hinted;
      const grade={good:"recalled",hard:"partial",miss:"missed"}[d.rating]||"missed";
      D.recordRecall({id:d.wordId,word:wordFor(d).word,grade,answer:record.attempt,assisted:record.usedHint||!record.attempt,fromStudy:false});
    }
    if(d.route==="transfer"){record.newPassage=d.newPassage?.trim();record.newBrief=briefs[d.track][d.secondBrief][0];}
    record.previouslyUsedBrief=record.brief!=="Own passage"&&D.state.sessions.some(s=>s.brief===record.brief||s.newBrief===record.brief);
    if(!D.state.sessions.some(s=>s.id===record.id))D.state.sessions.push(record);
    if(previous)previous.followUpComplete=true;
    delete D.state.drafts.practice;
    delete D.state.drafts.practiceShelf?.[d.key];
    const parked=Object.values(D.state.drafts.practiceShelf||{}).sort((a,b)=>b.created-a.created)[0];
    if(parked){D.state.drafts.practice=parked;delete D.state.drafts.practiceShelf[parked.key];}
    D.save(); complete(record);
  }
  function complete(s){
    D.root.innerHTML='<section class="practice-page"><header class="pagehead"><p class="eyebrow">'+html(s.track)+' · Session complete</p><h1 tabindex="-1">Passage saved.</h1><p class="muted">'+(s.transfer?'Your independent sample is ready to compare with your earlier work.':'Revisit this skill with a fresh, unaided brief on '+html(dateText(s.followUpDue))+'.')+'</p></header><div class="panel practice-result"><p class="eyebrow">Your final version</p><blockquote>'+html(s.revision)+'</blockquote><p>'+html(s.reason)+'</p><div class="actions"><button type="button" class="primary" data-progress>View progress</button><button type="button" class="secondary" data-home>Back to studio</button></div></div></section>';
    D.root.querySelector("[data-progress]").onclick=()=>D.go("progress");
    D.root.querySelector("[data-home]").onclick=()=>D.go("home");
    D.root.querySelector("h1").focus();
  }
  function show(d,focus=false){
    const fn={draft,reflect,exercise,revise}[d.step]||draft;
    fn(d);
    if(focus){scene.querySelector("h1").focus({preventScroll:true});window.scrollTo(0,0);}
  }
  D.practiceTitle=d=>d.own?'Your own passage':briefs[d.track]?.[d.brief]?.[0]||'Your writing draft';
  D.practice=(options={})=>{lastPulse=Date.now();show(start(options||{}));};
})();

