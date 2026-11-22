
(() => {
  'use strict';
  const D = window.Diction;
  const pageSize = 24;
  const fmt = n => Number(n || 0).toLocaleString();
  const esc = value => D.esc(value ?? '');
  const folded = s => String(s).trim().toLowerCase();
  const entryUrl = w => 'https://en.wiktionary.org/wiki/' + encodeURIComponent(w.replace(/ /g, '_')) + '#English';
  const licenseUrl = 'https://creativecommons.org/licenses/by-sa/4.0/';
  const link = (href, text) => '<a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + '</a>';
  const button = (action, text, cls='secondary') => '<button type="button" data-action="' + action + '" class="' + cls + '">' + esc(text) + '</button>';
  const cachedOnline = new Map();
  let request;
  let restored=false, restoration;

  function lowerBound(heads, query) {
    let lo=0, hi=heads.length;
    while (lo < hi) {
      const mid = Math.floor((lo+hi)/2);
      if (folded(heads[mid]) < query) lo=mid+1; else hi=mid;
    }
    return lo;
  }
  function sourceDetails(data) {
    return '<details class="dict-source"><summary>Coverage and sources</summary><div><p>'+esc(data.description)+'</p><p>'+esc(data.attribution)+'</p>' +
      (/^https:\/\//.test(data.url || '') ? '<p>'+link(data.url, data.source || 'Source documentation')+'</p>' : '') +
      (data.license ? '<p class="dict-license">'+esc(data.license)+'</p>' : '') + '</div></details>';
  }
  D.dictionary = (options={}) => {
    if (request) { request.abort(); request=null; }
    if (!restored && typeof D.loadDictionaryEditions==='function') {
      D.root.innerHTML='<section class="dict-page" id="dict-loading" role="status"><h1>English dictionary</h1><p>Opening your saved editions…</p></section>';
      const loading=D.root.querySelector('#dict-loading');
      restoration ||= D.loadDictionaryEditions().catch(()=>false).finally(()=>{restored=true;});
      restoration.then(()=>{if(loading.isConnected)D.dictionary(options);});
      return;
    }
    const data = D.dictionaryData;
    if (!data) {D.root.innerHTML='<h1>English dictionary</h1><p>The word index could not be opened.</p>';return;}
    const from = {query:String(options.query || '').slice(0,180),page:Math.max(0,Math.floor(Number(options.page)||0))};
    if(options.pack) from.pack=String(options.pack);
    if (options.word && String(options.word).trim()) {entry(data,String(options.word).trim().slice(0,180),from);return;}
    const heads=data.headwords;
    D.root.innerHTML='<section class="dict-page"><header class="pagehead dict-head"><div><h1>English dictionary</h1><p>Find a word or phrase and choose a meaning to practice.</p></div>'+button('packs','Vocabulary packs')+'</header>'+
      '<div class="dict-catalog"><form id="dict-search" role="search"><label for="dict-query">Look up a word or phrase</label><div><input type="search" id="dict-query" autocomplete="off" spellcheck="false" maxlength="180" placeholder="e.g. temper" value="'+esc(from.query)+'"><button type="submit" class="primary">Look up</button></div></form>'+
      '<p class="dict-counts">'+fmt(data.counts.headwords)+' indexed entries · '+fmt(data.counts.defined)+' with offline meanings</p></div><div id="dictionary-import"></div>'+
      '<div class="dict-browse" aria-label="Browse by initial letter"><button type="button" data-letter="">All</button>'+
      Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ',l=>'<button type="button" aria-label="Browse '+l+'" data-letter="'+l.toLowerCase()+'">'+l+'</button>').join('')+'</div>'+
      '<div class="dict-results-info"><p id="dict-count" aria-live="polite"></p></div><div id="dict-entries"></div><div id="dict-pager" class="dict-pager"></div>'+sourceDetails(data)+'</section>';
    const root=D.root.querySelector('.dict-page'), q=sel=>root.querySelector(sel);
    const input=q('#dict-query'), result=q('#dict-entries'), pager=q('#dict-pager');
    let page=from.page;
    function open(word) {D.go('dictionary',{...from,word,query:input.value.trim(),page});}
    function update() {
      const term=folded(input.value);
      const start=term ? lowerBound(heads,term) : 0;
      const end=term ? lowerBound(heads,term+'\uffff') : heads.length;
      const total=end-start;
      page=Math.min(page, Math.max(0,Math.ceil(total/pageSize)-1));
      const first=start+page*pageSize, last=Math.min(first+pageSize,end);
      q('#dict-count').textContent=total ? (term ? fmt(total)+' prefix '+(total===1?'match':'matches') : 'Browse all entries')+' · Showing '+fmt(first-start+1)+'–'+fmt(last-start) : 'No matching headwords';
      result.innerHTML=total ? '<ul class="dict-grid">'+heads.slice(first,last).map((w,i)=>'<li><button type="button" data-at="'+(first+i)+'">'+esc(w)+'</button></li>').join('')+'</ul>' : '<div class="dict-empty"><h2>Outside this index</h2><p>You can look up this spelling online or record a meaning in your own words.</p>'+button('outside','Open “'+input.value.trim()+'”')+'</div>';
      pager.innerHTML=total>pageSize ? '<button type="button" data-step="-1" '+(first===start?'disabled':'')+'>Previous</button><span>Page '+fmt(page+1)+' of '+fmt(Math.ceil(total/pageSize))+'</span><button type="button" data-step="1" '+(last===end?'disabled':'')+'>Next</button>' : '';
      root.querySelectorAll('[data-letter]').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.letter===term)));
    }
    input.oninput=()=>{page=0; update();};
    q('#dict-search').onsubmit=e=>{e.preventDefault();if (input.value.trim()) open(input.value.trim()); else input.focus();};
    root.addEventListener('click',e=>{
      const b=e.target.closest('button'); if(!b || !root.contains(b)) return;
      if ('letter' in b.dataset) {input.value=b.dataset.letter;page=0;update();}
      if ('at' in b.dataset) open(heads[Number(b.dataset.at)]);
      if ('step' in b.dataset) {page+=Number(b.dataset.step);update();q('#dict-count').setAttribute('tabindex','-1');q('#dict-count').focus();}
      if (b.dataset.action==='outside') open(input.value.trim());
      if (b.dataset.action==='packs') D.go('packs');
    });
    update();
    D.showDictionaryImport?.(q('#dictionary-import'),()=>D.dictionary({...from,query:input.value,page}));
  };

  function noteFor(word, sense, example, personal) {
    if(D.saveDictionarySense)return D.saveDictionarySense(word,sense,example,personal);
    const def = sense.definition.trim();
    let note = D.state.notes.find(n=>folded(n.word)===folded(word)&&n.sense===def&&(n.dictionarySource||n.sourceName)===sense.source);
    if (!note) {
      const id='note-'+(window.crypto?.randomUUID?.() || Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
      note={id,word,sense:def,source:example,sourceName:sense.source,goal:'',created:new Date().toISOString(),dictionaryPos:sense.pos||'',dictionarySource:sense.source,personalMeaning:personal};
      D.state.notes.unshift(note);
    } else if(example) note.source=example;
    if(note.source) note.sourceName=sense.source+' · Example sentence by writer';
    if (!D.state.reviews[note.id]) D.state.reviews[note.id]={due:new Date().toISOString(),level:0};
    D.save();return note;
  }
  function asText(html) {
    const clean=document.createElement('template'); clean.innerHTML=String(html || '');
    clean.content.querySelectorAll('script,style,figure,img,source,audio,video,sup.reference').forEach(el=>el.remove());
    return clean.content.textContent.replace(/\s+/g,' ').trim();
  }
  async function loadOnline(word, signal) {
    const response=await fetch('https://en.wiktionary.org/api/rest_v1/page/definition/'+encodeURIComponent(word.replace(/ /g,'_')),{signal,credentials:'omit',referrerPolicy:'no-referrer',headers:{Accept:'application/json'}});
    if(response.status===404) return [];
    if(!response.ok) throw Error();
    const payload=await response.json();
    if(!Array.isArray(payload.en)) return [];
    const source='English Wiktionary contributors · '+entryUrl(word)+' · CC BY-SA 4.0 ('+licenseUrl+') · formatting removed';
    const senses=payload.en.flatMap(group=>(Array.isArray(group.definitions)?group.definitions:[]).map(s=>({pos:asText(group.partOfSpeech),definition:asText(s.definition),source,online:true}))).filter(s=>s.definition);
    return senses;
  }
  function entry(data, searched, from, edits={}) {
    const at=lowerBound(data.headwords,folded(searched));
    const found=at<data.headwords.length && folded(data.headwords[at])===folded(searched);
    const word=found?data.headwords[at]:searched;
    const local=data.lookup(word).filter(s=>s.definition).map(s=>({...s,source:s.source || data.source}));
    const study=(D.words||[]).find(w=>folded(w.word)===folded(word));
    if(study && !local.some(s=>s.definition===study.sense)) local.push({pos:'Writing study',definition:study.sense,source:'Diction word study'});
    let senses=[...local,...(cachedOnline.get(word)||[])], selected=senses.length?0:-1;
    if(edits.personal) selected=-1;
    else if(edits.definition) {const i=senses.findIndex(s=>s.definition===edits.definition && s.source===edits.source);if(i>=0)selected=i;}
    D.root.innerHTML='<section class="dict-page"><button class="back" type="button" data-action="back">Back to dictionary</button><header class="pagehead dict-entry-head"><h1>'+esc(word)+'</h1><p>'+(found?'Indexed headword':'Outside the offline index')+'</p></header>'+
      '<div class="dict-detail"><article class="panel dict-sense-panel"><h2>Meanings</h2><div id="dict-senses"></div>'+(!local.length?'<div id="dictionary-import"></div>':'')+'<div class="dict-online"><p id="dict-online-status" aria-live="polite"></p><div class="actions">'+button('online','Load English meanings online','secondary')+link(entryUrl(word),'Read on Wiktionary')+'</div><p class="dict-meta">Online lookup sends this headword to English Wiktionary.</p></div></article>'+
      '<form class="panel dict-save"><h2>Study this sense</h2><p id="dict-selection" class="dict-selected" aria-live="polite"></p><div id="dict-custom"><label class="field-label" for="dict-meaning">Meaning in your own words</label><textarea id="dict-meaning" maxlength="600" rows="3"></textarea></div>'+
      '<label class="field" for="dict-example"><span class="field-label">Your example sentence (optional)</span><textarea id="dict-example" maxlength="2200" rows="3"></textarea></label><div class="actions"><button type="submit" class="primary" name="dest" value="packs">'+(from.pack?'Add to this pack':'Add to a pack')+'</button><button type="submit" class="secondary" name="dest" value="notebook">Save to notebook</button></div><p class="dict-meta">Adding a sense to a pack also saves it in your notebook.</p></form></div></section>';
    D.manuscriptLink?.offer(D.root.querySelector('.dict-entry-head'),word);
    const root=D.root.querySelector('.dict-page'), q=sel=>root.querySelector(sel), container=q('#dict-senses');
    if(edits.meaning)q('#dict-meaning').value=edits.meaning;
    if(edits.example)q('#dict-example').value=edits.example;
    let pos='';
    function showSelected() {
      const current=senses[selected];
      q('#dict-custom').hidden=!!current;
      q('#dict-meaning').required=!current;
      q('#dict-selection').textContent=current?current.definition:'Write a cue that will help you recall this word.';
    }
    function showSenses() {
      const parts=[...new Set(senses.map(s=>s.pos).filter(Boolean))];
      const list=senses.map((s,i)=>({s,i})).filter(({s})=>!pos||s.pos===pos);
      if(selected>=0&&!list.some(({i})=>i===selected)) selected=list[0]?.i ?? -1;
      container.innerHTML=(parts.length>1?'<label class="dict-pos">Part of speech or source<select id="dict-pos"><option value="">All senses</option>'+parts.map(p=>'<option value="'+esc(p)+'" '+(p===pos?'selected':'')+'>'+esc(p)+'</option>').join('')+'</select></label>':'')+
      (list.length?'<fieldset class="dict-senses"><legend class="dict-visually-hidden">Choose a meaning</legend>'+list.map(({s,i})=>'<label><input type="radio" name="dict-sense" value="'+i+'" '+(selected===i?'checked':'')+'><span><span class="dict-pos-tag">'+esc(s.pos || 'Sense')+'</span>'+esc(s.definition)+'<small>'+(s.online?link(entryUrl(word),'Wiktionary contributors')+' · '+link(licenseUrl,'CC BY-SA 4.0'):esc(s.source))+'</small></span></label>').join('')+'</fieldset>':'<p class="dict-hint">There is no bundled definition for this spelling. Look it up online or write a meaning for practice.</p>')+
      '<label class="dict-personal"><input type="radio" name="dict-sense" value="-1" '+(selected===-1?'checked':'')+'> Use my own meaning</label>';
      showSelected();
    }
    root.addEventListener('change',e=>{
      if(e.target.id==='dict-pos'){pos=e.target.value;showSenses();q('#dict-pos')?.focus();}
      if(e.target.name==='dict-sense'){selected=Number(e.target.value);showSelected();}
    });
    q('.dict-save').onsubmit=e=>{
      e.preventDefault();
      let s=senses[selected];
      if(!s){const cue=q('#dict-meaning');if(!cue.value.trim()){cue.value='';cue.reportValidity();return;}s={pos:'',definition:cue.value.trim(),source:'Writer’s own meaning'};}
      const note=noteFor(word,s,q('#dict-example').value.trim(),selected===-1);
      if(e.submitter?.value==='notebook')D.go('notebook',{id:note.id});else D.go('packs',{addNote:note.id,pack:from.pack});
    };
    q('[data-action="back"]').onclick=()=>D.go('dictionary',from);
    const online=q('[data-action="online"]'),status=q('#dict-online-status');
    online.hidden=cachedOnline.has(word);
    online.onclick=async()=>{
      online.disabled=true;status.textContent='Looking up English meanings…';
      const controller=new AbortController(); request=controller;
      const timeout=setTimeout(()=>controller.abort(),10000);
      try {
        const fetched=await loadOnline(word,controller.signal);
        if(!root.isConnected)return;
        if(fetched.length) {
          cachedOnline.set(word,fetched);if(cachedOnline.size>30)cachedOnline.delete(cachedOnline.keys().next().value);
          senses=[...local,...fetched];pos='';if(selected===-1&&!q('#dict-meaning').value.trim())selected=local.length;
          showSenses();online.hidden=true;status.textContent=fmt(fetched.length)+' English '+(fetched.length===1?'sense loaded.':'senses loaded.');
        }else status.textContent='No English meanings were returned for this spelling. You can check the source page or use your own cue.';
      }catch {if(root.isConnected)status.textContent='Online lookup is unavailable. You can open the source page or enter your own cue.';}
      finally {clearTimeout(timeout);online.disabled=false;if(request===controller)request=null;}
    };
    showSenses();
    if(!local.length)D.showDictionaryImport?.(q('#dictionary-import'),()=>{
      entry(D.dictionaryData,word,from,{definition:senses[selected]?.definition,source:senses[selected]?.source,
        personal:selected===-1 && !!q('#dict-meaning').value.trim(),meaning:q('#dict-meaning').value,example:q('#dict-example').value});
    });
  }
})();

