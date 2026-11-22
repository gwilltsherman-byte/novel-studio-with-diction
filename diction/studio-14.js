
(() => {
  'use strict';
  const D=window.Diction, e=D.esc, day=86400000, sessionLimit=6;
  const data=()=> D.state.packs ||= {custom:[], enrolled:{}, active:{}, journal:[], newLog:[], dailyLimit:3};
  const all=()=>[...(D.packCatalog||[]),...data().custom];
  const get=id=>id ? D.packCatalog?.find(p=>p.id===id)||data().custom.find(p=>p.id===id)||D.packGenerator?.get(id) : null;
  const uid=prefix=>prefix+'-'+(window.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10));
  const fieldsFor=entry=>typeof entry==='string'?D.words.find(w=>w.id===entry):entry;
  const entries=p=>(p.entries||[]).map(fieldsFor).filter(Boolean);
  const write=(html)=>{D.root.innerHTML='<section class="pk-view">'+html+'</section>';};
  const q=s=>D.root.querySelector(s);
  const listen=(selector,fn,event='click')=>q(selector)?.addEventListener(event,fn);
  const many=(selector,fn)=>D.root.querySelectorAll(selector).forEach(el=>el.addEventListener('click',()=>fn(el.dataset.value)));
  const btn=(id,label,cls='secondary')=>'<button type="button" class="'+cls+'" id="'+id+'">'+e(label)+'</button>';
  const top=(small,title,desc='')=>'<header class="pagehead"><span class="eyebrow">'+e(small)+'</span><h1>'+e(title)+'</h1>'+(desc?'<p>'+e(desc)+'</p>':'')+'</header>';
  const field=(k,label,val='',long=false,required=false)=>'<label class="pk-field"><span>'+e(label)+'</span><'+(long?'textarea rows="3"':'input type="text"')+' name="'+k+'" maxlength="'+(long?6000:140)+'"'+(required?' required':'')+(long?'>'+e(val)+'</textarea>':' value="'+e(val)+'">')+'</label>';
  const value=(form,k)=>form.elements.namedItem(k)?.value.trim()||'';
  const when=t=>new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric'});
  const isCustom=p=>data().custom.includes(p);
  const localDay=t=>{const date=new Date(t);return [date.getFullYear(),date.getMonth()+1,date.getDate()].join('-');};
  const record=id=>D.state.reviews[id];
  const seen=id=>!!(record(id)?.lastReviewed || record(id)?.coachAt || (record(id)?.level||0)>0);
  const due=w=>record(w.id)?.due&&Date.parse(record(w.id).due)<=Date.now();
  const go=(p,opts={})=>D.go('packs',p?{id:p.id,...lastBrowse,...opts}:opts);
  const back=(p)=>{listen('#pk-back',()=>go(p,p?{}:lastBrowse));};
  const backBtn=label=>btn('pk-back',label,'back pk-back');
  function customPack(name,goal=''){
    const p={id:uid('personal'),title:name,description:goal,goal,entries:[],
      challenge:'Write a short passage for your current project. Make one deliberate word choice, then explain what it lets your reader infer.',
      followup:'Imagine a familiar place after something small has changed. Write a short passage that lets a reader discover the change.'};
    data().custom.push(p);data().enrolled[p.id]=true;D.save();return p;
  }
  function enroll(p){
    D.editionPacks?.retain(p);
    data().enrolled[p.id]=true;
  }
  function countNewToday(p){
    const today=localDay(Date.now());
    return data().newLog.filter(entry=>entry.pack===p.id && entry.day===today).length;
  }
  function plan(p){
    const allWords=entries(p);
    const dueWords=allWords.filter(w=>due(w)&&seen(w.id)).sort((a,b)=>Date.parse(record(a.id).due)-Date.parse(record(b.id).due));
    const available=Math.max(0,Number(data().dailyLimit||3)-countNewToday(p));
    const selectedDue=dueWords.slice(0,sessionLimit);
    const fresh=allWords.filter(w=>!seen(w.id)).slice(0,Math.min(available,sessionLimit-selectedDue.length));
    return {dueWords,fresh,today:[...selectedDue,...fresh],studied:allWords.filter(w=>seen(w.id)).length};
  }
  D.packById=get;
  D.packPlan=plan;
  D.packReviewItem=id=>{
    for(const p of all()){const w=entries(p).find(w=>w.id===id);if(w)return {...w,track:p.title};}
    return D.packGenerator?.entry(id)||null;
  };
  D.packDueChallenges=()=>data().journal.filter(j=>!j.completed&&Date.parse(j.due)<=Date.now()).sort((a,b)=>Date.parse(a.due)-Date.parse(b.due));
  let lastBrowse={};
  function anotherSet(p){
    const gen=D.packGenerator;
    if(!gen)return;
    const track=gen.tracks().find(t=>t.id===p.trackId&&t.count>1);
    const count=track?.count||gen.count();
    if(!count)return;
    const current=new Set(entries(p).map(w=>w.id));
    const start=Math.floor(Math.random()*count);
    let next,lowest=Infinity;
    for(let offset=0;offset<Math.min(count,12);offset++){
      const candidate=gen.at((start+offset)%count,track?.id);
      if(!candidate||candidate.id===p.id)continue;
      const overlap=entries(candidate).reduce((sum,w)=>sum+Number(current.has(w.id))*2+Number(seen(w.id)),0);
      if(overlap<lowest){next=candidate;lowest=overlap;}
      if(!overlap)break;
    }
    if(next)go(next);
  }
  function packTile(p){
    const ls=entries(p),onShelf=!!data().enrolled[p.id];
    const kind=isCustom(p)?'Personal pack':p.generated?'Practice set · '+p.trackTitle:'Original craft study';
    const preview=p.description||p.goal;
    return '<a class="pk-tile" href="'+e('#packs?'+new URLSearchParams({id:p.id,...lastBrowse}))+'"><span class="eyebrow">'+e(kind)+'</span><strong>'+e(p.title)+'</strong>'+
      (preview?'<span class="pk-desc">'+e(preview)+'</span>':'')+'<span class="pk-meta">'+ls.length+' '+(ls.length===1?'sense':'senses')+
      (onShelf?' · '+plan(p).studied+' practiced':'')+'</span></a>';
  }
  function collection(focus,mine,tracks){
    const curated=D.packCatalog||[],gen=D.packGenerator;
    const track=tracks.find(t=>t.id===focus);
    if(mine){
      const ids=[...new Set([...data().custom.map(p=>p.id),...Object.keys(data().enrolled).filter(id=>data().enrolled[id])])];
      return {count:ids.length,at:index=>get(ids[index])};
    }
    if(focus==='craft'||focus==='personal'){
      const packs=focus==='personal'?data().custom:curated;
      return {count:packs.length,at:index=>packs[index]};
    }
    if(track)return {count:track.count,at:index=>gen.at(index,track.id)};
    const generated=gen?.count()||0;
    const mixed=Math.min(curated.length,Math.floor(generated/2));
    return {count:generated+curated.length+data().custom.length,at(index){
      if(index<mixed*3){
        const group=Math.floor(index/3),slot=index%3;
        return slot===2?curated[group]:gen.at(group*2+slot);
      }
      const remaining=index-mixed*3,otherCraft=curated.length-mixed,otherGenerated=generated-mixed*2;
      if(remaining<otherCraft)return curated[mixed+remaining];
      if(remaining<otherCraft+otherGenerated)return gen.at(mixed*2+remaining-otherCraft);
      return data().custom[remaining-otherCraft-otherGenerated];
    }};
  }
  const lower=text=>String(text||'').trim().toLowerCase();
  function searchPacks(query,focus,mine,tracks){
    const terms=lower(query).match(/[\p{L}\p{N}]+/gu)||[];
    const find=terms.length?terms:[lower(query)];
    const source=mine?collection('',true,tracks):null;
    const specific=mine?Array.from({length:source.count},(_,i)=>source.at(i)).filter(Boolean):
      focus==='craft'?D.packCatalog:focus==='personal'?data().custom:focus?[]:all();
    const hits=[], phrase=lower(query);
    function add(pack){
      if(!pack)return;
      const words=entries(pack).map(w=>lower(w.word)),title=lower(pack.title);
      const meta=[title,lower(pack.trackTitle),lower(pack.description),lower(pack.goal),...words].join(' ');
      if(!find.every(t=>meta.includes(t)))return;
      const rank=(words.includes(phrase)?6:title===phrase?6:title.includes(phrase)?4:words.some(w=>w.startsWith(phrase))?3:1)
        +(!pack.generated?0.25:0);
      hits.push({pack,rank});
    }
    specific.forEach(add);
    if(!mine&&focus!=='craft'&&focus!=='personal'){
      const gen=D.packGenerator;
      for(const track of tracks){
        if(focus&&track.id!==focus)continue;
        const meta=lower(track.title+' '+track.description);
        const needed=find.filter(t=>!meta.includes(t));
        if(track.id.startsWith('edition-track/')){add(D.editionPacks?.findExample(track.id,needed));continue;}
        const words=track.words||[];
        if(!needed.every(t=>words.some(w=>lower(w).includes(t))))continue;
        const ranked=words.map(word=>{const w=lower(word);return {word,score:find.reduce((n,t)=>n+(w===t?10:w.startsWith(t)?4:w.includes(t)?1:0),0)};})
          .sort((a,b)=>b.score-a.score);
        const chosen=[];
        for(const t of needed){const entry=ranked.find(x=>lower(x.word).includes(t));if(entry&&!chosen.includes(entry.word))chosen.push(entry.word);}
        for(const {word} of ranked){if(chosen.length>=5)break;if(!chosen.includes(word))chosen.push(word);}
        if(chosen.length===5)add(gen.fromWords(track.id,chosen));
      }
    }
    hits.sort((a,b)=>b.rank-a.rank);
    return {count:hits.length,at:i=>hits[i]?.pack,grouped:!mine&&hits.some(h=>h.pack.generated)};
  }
  function catalog(opts={}){
    const tracks=D.packGenerator?.tracks()||[],mine=opts.shelf==='mine';
    const focus=tracks.some(t=>t.id===opts.focus)||['craft','personal'].includes(opts.focus)?opts.focus:'';
    const size=9;
    const startQuery=String(opts.q||'').slice(0,140);
    function results(raw,requested){
      const query=raw.trim();
      const source=query?searchPacks(query,focus,mine,tracks):collection(focus,mine,tracks);
      const pages=Math.ceil(source.count/size),page=Math.max(1,Math.min(pages,Number.isSafeInteger(requested)?requested:1));
      const offset=(page-1)*size,shown=[];
      for(let i=offset;i<Math.min(offset+size,source.count);i++){const p=source.at(i);if(p)shown.push(p);}
      lastBrowse=mine?{shelf:'mine'}:focus?{focus}:{};
      if(query)lastBrowse.q=query;
      if(page>1)lastBrowse.page=String(page);
      const status=query
        ? source.count+' '+(source.count===1?'match':'matches')+(source.grouped?' · One practice set per matching focus.':'')
        : shown.length?(offset+1).toLocaleString()+'–'+(offset+shown.length).toLocaleString()+' of '+source.count.toLocaleString()+' packs':'0 packs';
      const pageLink=(n,label)=>'<a class="secondary" href="'+e('#packs?'+new URLSearchParams({...lastBrowse,page:String(n)}))+'">'+label+'</a>';
      const body=(shown.length?'<div class="pk-grid">'+shown.map(packTile).join('')+'</div>':
        '<p class="notice">'+(query?'No matching packs. Try a different word or focus.':'Add a pack to your shelf or create a pack with your own words.')+'</p>')+
        (pages>1?'<div class="pk-pages" role="navigation" aria-label="Pack pages">'+(page>1?pageLink(page-1,'Previous packs'):'')+
        '<form id="pk-page-form"><label for="pk-page">Page</label><input id="pk-page" name="page" type="number" inputmode="numeric" min="1" max="'+pages+'" value="'+page+'" required><span>of '+pages.toLocaleString()+'</span><button>Go</button></form>'+
        (page<pages?pageLink(page+1,'Next packs'):'')+'</div>':'');
      return {status,body};
    }
    const initial=results(startQuery,Number(opts.page));
    const trackOptions=tracks.map(t=>'<option value="'+e(t.id)+'"'+(focus===t.id?' selected':'')+'>'+e(t.title)+'</option>').join('');
    const totalGenerated=D.packGenerator?.count()||0;
    const intro=(D.packCatalog?.length||0)+' original craft studies and '+totalGenerated.toLocaleString()+' five-word practice sets across '+tracks.length+' writing focuses.';
    write(top('Writing curriculum','Vocabulary packs',intro)+
      '<div class="pk-bar"><div class="pk-tabs" role="group" aria-label="Pack shelf"><button id="pk-all" aria-pressed="'+!mine+'">All packs</button><button id="pk-mine" aria-pressed="'+mine+'">My packs</button></div><div class="actions"><a class="secondary" href="#journey">My journey</a>'+btn('pk-new','Create a pack')+'</div></div>'+
      '<div class="pk-finder"><label for="pk-search">Find a pack</label><div><input type="search" id="pk-search" aria-controls="pk-results" maxlength="140" placeholder="Word, focus or pack name" value="'+e(startQuery)+'">'+btn('pk-clear','Clear search')+'</div></div>'+
      '<div class="pk-filters">'+(!mine?'<label for="pk-focus">Writing focus</label><select id="pk-focus"><option value="">All focuses</option><option value="craft"'+(focus==='craft'?' selected':'')+'>Original craft studies</option>'+trackOptions+
      (data().custom.length?'<option value="personal"'+(focus==='personal'?' selected':'')+'>Personal packs</option>':'')+'</select>':'')+
      '<span class="pk-range" id="pk-count" role="status" aria-live="polite">'+e(initial.status)+'</span></div>'+
      '<div id="pk-results">'+initial.body+'</div>');
    const input=q('#pk-search'),clear=q('#pk-clear');
    clear.hidden=!startQuery;
    function bindPage(){listen('#pk-page-form',ev=>{ev.preventDefault();go(null,{...lastBrowse,page:value(ev.currentTarget,'page')});},'submit');}
    function update(raw){
      const found=results(raw,1);
      q('#pk-count').textContent=found.status;q('#pk-results').innerHTML=found.body;
      clear.hidden=!raw;bindPage();
      // On the standalone page, Back returns to the live query the writer left.
      // The conversation view uses its own in-memory navigation.
      try{
        if(window.location?.hash.split('?')[0]==='#packs'&&window.history?.replaceState){
          const search=new URLSearchParams(lastBrowse).toString();
          window.history.replaceState(window.history.state,'','#packs'+(search?'?'+search:''));
        }
      }catch{}
    }
    const keepQuery=()=>lastBrowse.q?{q:lastBrowse.q}:{};
    listen('#pk-all',()=>go(null,keepQuery()));listen('#pk-mine',()=>go(null,{...keepQuery(),shelf:'mine'}));listen('#pk-new',()=>go(null,{create:'1'}));
    listen('#pk-focus',ev=>go(null,{...keepQuery(),focus:ev.target.value}),'change');
    listen('#pk-search',ev=>{if(!ev.isComposing)update(ev.target.value);},'input');
    listen('#pk-search',ev=>update(ev.target.value),'compositionend');
    listen('#pk-clear',()=>{input.value='';update('');input.focus();});
    bindPage();
  }
  function nameForm(p,addNote){
    write(backBtn('Back to packs')+top('Personal collection',p?'Edit pack':'Create a pack')+
      '<form class="panel pk-panel">'+field('name','Pack name',p?.title||'',false,true)+field('goal','What writing decision do you want to practice?',p?.goal||'',true)+
      '<button class="primary" type="submit">'+(p?'Save changes':'Create pack')+'</button></form>');back(p);
    listen('form',ev=>{ev.preventDefault();const f=ev.currentTarget,name=value(f,'name');if(!name){f.elements.name.focus();return;}
      let created=p;if(p){p.title=name;p.description=p.goal=value(f,'goal');}else created=customPack(name,value(f,'goal'));
      if(addNote)addTo(created,addNote);D.save();go(created);
    },'submit');
  }
  function addTo(p,n){
    const id=n.wordId||n.id;
    if(!p.entries.some(w=>w.id===id))p.entries.push({id,word:n.word,sense:n.sense,example:n.source||'',sourceName:n.sourceName||'',prompt:n.sense,goal:n.goal||'',neighbor:'',contrast:'',hint:''});
    D.save();
  }
  function picker(id){
    const n=D.state.notes.find(item=>item.id===id);
    if(!n){write(backBtn('All packs')+'<p class="notice">This notebook entry is no longer available.</p>');back();return;}
    write(backBtn('All packs')+top('Personal collection','Add to a pack',n.word+' · '+n.sense)+
      '<div class="pk-grid">'+data().custom.map(p=>{
        const already=p.entries.some(w=>w.id===(n.wordId||n.id));
        return '<button class="pk-tile" data-pick data-value="'+e(p.id)+'"><strong>'+e(p.title)+'</strong><span>'+(already?'Already included · open pack':'Add this sense')+'</span></button>';
      }).join('')+'</div><div class="actions">'+btn('pk-create-note','Create a pack for this word','primary')+'</div>');back();listen('#pk-create-note',()=>nameForm(null,n));many('[data-pick]',id=>{const p=get(id);if(p){addTo(p,n);go(p);}});
  }
  function detail(p){
    const ls=entries(p),queue=plan(p),enrolled=!!data().enrolled[p.id],active=data().active[p.id],custom=isCustom(p);
    const records=data().journal.filter(j=>j.packId===p.id).slice().reverse();
    const uses=(data().usage||[]).filter(u=>u.packId===p.id).slice().reverse();
    const comparisons=uses.length?'<section class="pk-journal"><h2>Your word choices</h2><details><summary>'+uses.length+' saved '+(uses.length===1?'comparison':'comparisons')+'</summary>'+uses.map(u=>'<div class="pk-entry"><strong>'+e(u.word)+'</strong><span class="pk-meta"> · '+e(when(u.date))+'</span><p>'+e(u.response)+'</p></div>').join('')+'</details></section>':'';
    const newAvailable=queue.fresh.length,ready=queue.dueWords.length;
    const draft=data().writingDrafts?.['write-'+p.id];
    const briefLabel=draft?.passage||draft?.rationale?'Resume writing brief':records.length?'Try a new writing brief':'Try the writing brief';
    write(backBtn('Back to packs')+top(custom?'Personal pack':p.generated?p.trackTitle:'Writer’s pack',p.title,p.goal||p.description)+
      '<div class="pk-detail"><section class="panel pk-panel"><h2>Pack practice</h2><p class="pk-meta">'+ls.length+' senses · '+queue.studied+' practiced · '+ready+' due</p>'+
      '<p>Review due words first, then learn up to '+data().dailyLimit+' new senses from this pack per day. Each session contains at most '+sessionLimit+' words.</p>'+
      '<div class="actions">'+(active?btn('pk-study','Resume study session','primary'):queue.today.length?btn('pk-study',enrolled?'Study this pack':'Start this pack','primary'):'')+
      btn('pk-write',briefLabel,active||queue.today.length?'secondary':'primary')+(!enrolled?btn('pk-enroll','Add to my shelf'):'')+'</div>'+
      (!queue.today.length&&!active?'<p class="pk-meta">'+(ls.length?'You have worked through today’s available words. Return when a review is due or try the writing brief.':'Add your first word using the dictionary or the entry form below.')+'</p>':'')+
      '<details class="pk-setting"><summary>Daily new-word limit</summary><label>New words per pack each day <select id="pk-limit">'+[1,2,3,4,5].map(n=>'<option value="'+n+'"'+(data().dailyLimit===n?' selected':'')+'>'+n+'</option>').join('')+'</select></label></details></section>'+
      '<section class="panel pk-panel"><h2>Inside the pack</h2><p class="pk-meta">'+newAvailable+' new '+(newAvailable===1?'sense':'senses')+' available this session</p>'+
      (custom?'<div class="actions">'+btn('pk-dict','Find a dictionary word')+btn('pk-add','Write an entry')+btn('pk-rename','Edit pack','back')+'</div>':'')+
      '<details class="pk-contents"><summary>Explore '+ls.length+' word '+(ls.length===1?'sense':'senses')+'</summary>'+ls.map(w=>'<div class="pk-entry"><strong>'+e(w.word)+'</strong><p>'+e(w.sense)+'</p>'+(custom?'<button type="button" data-edit data-value="'+e(w.id)+'">Edit entry</button>':'')+'</div>').join('')+'</details></section></div>'+
      '<div class="pk-more actions"><a class="secondary" href="#journey">Continue journey</a>'+btn('pk-another','Explore another set')+'</div>'+
      (records.length?'<section class="pk-journal"><h2>Writing from this pack</h2>'+records.map(j=>'<details><summary>'+e(when(j.date))+' · '+(j.completed?'Follow-up completed':Date.parse(j.due)<=Date.now()?'Follow-up due':'Follow-up '+e(when(j.due)))+'</summary><p class="pk-k">Original brief</p><p>'+e(j.prompt)+'</p><blockquote>'+e(j.passage)+'</blockquote><p>'+e(j.rationale)+'</p>'+(j.completed?'<p class="pk-k">Independent follow-up</p><p>'+e(j.followupPrompt)+'</p><blockquote>'+e(j.followupPassage)+'</blockquote><p>'+e(j.followupReason)+'</p>':Date.parse(j.due)<=Date.now()?'<button class="secondary" data-follow data-value="'+e(j.id)+'">Open fresh brief</button>':'')+'</details>').join('')+'</section>':'')+comparisons);
    listen('#pk-back',()=>go(null,lastBrowse));listen('#pk-study',()=>begin(p));listen('#pk-write',()=>go(p,{challenge:'1'}));listen('#pk-enroll',()=>{enroll(p);D.save();detail(p);});
    listen('#pk-another',()=>anotherSet(p));
    listen('#pk-limit',ev=>{data().dailyLimit=Number(ev.currentTarget.value);D.save();detail(p);},'change');listen('#pk-dict',()=>D.go('dictionary',{pack:p.id}));listen('#pk-add',()=>entryForm(p));listen('#pk-rename',()=>nameForm(p));
    many('[data-edit]',id=>entryForm(p,ls.find(w=>w.id===id)));many('[data-follow]',id=>go(p,{followup:id}));
  }
  function entryForm(p,w){
    write(backBtn('Back to pack')+top('Personal collection',w?'Edit this sense':'Add a word sense')+
      '<form class="panel pk-panel">'+field('word','Word or phrase',w?.word,false,true)+field('sense','Meaning in this context',w?.sense,true,true)+
      field('example','Example sentence',w?.example,true)+field('neighbor','A nearby word to compare',w?.neighbor)+field('contrast','What changes between the words?',w?.contrast,true)+
      (w?.sourceName?'<p class="pk-meta">'+e(w.sourceName)+'</p>':'')+
      '<div class="actions"><button class="primary" type="submit">Save sense</button>'+(w?btn('pk-remove','Remove from pack'):'')+'</div><div id="pk-confirm"></div></form>');back(p);
    const retire=id=>{
      if(!D.packReviewItem(id)&&!D.words.some(item=>item.id===id)&&!D.state.notes.some(item=>item.id===id||item.wordId===id))delete D.state.reviews[id];
    };
    listen('form',ev=>{
      ev.preventDefault();const f=ev.currentTarget,word=value(f,'word'),sense=value(f,'sense');if(!word||!sense){f.elements.namedItem(!word?'word':'sense').focus();return;}
      const different=w&&(word!==w.word||sense!==w.sense);
      const row={id:(!w||different)?uid('sense'):w.id,word,sense,prompt:sense,example:value(f,'example'),neighbor:value(f,'neighbor'),contrast:value(f,'contrast'),hint:'',sourceName:(!different&&w?.sourceName)||''};
      if(w){p.entries.splice(p.entries.indexOf(w),1,row);if(different)retire(w.id);}else p.entries.push(row);
      D.save();go(p);
    },'submit');
    listen('#pk-remove',()=>{q('#pk-confirm').innerHTML='<p>Remove this sense from this pack?</p>'+btn('pk-yes','Remove sense')+' '+btn('pk-no','Keep sense');listen('#pk-no',()=>{q('#pk-confirm').textContent='';});listen('#pk-yes',()=>{p.entries=p.entries.filter(item=>item.id!==w.id);retire(w.id);D.save();go(p);});});
  }
  function begin(p){
    enroll(p);
    if(!data().active[p.id]){const sched=plan(p);if(!sched.today.length){D.save();detail(p);return;}
      data().active[p.id]={ids:sched.today.map(w=>w.id),fresh:sched.fresh.map(w=>w.id),index:0,intro:0,stage:sched.fresh.length?'learn':'recall',attempt:'',reason:'',hinted:false,skip:false};}
    D.save();go(p,{study:'1'});
  }
  function study(p){
    const a=data().active[p.id];if(!a){detail(p);return;}
    const find=id=>entries(p).find(w=>w.id===id);
    while(a.intro<a.fresh.length&&!find(a.fresh[a.intro]))a.intro++;
    while(a.index<a.ids.length&&!find(a.ids[a.index]))a.index++;
    if(a.stage==='learn'&&a.intro>=a.fresh.length)a.stage='recall';
    if(a.index>=a.ids.length){
      delete data().active[p.id];D.save();write(backBtn('Back to pack')+top('Pack practice','Word session complete','Your next word reviews are scheduled from your ratings.')+'<div class="panel pk-panel"><h2>Put the words to work</h2><p>Write to a fresh brief. Use whichever words serve your reader.</p><div class="actions">'+btn('pk-apply','Open writing brief','primary')+'<a class="secondary" href="#journey">Continue journey</a>'+btn('pk-another','Explore another set')+'</div></div>');back(p);listen('#pk-apply',()=>go(p,{challenge:'1'}));listen('#pk-another',()=>anotherSet(p));return;
    }
    const intro=a.stage==='learn',w=intro?find(a.fresh[a.intro]):find(a.ids[a.index]);
    const scope=intro?'New sense '+(a.intro+1)+' of '+a.fresh.length:'Word '+(a.index+1)+' of '+a.ids.length;
    const example=w.example?'<blockquote>'+e(w.example)+'</blockquote>':'';
    const save=(stage)=>{a.stage=stage;D.save();study(p);};
    let content;
    if(intro){
      content='<h2>'+e(w.word)+'</h2><p>'+e(w.sense)+'</p>'+example+(w.pattern?'<p class="pk-meta">'+e(w.pattern)+'</p>':'')+(w.sourceName?'<p class="pk-meta">'+e(w.sourceName)+'</p>':'')+
        btn('pk-next',a.intro+1===a.fresh.length?'Begin recall':'Next new sense','primary');
    }else if(a.stage==='recall'){
      content='<span class="eyebrow">Recall from meaning</span><h2>'+e(w.prompt||w.sense)+'</h2><form>'+field('attempt','Your word or phrase',a.attempt)+
        (a.hinted?'<p class="notice">'+e(w.hint||'The word begins with '+w.word.slice(0,1)+'.')+'</p>':'')+
        '<div class="actions"><button class="primary">Compare</button>'+(!a.hinted?btn('pk-hint','Show hint'):'')+btn('pk-skip','Can’t recall','back')+'</div></form>';
    }else if(a.stage==='rate'){
      content='<span class="eyebrow">Compare your recall</span><h2>'+e(w.word)+'</h2><p>'+e(w.sense)+'</p>'+example+'<p class="pk-meta">Your answer · '+e(a.attempt||'Skipped')+'</p>'+
        '<p>A different word may fit. How readily did this particular word come to mind?</p><div class="actions">'+(!a.hinted&&!a.skip&&a.attempt.trim()?btn('pk-good','Recalled it','primary'):'')+btn('pk-partial','Partly recalled')+btn('pk-miss','Need another try')+'</div>';
    }else if(a.stage==='compare'){
      content='<span class="eyebrow">Practice a distinction</span><h2>'+e(w.word)+(w.neighbor?' or '+e(w.neighbor)+'?':' in context')+'</h2><form>'+
        field('reason',w.neighbor?'Which would you choose in a sentence of your own, and why?':'Write a sentence using this sense. What would a simpler alternative change?',a.reason,true,true)+
        '<button class="primary">Compare usage</button></form>';
    }else{
      content='<span class="eyebrow">Compare usage</span><h2>'+e(w.word)+'</h2><blockquote>'+e(a.reason)+'</blockquote>'+
        '<p>'+e(w.contrast||'Read your sentence aloud. Does the word fit its context, and would the simpler choice change the reader’s impression?')+'</p>'+example+
        btn('pk-next',a.index+1===a.ids.length?'Finish word session':'Next word','primary');
    }
    write(backBtn('Save and return to pack')+top(p.title,scope)+'<article class="panel pk-panel pk-study">'+content+'</article>');back(p);
    if(intro){listen('#pk-next',()=>{const id=a.fresh[a.intro],today=localDay(Date.now());
      if(!data().newLog.some(log=>log.pack===p.id&&log.id===id&&log.day===today))data().newLog.push({pack:p.id,id,day:today});
      a.intro++;save(a.intro<a.fresh.length?'learn':'recall');});}
    else if(a.stage==='recall'){
      listen('[name="attempt"]',ev=>{a.attempt=ev.target.value;D.save();},'input');
      listen('form',ev=>{ev.preventDefault();a.attempt=value(ev.currentTarget,'attempt');a.skip=!a.attempt;save('rate');},'submit');
      listen('#pk-hint',()=>{a.hinted=true;save('recall');});listen('#pk-skip',()=>{a.skip=true;save('rate');});
    }else if(a.stage==='rate'){
      [['#pk-good','recalled'],['#pk-partial','partial'],['#pk-miss','missed']].forEach(([selector,grade])=>listen(selector,()=>{
        if(a.stage!=='rate')return;
        D.recordRecall({id:w.id,word:w.word,grade,answer:a.attempt,assisted:a.hinted||a.skip,fromStudy:a.fresh.includes(w.id)});
        save('compare');
      }));
    }else if(a.stage==='compare'){
      listen('[name="reason"]',ev=>{a.reason=ev.target.value;D.save();},'input');
      listen('form',ev=>{ev.preventDefault();a.reason=value(ev.currentTarget,'reason');if(!a.reason)return;data().usage ||= [];data().usage.push({date:new Date().toISOString(),packId:p.id,id:w.id,word:w.word,response:a.reason});save('feedback');},'submit');
    }else listen('#pk-next',()=>{a.index++;a.attempt='';a.reason='';a.skip=false;a.hinted=false;save('recall');});
  }
  function challenge(p,j=null){
    if(j&&(j.completed||Date.parse(j.due)>Date.now())){detail(p);return;}
    const key=j?j.id:'write-'+p.id;
    const drafts=data().writingDrafts ||= {};
    const d=drafts[key] ||= {passage:'',rationale:''};
    if(!j&&!d.prompt){
      D.editionPacks?.retain(p);
      const cycle=data().journal.filter(item=>item.packId===p.id).length;
      const resumeLegacy=!!(d.passage||d.rationale);
      const brief=(p.generated||cycle>0)&&!resumeLegacy&&D.writingBriefs?D.writingBriefs.forPack(p,cycle):p;
      d.prompt=brief.challenge;d.followupPrompt=brief.followup;
      D.save();
    }
    const prompt=j?j.followupPrompt:d.prompt;
    write(backBtn('Back to pack')+top(j?'Independent follow-up':p.title,j?'Write a fresh passage':'Write from a brief')+
      '<form class="panel pk-panel"><h2>'+e(prompt)+'</h2>'+field('passage','Your passage',d.passage,true,true)+field('rationale','Which word choice served your purpose, and why?',d.rationale,true,true)+
      '<button class="primary">Save '+(j?'follow-up':'writing sample')+'</button></form>');back(p);
    ['passage','rationale'].forEach(k=>listen('[name="'+k+'"]',ev=>{d[k]=ev.target.value;D.save();},'input'));
    listen('form',ev=>{
      ev.preventDefault();const f=ev.currentTarget,passage=value(f,'passage'),reason=value(f,'rationale');if(!passage||!reason){f.elements.namedItem(!passage?'passage':'rationale').focus();return;}
      const date=new Date().toISOString();
      if(j){Object.assign(j,{followupPassage:passage,followupReason:reason,completed:date});}
      else data().journal.push({id:uid('writing'),packId:p.id,title:p.title,prompt,followupPrompt:d.followupPrompt,passage,rationale:reason,date,due:new Date(Date.now()+7*day).toISOString()});
      enroll(p);delete drafts[key];D.save();go(p);
    },'submit');
  }
  D.packs=(opts={})=>{
    const p=get(opts.id);
    if(p&&(opts.q||opts.page||opts.focus||opts.shelf)){
      lastBrowse=Object.fromEntries(['shelf','focus','q','page'].filter(k=>opts[k]).map(k=>[k,opts[k]]));
    }
    if(opts.addNote){
      const dest=opts.pack&&data().custom.find(item=>item.id===opts.pack);
      const note=D.state.notes.find(item=>item.id===opts.addNote);
      if(dest&&note){addTo(dest,note);go(dest);return;}
      return picker(opts.addNote);
    }
    if(opts.create)return nameForm();
    if(!p)return catalog(opts);
    if(opts.start)return begin(p);
    if(opts.study)return study(p);
    if(opts.followup){const j=data().journal.find(j=>j.id===opts.followup&&j.packId===p.id);return j?challenge(p,j):detail(p);}
    if(opts.challenge)return challenge(p);
    detail(p);
  };
})();

