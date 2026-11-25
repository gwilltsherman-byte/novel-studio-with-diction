
(() => {
  'use strict';
  const D = window.Diction;
  const fold = value => String(value || '').trim().toLowerCase();
  const studyFor = (word,sense) => sense.source==='Diction word study' &&
    D.words.find(w=>fold(w.word)===fold(word) && w.sense===sense.definition);
  function savedSense(word,sense) {
    const study=studyFor(word,sense);
    return D.state.notes.find(n=>fold(n.word)===fold(word) && n.sense===sense.definition &&
      ((n.dictionarySource || n.sourceName)===sense.source || (study && study.id===n.wordId)));
  }
  D.saveDictionarySense = (word,sense,example='',personal=false) => {
    const def={...sense,definition:sense.definition.trim()};
    let note=savedSense(word,def);
    if(!note){
      const study=studyFor(word,def);
      const id='note-'+(window.crypto?.randomUUID?.() || Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
      note={id,word,sense:def.definition,source:study?.example || '',sourceName:def.source,goal:'',
        created:new Date().toISOString(),dictionarySource:def.source,dictionaryPos:def.pos || '',personalMeaning:personal};
      if(study)note.wordId=study.id;
      D.state.notes.unshift(note);
    }
    if(example){note.source=example;note.sourceName=def.source+' · Example sentence by writer';note.dictionarySource=def.source;}
    const key=note.wordId || note.id;
    if(!D.state.reviews[key]){
      D.state.reviews[key]={due:new Date().toISOString(),level:0};
      D.onReviewChange?.();
    }
    D.save();
    return note;
  };

  function lower(words,term) {
    let lo=0,hi=words.length;
    while(lo<hi){
      const mid=Math.floor((lo+hi)/2);
      if(fold(words[mid])<term)lo=mid+1;else hi=mid;
    }
    return lo;
  }
  // One lookup serves the quick-lookup dialog here and the definition sheet inside a lesson.
  let lookupIndex, lookupDefined=[];
  D.lookupTerm = (query,limit=5) => {
    const term=fold(query),data=D.dictionaryData;
    const found={word:'',senses:[],suggestions:[]};
    if(!term || !data)return found;
    if(data.definedHeadwords!==lookupIndex) {
      lookupIndex=data.definedHeadwords;
      lookupDefined=(lookupIndex||[]).slice().sort((a,b)=>fold(a)<fold(b)?-1:fold(a)>fold(b)?1:0);
    }
    const full=data.headwords,at=lower(full,term);
    if(at<full.length&&fold(full[at])===term)found.word=full[at];
    const personal=D.state.notes.filter(n=>n.personalMeaning&&fold(n.word)===term&&n.sense);
    if(!found.word&&personal.length)found.word=personal[0].word;
    const unique=new Set([term]);
    for(const words of [lookupDefined,full]){
      for(let i=lower(words,term);i<words.length&&found.suggestions.length<limit;i++){
        const key=fold(words[i]);
        if(!key.startsWith(term))break;
        if(!unique.has(key)){unique.add(key);found.suggestions.push(words[i]);}
      }
    }
    if(found.word)found.senses=data.lookup(found.word).filter(s=>typeof s?.definition==='string' && s.definition.trim()).map(s=>({...s,definition:s.definition.trim(),source:s.source||data.source}));
    for(const n of personal)found.senses.push({definition:n.sense,source:'Writer’s own meaning',pos:''});
    return found;
  };
  D.savedDictionarySense = savedSense;
  D.initQuickLookup = mount => {
    if(mount?.nodeType===9)mount=mount.body;
    const trigger=mount?.querySelector('#quick-lookup-open');
    if(!trigger || mount.querySelector('#ql-dialog'))return;
    const shortcut=trigger.querySelector('#lookup-shortcut');
    if(shortcut)shortcut.textContent=/mac|iphone|ipad/i.test(window.navigator?.userAgentData?.platform||window.navigator?.platform||'')?'⌘K':'Ctrl K';
    const dialog=document.createElement('dialog'), scrim=document.createElement('div');
    dialog.id='ql-dialog';dialog.className='ql-dialog';
    dialog.setAttribute('aria-labelledby','ql-title');dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-modal','true');trigger.setAttribute('aria-controls',dialog.id);
    scrim.className='ql-scrim';scrim.hidden=true;scrim.setAttribute('aria-hidden','true');
    dialog.innerHTML='<div class="ql-top"><h2 id="ql-title">Quick lookup</h2><button class="back" id="ql-close" type="button" aria-label="Close lookup">Close</button></div>'+
      '<form id="ql-form" role="search"><label for="ql-query">Word or phrase</label><input id="ql-query" type="search" autocomplete="off" spellcheck="false" maxlength="180" placeholder="e.g. temper"></form>'+
      '<div id="ql-results"></div><p id="ql-status" class="ql-status" aria-live="polite" aria-atomic="true"></p>';
    mount.append(scrim,dialog);
    const input=dialog.querySelector('#ql-query'), results=dialog.querySelector('#ql-results'), status=dialog.querySelector('#ql-status');
    const form=dialog.querySelector('#ql-form'), closeButton=dialog.querySelector('#ql-close');
    let origin,pointerOrigin,inside=false,active=false,native=false,composing=false,word='',senses=[],suggestions=[],limit=3,notesChanged=false;
    const inertSiblings=[];
    function remember() {
      const el=document.activeElement;
      let text='', start, end;
      if(el&&mount.contains(el)&&typeof el.selectionStart==='number'){
        start=el.selectionStart;end=el.selectionEnd;text=el.value.slice(start,end);
      }else{
        const selection=window.getSelection?.();
        if(selection?.anchorNode && mount.contains(selection.anchorNode)&&mount.contains(selection.focusNode))text=selection.toString();
      }
      text=text.trim();
      return {el:el&&mount.contains(el)?el:trigger,start,end,text:text.length<=100&&!/[\r\n]/.test(text)?text:''};
    }
    function update() {
      if(form.hidden)return;
      word='';senses=[];suggestions=[];
      if(!fold(input.value) || !D.dictionaryData){results.innerHTML='';status.textContent='';return;}
      ({word,senses,suggestions}=D.lookupTerm(input.value));
      const esc=D.esc;
      results.innerHTML=(word?'<h3>'+esc(word)+'</h3>':'')+
        (senses.length?'<ol class="ql-senses">'+senses.slice(0,limit).map((s,i)=>{
          const saved=savedSense(word,s);
          return '<li><small>'+esc([s.pos,s.source].filter(Boolean).join(' · '))+'</small><p>'+esc(s.definition)+'</p>'+
            '<button type="button" class="secondary" data-ql-save="'+i+'"'+(saved?' disabled':'')+'>'+(saved?'Saved to notebook':'Save to notebook')+'</button></li>';
        }).join('')+'</ol>'+(limit<senses.length?'<button type="button" class="back" data-ql-more>More meanings</button>':''):
          word?'<p>This spelling is indexed. Your editions have no definition for it.</p>':'')+
        (!senses.length && (word || !suggestions.length)?'<details class="ql-personal"><summary>Save my own meaning</summary><form id="ql-own"><label for="ql-meaning">Meaning of “'+esc(word||input.value.trim())+'”</label><textarea id="ql-meaning" rows="2" maxlength="600" required></textarea><button class="secondary">Save to notebook</button></form></details>':'')+
        (suggestions.length?'<div class="ql-related"><p>'+(word?'Related spellings':'Matching words')+'</p><div>'+suggestions.map(w=>'<button type="button" data-ql-word="'+esc(w)+'">'+esc(w)+'</button>').join('')+'</div></div>':'');
      status.textContent=word?(senses.length+' '+(senses.length===1?'meaning':'meanings')+' for '+word):suggestions.length?suggestions.length+' suggestions':'No matching words.';
    }
    function open(saved) {
      if(active){(form.hidden?closeButton:input).focus();return;}
      active=true;origin=saved||remember();notesChanged=false;limit=3;
      const recall=['#coach-recall','#lx-attemptform','#pk-skip'].some(s=>D.root.querySelector(s));
      const independent=D.view==='packs' && D.options?.followup && !!D.root.querySelector('[name="passage"]');
      form.hidden=recall||independent;
      input.value=form.hidden?'':origin.text;
      if(form.hidden){
        results.innerHTML='';
        status.textContent=recall?'Finish this recall attempt to look up a word.':'Finish this independent writing step to look up a word.';
      }else update();
      try{dialog.showModal();native=true;}catch{
        native=false;dialog.setAttribute('open','');scrim.hidden=false;
        for(const el of mount.children)if(el!==dialog&&el!==scrim&&'inert' in el&&!el.inert){el.inert=true;inertSiblings.push(el);}
      }
      (form.hidden?closeButton:input).focus();if(input.value)input.select();
    }
    function finish() {
      if(!active)return;
      active=false;scrim.hidden=true;
      while(inertSiblings.length)inertSiblings.pop().inert=false;
      // Refresh a visible notebook list only. Other screens may contain unsaved editing fields.
      if(notesChanged && D.view==='notebook'&&D.root.querySelector('#lx-notes')){
        const term=D.root.querySelector('#lx-search')?.value;
        D.notebook();
        const search=D.root.querySelector('#lx-search');
        if(search&&term){search.value=term;search.dispatchEvent(new Event('input'));}
      }
      const old=origin?.el;
      const target=old?.isConnected?old:(old?.id==='lx-search'&&D.root.querySelector('#lx-search'))||trigger;
      target.focus({preventScroll:true});
      if(typeof origin?.start==='number'&&typeof target.setSelectionRange==='function')target.setSelectionRange(origin.start,origin.end);
      pointerOrigin=null;origin=null;
    }
    function close() {
      if(native && dialog.open)dialog.close();else dialog.removeAttribute('open');
      finish();
    }
    trigger.addEventListener('pointerdown',()=>{pointerOrigin=remember();});
    document.addEventListener('pointerdown',e=>{inside=mount.contains(e.target);});
    trigger.addEventListener('click',()=>{const saved=pointerOrigin;pointerOrigin=null;open(saved);});
    scrim.addEventListener('click',close);
    closeButton.addEventListener('click',close);
    dialog.addEventListener('close',()=>{if(!dialog.open)finish();});
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    dialog.addEventListener('click',e=>{
      if(e.target===dialog){
        const r=dialog.getBoundingClientRect();
        if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();
        return;
      }
      const b=e.target.closest('button');if(!b || !results.contains(b))return;
      if(b.hasAttribute('data-ql-word')){input.value=b.dataset.qlWord;limit=3;update();input.focus();return;}
      if(b.hasAttribute('data-ql-more')){const old=limit;limit+=5;update();results.querySelector('[data-ql-save="'+old+'"]')?.focus();return;}
      const s=senses[Number(b.dataset.qlSave)];
      if(s&&!b.disabled){
        D.saveDictionarySense(word,s);notesChanged=true;b.disabled=true;b.textContent='Saved to notebook';
        status.textContent='Saved '+word+' to your notebook.';input.focus();
      }
    });
    input.addEventListener('compositionstart',()=>{composing=true;});
    input.addEventListener('compositionend',()=>{composing=false;limit=3;update();});
    input.addEventListener('input',()=>{if(!composing){limit=3;update();}});
    form.addEventListener('submit',e=>{
      e.preventDefault();if(composing)return;
      if(!word && suggestions.length){input.value=suggestions[0];limit=3;update();}
    });
    dialog.addEventListener('submit',e=>{
      if(e.target.id!=='ql-own')return;
      e.preventDefault();
      const field=results.querySelector('#ql-meaning'),definition=field.value.trim(),head=word||input.value.trim();
      if(!definition||!head){field.value='';field.reportValidity();return;}
      D.saveDictionarySense(head,{definition,source:'Writer’s own meaning',pos:''},'',true);
      notesChanged=true;update();status.textContent='Saved your meaning of '+head+'.';input.focus();
    });
    document.addEventListener('keydown',e=>{
      if(e.isComposing||composing||e.keyCode===229)return;
      const inApp=mount.contains(e.target)||mount.contains(document.activeElement)||(inside&&e.target===document.body);
      if(!inApp)return;
      if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&!e.altKey&&e.key.toLowerCase()==='k'){e.preventDefault();open();return;}
      if(!active)return;
      if(e.key==='Escape'){e.preventDefault();close();return;}
      if(e.key==='Tab'&&!native){
        const stops=form.hidden?[closeButton]:Array.from(dialog.querySelectorAll('button:not(:disabled),input,textarea,summary')).filter(el=>el.offsetWidth||el.offsetHeight);
        const first=stops[0],last=stops.at(-1);
        if((e.shiftKey&&document.activeElement===first)||(!e.shiftKey&&document.activeElement===last)){
          e.preventDefault();(e.shiftKey?last:first).focus();
        }
      }
    });
    D.refreshQuickLookup=()=>{if(active)update();};
  };
})();

