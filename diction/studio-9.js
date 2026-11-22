
(() => {
  'use strict';
  const D = window.Diction;
  const oewn = {
    name:'Open English Wordnet 2025', id:'oewn-2025',
    file:'https://en-word.net/static/english-wordnet-2025.zip',
    source:'https://github.com/globalwordnet/english-wordnet/releases/tag/2025-edition',
    license:'CC BY 4.0 · Open English Wordnet contributors'
  };
  const websterSource='https://github.com/matthewreagan/WebstersEnglishDictionary';
  const webster={
    id:'webster-gutenberg-2009',name:'Webster’s Unabridged · historical edition',
    file:'https://raw.githubusercontent.com/matthewreagan/WebstersEnglishDictionary/master/dictionary_compact.json',
    license:'Webster’s Unabridged / Project Gutenberg, 2009 file · Matthew Reagan JSON, GPL v2'
  };
  const mib=1024*1024, maxBytes=65*mib;
  const editions=new Map();
  D.installedDictionaryEditions = () => editions.values();
  let base, dbPromise, restoring, busy=false, message='';
  const cleanWord=s=>typeof s==='string'?s.trim().normalize('NFC'):'';
  const key=s=>cleanWord(s).toLowerCase();
  function fail(msg){throw new Error(msg);}
  function add(map,word,definition,pos=''){
    const spelling=cleanWord(word);
    if(!spelling || spelling.length>160 || /[\u0000-\u001f]/.test(spelling))return false;
    if(typeof definition!=='string'||!definition.trim()||definition.length>65536)return false;
    const lemma=key(spelling);
    let item=map.get(lemma);
    if(!item) {item={word:spelling,senses:[]};map.set(lemma,item);}
    const meaning=definition.trim();
    const part=typeof pos==='string'?pos.slice(0,80).trim():'';
    if(!item.senses.some(s=>s.definition===meaning&&s.pos===part))item.senses.push({definition:meaning,pos:part});
    return true;
  }
  async function parseJson(file){
    let data;
    try{data=JSON.parse((await file.text()).replace(/^\uFEFF/,''));}catch{fail('This file does not contain valid JSON.');}
    if(!data || typeof data!=='object' || Array.isArray(data))fail('Use a JSON object with words as keys and definitions as values.');
    const map=new Map();
    let skipped=0;
    for(const word of Object.keys(data)){
      const values=Array.isArray(data[word])?data[word]:[data[word]];
      let valid=false;
      for(const value of values){
        if(typeof value==='string')valid=add(map,word,value)||valid;
        else if(value && typeof value==='object')valid=add(map,word,value.definition,value.pos)||valid;
      }
      if(!valid)skipped++;
      if(map.size>650000)fail('This edition exceeds the 650,000-headword import limit.');
    }
    if(!map.size)fail('No word definitions were found. Check the JSON example below.');
    return {map,skipped};
  }
  async function boundedBytes(stream,limit){
    const reader=stream.getReader(),parts=[];
    let size=0;
    try{
      while(true){
        const {value,done}=await reader.read();
        if(done)break;
        size+=value.byteLength;
        if(size>limit){await reader.cancel();fail('The file exceeds the supported size limit.');}
        parts.push(value);
      }
    }finally{reader.releaseLock();}
    const out=new Uint8Array(size);
    let start=0;for(const part of parts){out.set(part,start);start+=part.length;}
    return out;
  }
  // Read the WordNet database members only. Paths are never written to the file system.
  function zipMembers(bytes){
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    const u16=i=>view.getUint16(i,true),u32=i=>view.getUint32(i,true);
    let end=bytes.length-22;
    while(end>=Math.max(0,bytes.length-65557)&&u32(end)!==0x06054b50)end--;
    if(end<Math.max(0,bytes.length-65557))fail('This is not a supported ZIP archive.');
    const count=u16(end+10),files=new Map(),decoder=new TextDecoder();
    let at=u32(end+16);
    if(count>1500 || u16(end+4)||u16(end+6))fail('Choose a single WordNet WNDB ZIP.');
    for(let i=0;i<count;i++){
      if(at+46>bytes.length||u32(at)!==0x02014b50)fail('The ZIP directory is incomplete.');
      const nameLen=u16(at+28),extra=u16(at+30),comment=u16(at+32);
      const path=decoder.decode(bytes.subarray(at+46,at+46+nameLen));
      const match=/(?:^|\/)data\.(noun|verb|adj|adv)$/.exec(path);
      if(match){
        const local=u32(at+42),compressed=u32(at+20),size=u32(at+24),method=u16(at+10);
        if(files.has(match[1])||size>64*mib||(u16(at+8)&1)||![0,8].includes(method)||local+30>bytes.length||u32(local)!==0x04034b50)fail('Unsupported WordNet ZIP member.');
        const start=local+30+u16(local+26)+u16(local+28);
        if(start+compressed>bytes.length)fail('The WordNet download is incomplete.');
        files.set(match[1],{size,method,bytes:bytes.subarray(start,start+compressed)});
      }
      at+=46+nameLen+extra+comment;
    }
    if(files.size!==4)fail('Choose the WordNet WNDB ZIP containing data.noun, data.verb, data.adj and data.adv.');
    return files;
  }
  async function parseWordnet(file){
    const members=zipMembers(new Uint8Array(await file.arrayBuffer())),map=new Map(),decoder=new TextDecoder();
    const tags={n:'noun',v:'verb',a:'adjective',s:'adjective',r:'adverb'};
    for(const member of members.values()){
      let bytes=member.bytes;
      if(member.method===8){
        if(typeof DecompressionStream==='undefined')fail('Use a current browser for compressed WordNet files, or import a JSON edition.');
        bytes=await boundedBytes(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')),member.size);
      }
      if(bytes.length!==member.size)fail('The WordNet download is incomplete.');
      for(const line of decoder.decode(bytes).split('\n')){
        if(!/^\d{8}\s/.test(line))continue;
        const mark=line.indexOf(' | ');
        if(mark<0)continue;
        const fields=line.slice(0,mark).trim().split(/\s+/);
        const count=parseInt(fields[3],16),pos=tags[fields[2]],gloss=line.slice(mark+3).trim();
        if(!pos||!Number.isFinite(count)||count<1||4+count*2>fields.length)continue;
        for(let i=0;i<count;i++)add(map,fields[4+i*2].replace(/\((?:a|p|ip)\)$/,'').replaceAll('_',' '),gloss,pos);
      }
    }
    if(!map.size)fail('No word senses were found in this WordNet edition.');
    return {map,skipped:0};
  }
  function rebuild(){
    base ||= D.dictionaryData;
    if(!base)return;
    if(!editions.size){D.dictionaryData=base;return;}
    const entries=new Map();
    for(const entry of editions.values()){
      for(const [word,head] of entry.map){
        let item=entries.get(word);
        if(!item){item={word:head.word,senses:[]};entries.set(word,item);}
        for(const s of head.senses)item.senses.push({...s,source:entry.name});
      }
    }
    const all=new Map(base.headwords.map(w=>[key(w),w]));
    const definedKeys=new Set(base.definedHeadwords.map(key));
    for(const [word,head] of entries){
      if(!all.has(word))all.set(word,head.word);
      definedKeys.add(word);
    }
    const headwords=Array.from(all.keys()).sort().map(k=>all.get(k));
    const definedHeadwords=Array.from(definedKeys,k=>all.get(k));
    const names=Array.from(editions.values(),e=>e.name);
    D.dictionaryData={...base,headwords,definedHeadwords,counts:{...base.counts,headwords:headwords.length,defined:definedHeadwords.length},
      source:base.source+' + '+names.join(', '),
      attribution:[base.attribution,...Array.from(editions.values(),e=>e.name+(e.license?' · '+e.license:''))].filter(Boolean).join(' / '),
      lookup(word){return [...base.lookup(word).map(s=>s.source?s:{...s,source:base.source}),...(entries.get(key(word))?.senses||[])];}};
  }
  function database(){
    if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
      if(!window.indexedDB){reject(new Error('This browser cannot save editions here.'));return;}
      let req;
      try{req=window.indexedDB.open('diction.dictionary.editions',1);}catch(e){reject(e);return;}
      req.onupgradeneeded=()=>req.result.createObjectStore('editions',{keyPath:'id'});
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('Dictionary storage is unavailable.'));
      req.onblocked=()=>reject(new Error('Close other copies of Diction and try again.'));
    });
    return dbPromise;
  }
  async function stored(op){
    const db=await database();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('editions',op?'readwrite':'readonly');
      const bucket=tx.objectStore('editions');
      const req=op?(op.remove?bucket.delete(op.remove):bucket.put(op.record)):bucket.getAll();
      tx.oncomplete=()=>resolve(req.result);
      tx.onerror=tx.onabort=()=>reject(tx.error||new Error('The edition could not be saved.'));
    });
  }
  async function restore(){
    let records;
    try{records=await stored();}catch{return false;}
    for(const rec of records){
      try{
        const rows=JSON.parse(await rec.data.text());
        editions.set(rec.id,{id:rec.id,name:rec.name,license:rec.license,map:new Map(rows),temporary:false});
      }catch{message='An old dictionary edition could not be loaded. Import its file again.';}
    }
    if(editions.size)rebuild();
    return !!editions.size;
  }
  D.loadDictionaryEditions=function(){
    if(!restoring){restoring=restore();return restoring;}
    return restoring.then(()=>false);
  };
  let watcher;
  function renderAfterChange(){
    if(watcher?.container.isConnected)watcher.refresh();
    else if(D.view==='dictionary'&&typeof D.render==='function')D.render();
  }
  async function saveEdition(file,id,name,license,wordnet){
    if(file.size===0||file.size>maxBytes)fail('Choose a file between 1 byte and 65 MiB.');
    const {map,skipped}=wordnet?await parseWordnet(file):await parseJson(file);
    const entry={id,name,license,map,temporary:false};
    try{
      const data=new Blob([JSON.stringify(Array.from(map))],{type:'application/json'});
      await stored({record:{id,name,license,data}});
    }catch{entry.temporary=true;}
    editions.set(id,entry);rebuild();
    message=name+' added with '+map.size.toLocaleString()+' headwords.'+(skipped?' '+skipped.toLocaleString()+' entries without a usable definition were skipped.':'')+
      (entry.temporary?' Usable in this tab. Your browser could not save the edition for your next visit.':' Saved in this browser for offline use.');
  }
  D.showDictionaryImport=(container,refresh)=>{
    if(!container)return;
    watcher={container,refresh};
    const e=D.esc;
    const list=Array.from(editions.values());
    container.innerHTML='<details class="panel" id="di-panel"><summary><strong>Add dictionary definitions</strong></summary>'+
      '<p class="muted">Install a reference edition or add your own glossary. Editions with at least five distinct words and definitions also add vocabulary packs. Saved editions are available offline in this browser.</p>'+
      '<div class="actions"><button type="button" class="primary" data-di="webster">Install Webster’s definitions</button><a href="'+webster.file+'" target="_blank" rel="noopener noreferrer">Download Webster JSON</a></div>'+
      '<p class="small-meta">About 22 MB. Historical wording and some transcription errors. <a href="'+websterSource+'" target="_blank" rel="noopener noreferrer">Edition and licensing</a></p>'+
      '<div class="actions"><button type="button" class="secondary" data-di="online">Install Open English Wordnet 2025</button>'+
      '<a href="'+oewn.file+'" target="_blank" rel="noopener noreferrer">Download Wordnet ZIP</a></div>'+
      '<p class="small-meta">Open English Wordnet contributors · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> · <a href="'+oewn.source+'" target="_blank" rel="noopener noreferrer">2025 edition details</a></p>'+
      '<label class="field"><span class="field-label">Import a dictionary file</span><input type="file" accept=".zip,.json,application/json,application/zip" data-di="file"></label>'+
      '<p class="muted">Choose a WordNet WNDB ZIP, a <a href="'+websterSource+'#formatting" target="_blank" rel="noopener noreferrer">Webster dictionary.json</a>, or a glossary with a word-to-definition mapping.</p>'+
      '<details><summary>JSON format</summary><p>Use a word as each key. A value can be a definition, a list of definitions, or a list of senses such as this one.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">'+
      e('{"scuff":[{"pos":"verb","definition":"To drag a foot lightly across a surface."}]}')+'</pre><p>Use the source title as the filename. Files can be up to 65 MiB. Importing the same filename updates that edition.</p></details>'+
      (list.length?'<h3>Installed editions</h3>'+list.map(x=>'<div class="actions"><span>'+e(x.name)+' · '+x.map.size.toLocaleString()+' headwords'+(x.temporary?' · this tab':'')+'</span><button type="button" class="secondary" data-di-remove="'+e(x.id)+'">Remove edition</button></div>').join(''):'')+
      '<p role="status" data-di="status">'+e(message)+'</p></details>';
    const status=container.querySelector('[data-di="status"]');
    if(message)container.querySelector('#di-panel').open=true;
    const controls=container.querySelectorAll('button,input');
    function toggle(on){controls.forEach(node=>node.disabled=on);}
    toggle(busy);
    async function run(fn){
      if(busy)return;
      busy=true;toggle(true);status.textContent='Preparing dictionary definitions…';
      try{await restoring;await fn();busy=false;renderAfterChange();}
      catch(err){busy=false;message=err?.message||'Could not import this edition.';status.textContent=message;toggle(false);container.querySelector('[data-di="file"]').value='';}
    }
    container.querySelector('[data-di="file"]').onchange=ev=>{
      const file=ev.target.files?.[0];
      if(!file)return;
      run(async()=>{
        const zip=/\.zip$/i.test(file.name);
        const isOEWN=zip&&/^english-wordnet-2025\.zip$/i.test(file.name);
        const webster=/^dictionary(?:_compact)?\.json$/i.test(file.name);
        const name=isOEWN?oewn.name:file.name.replace(/\.(json|zip)$/i,'').slice(0,180);
        await saveEdition(file,isOEWN?oewn.id:'local:'+file.name, name || 'Local glossary',
          isOEWN?oewn.license:(webster?'User-selected JSON dictionary file':''),zip);
      });
    };
    async function installOnline(edition,isWordnet){
      let url=edition.file;
      if(edition===webster){
        // Pin the downloaded file to the source revision when GitHub provides it.
        try {
          const ref=await fetch('https://api.github.com/repos/matthewreagan/WebstersEnglishDictionary/git/ref/heads/master',{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(4500)});
          if(ref.ok){
            const sha=(await ref.json()).object?.sha;
            if(typeof sha==='string'&&/^[a-f0-9]{40}$/.test(sha))url=url.replace('/master/','/'+sha+'/');
          }
        }catch{ /* The documented release file also works without a GitHub API request. */ }
      }

      let bytes;
      try{
        const reply=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer'});
        if(!reply.ok||!reply.body)throw new Error();
        bytes=await boundedBytes(reply.body,maxBytes);
      }catch{fail('The online installer could not reach this edition. Use its download link, save the file, then select it under “Import a dictionary file”.');}
      await saveEdition(new Blob([bytes]),edition.id,edition.name,edition.license,isWordnet);
    }
    container.querySelector('[data-di="online"]').onclick=()=>run(()=>installOnline(oewn,true));
    container.querySelector('[data-di="webster"]').onclick=()=>run(()=>installOnline(webster,false));
    container.querySelectorAll('[data-di-remove]').forEach(button=>button.onclick=()=>run(async()=>{
      const id=button.dataset.diRemove,entry=editions.get(id);
      if(!entry.temporary)await stored({remove:id});
      editions.delete(id);rebuild();message=entry.name+' removed. Saved notebook entries remain available.';
    }));
    D.loadDictionaryEditions().then(changed=>{if(changed&&container.isConnected)refresh();});
  };
})();

