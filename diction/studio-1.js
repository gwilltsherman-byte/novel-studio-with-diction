
(() => {
  'use strict';
  const key = 'diction.studio.v1';
  const blank = {notes: [], reviews: {}, sessions: [], drafts: {}, reviewHistory: []};
  let state = {...blank}, writable = true;
  const storageWarning = text => {
    const p = document.getElementById('storage-message');
    p.hidden = false; p.textContent = text;
    document.getElementById('save-label').textContent = 'Changes in this tab only';
  };
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const stored = JSON.parse(raw);
      if (!stored || typeof stored !== 'object') throw Error();
      state = {...blank, ...stored};
      for (const k of Object.keys(blank)) {
        if (!state[k] || typeof state[k] !== 'object' || Array.isArray(state[k]) !== Array.isArray(blank[k])) throw Error();
      }
    }
  } catch {
    state = structuredClone(blank); writable = false;
    storageWarning('Device storage is unavailable. This session will last until you close the tab.');
  }
  const D = window.Diction = {root:document.getElementById('main'),state,words:[]};
  D.save = () => {
    if (!writable) return;
    try {localStorage.setItem(key,JSON.stringify(D.state));}
    catch {storageWarning('This browser could not save your latest changes. Keep this tab open.');}
  };
  D.esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  D.learningAttempt = (id, kind, grade, retry = false) => {
    window.NovelLearning?.record({type:'attempt', key:'diction/'+id, track:'vocabulary', kind, grade, retry});
  };
  const paths = {
    desk:'<path d="M3 9.5 12 3l9 6.5v10H3z"/><path d="M9 19v-7h6v7"/>',
    notebook:'<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 3v18m3-13h4m-4 3h3"/>',
    lexicon:'<path d="M12 6c-3-2-6-2-10-2v14c4 0 7 0 10 2 3-2 6-2 10-2V4c-4 0-7 0-10 2zm0 0v14"/>',
    progress:'<path d="M3 3v17h18M7 15v-4m5 4V8m5 7V5"/>',
    pen:'<path d="m4 16 12-12 4 4L8 20l-5 1 1-5zm10-10 4 4"/>',
    layers:'<path d="m3 8 9-5 9 5-9 5-9-5zm0 5 9 5 9-5m-18 5 9 5 9-5"/>',
    time:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
    quote:'<path d="M4 16c3 0 5-3 5-6V8H4v5h4m5 3c3 0 5-3 5-6V8h-5v5h4"/>',
    motion:'<path d="M3 17h4c6 0 5-10 11-10h3M3 12h3m-3-5h6"/>',
    balance:'<path d="M12 4v16m-6 0h12M3 8l17-3m-14 3-3 6h6l-3-6zm12-3-3 6h6l-3-6z"/>',
    review:'<path d="M4 9a8 8 0 1 1-1 7M4 3v6h6"/>',
    book:'<path d="M3 5c3-1 6 0 9 2 3-2 6-3 9-2v14c-3-1-6 0-9 2-3-2-6-3-9-2zm9 2v14"/>'
  };
  D.icon = (name,size=20) => '<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||'')+'</svg>';
  const E=D.esc;
  const screens={home:['Word practice','book'],journey:['Journey','motion'],guided:['Guided word practice','book'],notebook:['Notebook','notebook'],lexicon:['Word study','lexicon'],progress:['Progress','progress'],review:['Word review','review'],packs:['Packs','layers'],dictionary:['Dictionary','lexicon']};
  const navKeys=['home','journey','packs','dictionary','notebook','progress'];
  let embeddedRoute = '#home';
  const getRoute = () => {
    let [page,search=''] = embeddedRoute.slice(1).split('?');
    if (!Object.hasOwn(screens,page)) page='home';
    const opts=Object.fromEntries(new URLSearchParams(search));
    return [page,opts];
  };
  const url=(view,opts={})=>{const query=new URLSearchParams(Object.entries(opts).filter(([,v])=>v!=null)).toString();return '#'+view+(query?'?'+query:'');};
  D.go=(view,opts={})=>{
    const dest=url(view,opts);
    embeddedRoute=dest;D.render();D.root.focus({preventScroll:true});window.scrollTo(0,0);
  };
  const dateText=(date,opts)=>new Date(date).toLocaleDateString(undefined,opts);
  const shortDate={month:'short',day:'numeric'};
  const excerpt=text=>{
    const value=String(text||'').replace(/\s+/g,' ').trim();
    return value.length>115?value.slice(0,112).trimEnd()+'…':value;
  };
  const roundUrl=url('guided',{round:'1'});

  function workKey() {
    const opts=D.options||{};
    if(D.view==='guided')return opts.round==='1'?'round':'guided';
    if(D.view==='review')return 'review';
    if(D.view==='packs'&&opts.id){
      if(opts.followup)return 'brief/'+opts.followup;
      if(opts.challenge)return 'brief/write-'+opts.id;
      if(D.state.packs?.active?.[opts.id])return 'pack/'+opts.id;
    }
    return '';
  }
  const storeState=D.save;
  D.save=()=>{
    const key=workKey();
    if(key)D.state.lastWorkKey=key;
    storeState();
  };

  function savedWork(){
    const rows=[], shelf=D.state.packs||{};
    const round=D.quickRoundInfo?.();
    if(round)rows.push({key:'round',label:'Three-word practice',title:'Pick up your practice',body:round.done+' of '+round.total+' words completed. Your place is saved.',action:'Resume round',href:roundUrl});
    const guided=D.pendingGuided();
    if(guided)rows.push({key:'guided',label:'Word practice',title:guided.kind==='review'?'Finish your recall':guided.word,
      body:guided.kind==='review'?'Return to your saved recall attempt.':guided.sense,action:'Resume this word',href:url('guided',{id:guided.id})});
    for(const [id,active] of Object.entries(shelf.active||{}).reverse()){
      const p=D.packById(id);
      if(active&&p)rows.push({key:'pack/'+id,label:'Pack in progress',title:p.title,body:'Return to your place in this pack.',action:'Resume pack',href:url('packs',{id,study:'1'})});
    }
    for(const [key,draft] of Object.entries(shelf.writingDrafts||{}).reverse()){
      if(!draft?.passage?.trim()&&!draft?.rationale?.trim())continue;
      const follow=(shelf.journal||[]).find(j=>j.id===key);
      const id=follow?.packId||(key.startsWith('write-')&&key.slice(6));
      const p=id&&D.packById(id);
      if(!p||follow?.completed)continue;
      rows.push({key:'brief/'+key,label:follow?'Follow-up draft':'Pack writing draft',title:p.title,body:excerpt(draft.passage||draft.rationale),
        action:'Resume writing',href:url('packs',follow?{id,followup:key}:{id,challenge:'1'})});
    }
    const attempt=D.state.lexicalAttempt;
    if(attempt&&(attempt.answer?.trim()||attempt.hinted||attempt.stage==='compare')){
      rows.push({key:'review',label:'Word review',title:'Finish your recall',body:'Your answer is saved.',action:'Resume review',href:'#review'});
    }
    const recentlyUsed=rows.findIndex(row=>row.key===D.state.lastWorkKey);
    if(recentlyUsed>0)rows.unshift(...rows.splice(recentlyUsed,1));
    return rows;
  }

  function home(){
    const work=savedWork(),resume=work[0];
    const item=resume?null:D.coach.next();
    const first=resume||(item?{
      key:'round',label:item.kind==='review'?'Ready for recall':'Your next word',title:item.kind==='review'?'Which word fits?':item.word,
      body:item.kind==='review'?'Start with a clue for a word you’ve studied.':item.sense,
      href:roundUrl,action:'Practice 3 words'
    }:{key:'dictionary',label:'Word study',title:'Find your next word',body:'Explore a meaning, then add it to your review queue.',href:'#dictionary',action:'Open dictionary'});
    const alternate=resume && first.key!=='round' ? {label:D.quickRoundInfo?.()?'Resume quick practice':'Practice 3 words',href:roundUrl} : null;
    const now=Date.now(),reviews=Object.values(D.state.reviews).filter(r=>Number.isFinite(Date.parse(r?.due)));
    const due=reviews.filter(r=>Date.parse(r.due)<=now).length;
    const later=reviews.filter(r=>Date.parse(r.due)>now).map(r=>Date.parse(r.due)).sort((a,b)=>a-b)[0];
    const revisit=D.packDueChallenges()[0];
    const activePacks=Object.keys(D.state.packs?.enrolled||{}).filter(k=>D.state.packs.enrolled[k]).length;
    const notebookCount=D.state.notes.length;
    const card=(icon,title,sub,href)=>'<a class="desk-tool" href="'+E(href)+'"><span class="desk-tool-icon">'+D.icon(icon,20)+'</span><span><strong>'+E(title)+'</strong><small>'+E(sub)+'</small></span></a>';
    const other=work.slice(1).filter(w=>w.href!==alternate?.href);
    const why=item&&'<details class="hero-reason"><summary>Why this word?</summary><p>'+E(item.reason)+'</p><a href="'+E(url('guided',{id:item.id}))+'">Study this word on its own</a></details>';
    D.root.innerHTML='<section class="desk-wrap"><div class="desk-heading"><h1>Word practice</h1><span class="date">'+E(dateText(now,{weekday:'short',month:'short',day:'numeric'}))+'</span></div>'+
      '<section class="hero vocab-hero"><div class="hero-copy"><div class="hero-kicker"><i></i>'+E(first.label)+'</div><h2>'+E(first.title)+'</h2><p>'+E(first.body)+'</p>'+
      '<div class="hero-actions"><a id="desk-continue" class="hero-btn" href="'+E(first.href)+'">'+E(first.action)+'</a>'+(alternate?'<a class="desk-alternate" href="'+E(alternate.href)+'">'+E(alternate.label)+'</a>':'')+'</div>'+(why||'')+
      '</div></section>'+
      (other.length?'<details class="desk-saved"><summary>Other saved work ('+other.length+')</summary><ul>'+other.map(w=>'<li><a href="'+E(w.href)+'">'+E(w.title)+'</a><small>'+E(w.label)+'</small></li>').join('')+'</ul></details>':'')+
      '<div class="desk-tools">'+card('motion','Continue journey','Your next pack, review, or writing brief','#journey')+
      card('layers',activePacks?'My packs':'Explore packs',activePacks?activePacks+' on your shelf':'Find a pack by topic or word',activePacks?url('packs',{shelf:'mine'}):'#packs')+
      card('notebook','Notebook',notebookCount?notebookCount+' saved '+(notebookCount===1?'word':'words'):'Collect words from your reading','#notebook')+'</div>'+
      '<div class="desk-review"><span>'+D.icon('time',17)+' '+(due?'<a href="#review">'+due+' word '+(due===1?'review':'reviews')+' due</a>':later?'Next word review · '+E(dateText(later,shortDate)):'Word reviews appear here after practice.')+'</span>'+
      (revisit?'<a href="'+E(url('packs',{id:revisit.packId,followup:revisit.id}))+'">Revisit a pack writing brief</a>':'')+
      '<a href="#lexicon">Browse original word studies</a></div></section>';
  }
  const exportButton=document.getElementById('export-journal');
  exportButton.addEventListener('click',()=>{
    const lines=['# Diction vocabulary notes','',new Date().toLocaleDateString(),''];
    for(const j of D.state.packs?.journal||[]){
      lines.push('## '+j.title,j.date,'','Pack writing brief',j.prompt,j.passage,'','Reasoning',j.rationale||'','');
      if(j.followupPassage)lines.push('Follow-up brief',j.followupPrompt,j.followupPassage,j.followupReason||'','');
    }
    for(const n of D.state.notes)lines.push('## '+n.word,n.sense||'',n.source||'',n.sourceName||'',n.goal||'','');
    for(const sample of D.state.coachWriting||[])lines.push('## '+sample.word,sample.date,'',sample.sentence,'');
    const guided=D.state.drafts.guidedWord;
    if(guided?.sentence)lines.push('## Unfinished word practice',guided.sentence,'');
    if(D.state.quickRound?.draft?.sentence)lines.push('## Unfinished quick practice',D.state.quickRound.draft.sentence,'');
    const blob=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a');link.href=blob;link.download='Diction-vocabulary.md';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(blob),1000);
  });
  D.render=()=>{
    D.initQuickLookup?.(document.body);
    const [view,opts]=getRoute();
    exportButton.hidden=!(D.state.notes.length||D.state.packs?.journal?.length||D.state.coachWriting?.length||D.state.drafts.guidedWord?.sentence||D.state.quickRound?.draft?.sentence);
    D.view=view;D.options=opts;document.title=screens[view][0]+' · Diction';
    D.root.dataset.view=view;let active=view==='guided'&&opts.return==='journey'?'journey':view==='guided'?'home':view==='review'?'notebook':view==='lexicon'?'dictionary':view;
    document.getElementById('nav').innerHTML=navKeys.map(k=>'<a href="'+url(k)+'"'+(active===k?' aria-current="page"':'')+'>'+D.icon(screens[k][1],17)+'<span>'+screens[k][0]+'</span></a>').join('');
    if (view==='home') home(); else D[view](opts);
  };
  document.addEventListener('click',event=>{
      const link=event.target.closest('a[href^="#"]');
      if(event.defaultPrevented||!link)return;
      const hash=link.getAttribute('href');
      if(hash==='#main'){event.preventDefault();D.root.focus();return;}
      const [view,params='']=hash.slice(1).split('?');
      if(!Object.prototype.hasOwnProperty.call(screens,view))return;
      event.preventDefault();D.go(view,Object.fromEntries(new URLSearchParams(params)));
    });
  window.addEventListener('DOMContentLoaded',()=>{
    D.render();
    D.loadDictionaryEditions().then(changed=>{
      if(!changed)return;
      const editing=D.root.contains(document.activeElement) && document.activeElement.matches('input,textarea,select');
      const editionShelf=D.view==='packs' && (!Object.keys(D.options).length || (D.options.id?.startsWith('edition/') && !D.options.study && !D.options.challenge && !D.options.followup));
      if(!editing && (D.view==='home' || D.view==='journey' || editionShelf))D.render();
    });
  });
})();

