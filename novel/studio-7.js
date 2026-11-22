
(() => {
  'use strict';
  const app = window.NS;
  const enc = app.esc;
  const selected = new Map();
  const today = () => new Date().toISOString();
  const byId = id => document.getElementById(id);
  const count = (n, label) => n + ' ' + label + (n === 1 ? '' : 's');
  const prettyDate = value => new Intl.DateTimeFormat(undefined, {month:'short', day:'numeric', year:'numeric'}).format(new Date(value));
  const safeDate = value => Number.isFinite(Date.parse(value)) ? prettyDate(value) : '';
  const slug = title => String(title || 'novel').trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'novel';
  const btn = (action, label, style = 'secondary', id = '') => '<button type="button" class="btn ' + style + '" data-nsrw="' + action + '" data-nsrw-id="' + enc(id) + '">' + label + '</button>';
  const line = (label, value) => '<div class="rw-stat"><span>' + enc(label) + '</span><strong>' + enc(String(value)) + '</strong></div>';
  const field = (caption, control) => '<label class="rw-field"><span>' + caption + '</span>' + control + '</label>';
  const textField = (id, value, placeholder) => '<input id="' + id + '" type="text" value="' + enc(value || '') + '" placeholder="' + enc(placeholder || '') + '" required>';
  const area = (id, value, placeholder, required = false) => '<textarea rows="3" id="' + id + '" placeholder="' + enc(placeholder || '') + '"' + (required ? ' required' : '') + '>' + enc(value || '') + '</textarea>';
  const footer = (form, label) => btn('dismiss', 'Cancel') + '<button type="submit" form="' + form + '" class="btn primary">' + label + '</button>';
  function save(message) {
    const persisted = app.save();
    app.closeModal();
    app.render();
    if (persisted === false) app.toast(app.storageStatus?.message || 'Changes are in this tab. Export a backup to keep them.');
    else if (message) app.toast(message);
  }
  function workspace() {
    const b = app.book();
    if (!b) return null;
    if (!Array.isArray(b.readings)) b.readings = [];
    if (!Array.isArray(b.passes)) b.passes = [];
    return b;
  }
  function empty(kind, title, desc, action, cta) {
    const mark = kind === 'reader' ? '“' : '¶';
    return '<section class="rw-empty"><div class="rw-paper-art" aria-hidden="true"><div><span>' + mark + '</span><i></i><i></i><i></i></div></div><div><h2>' + title + '</h2><p>' + desc + '</p>' + btn(action, cta, 'primary') + '</div></section>';
  }
  function head(eyebrow, title, desc, action) {
    return '<header class="view-head rw-head"><div><div class="eyebrow">' + eyebrow + '</div><h1>' + title + '</h1><p>' + desc + '</p></div>' + action + '</header>';
  }
  function emptyBook() {
    return '<p class="rw-muted">Open a manuscript to use this workspace.</p>';
  }
  function packetRow(p, active) {
    return '<button class="rw-packet-row' + (active ? ' is-picked' : '') + '" data-nsrw="select-packet" data-nsrw-id="' + enc(p.id) + '" aria-pressed="' + active + '"><strong>' + enc(p.title) + '</strong><span>' + count(p.entries.length, 'checkpoint') + ' · ' + count(p.responses.length, 'response') + '</span></button>';
  }
  function responseBlock(response, entry) {
    const answer = (response.answers || []).find(a => a.chapterId === entry.chapterId);
    if (!answer) return '';
    return '<blockquote class="rw-answer"><p>' + enc(answer.text) + '</p><cite>' + enc(response.name || 'Reader') + ' · ' + enc(safeDate(response.receivedAt)) + '</cite></blockquote>';
  }
  function packetDetail(p) {
    return '<section class="panel rw-detail"><div class="rw-over">Selected packet</div><h2>' + enc(p.title) + '</h2><p class="rw-subtle">Saved ' + enc(safeDate(p.createdAt)) + ' · ' + count(p.entries.length, 'chapter') + '</p><div class="rw-tools">' + btn('export', 'Download reader packet', 'primary', p.id) + btn('import', 'Import responses', 'secondary', p.id) + btn('manual', 'Enter a response', 'secondary', p.id) + '</div><p class="rw-hint">Send the HTML packet to a first-time reader. They can return their responses as a file. Your predictions stay here.</p><div class="rw-section-title"><h3>Reading checkpoints</h3><span>' + count(p.responses.length, 'response') + '</span></div>' + p.entries.map((entry, i) => '<article class="rw-checkpoint"><div class="rw-over">Checkpoint ' + (i + 1) + '</div><h4>' + enc(entry.title) + '</h4><p>' + enc(entry.question) + '</p>' + (entry.prediction ? '<div class="rw-private"><strong>Your private prediction</strong><p>' + enc(entry.prediction) + '</p></div>' : '') + p.responses.map(r => responseBlock(r, entry)).join('') + '</article>').join('') + '</section>';
  }
  app.views.readers = () => {
    const b = workspace();
    if (!b) return emptyBook();
    const p = b.readings.find(x => x.id === selected.get(b.id)) || b.readings[b.readings.length - 1];
    const intro = head('Reader workshop', 'First impressions', 'Find out what readers inferred, and which words led them there.', p ? btn('new', 'Create packet', 'primary') : '');
    const main = p ? '<div class="rw-grid"><aside class="panel rw-list"><h2>Reading packets</h2>' + b.readings.slice().reverse().map(x => packetRow(x, x.id === p.id)).join('') + '</aside>' + packetDetail(p) + '</div>' : empty('reader', 'Invite a first reading', 'Choose connected chapters, set a question at each stopping point, and record what you expect the reader to notice.', 'new', 'Create a reading packet');
    return '<div class="rw-view">' + intro + main + '<input hidden type="file" accept=".json,application/json" id="nsrw-import"></div>';
  };
  function packetForm() {
    const b = workspace();
    const chapters = (b.chapters || []).filter(c => String(c.text || '').trim());
    if (!chapters.length) {
      app.modal('Create a reading packet', '<p class="rw-hint">Write a passage in your manuscript first. The packet will preserve a copy of each selected chapter.</p>', btn('dismiss','Cancel') + btn('editor','Open manuscript','primary'));
      return;
    }
    const controls = chapters.map((c,i) => {
      const checked = c.id === b.activeChapterId || (!chapters.some(x=>x.id===b.activeChapterId) && i === 0);
      return '<div class="rw-select-block"><label class="rw-choice"><input type="checkbox" data-rw-choose="' + i + '" value="' + enc(c.id) + '"' + (checked ? ' checked' : '') + '><strong>' + enc(c.title || 'Untitled chapter') + '</strong></label><div class="rw-context" data-rw-fields="' + i + '"' + (checked ? '' : ' hidden') + '>' + field('Question for the reader', area('nsrw-q-' + i,'What stayed with you here, and which words shaped that impression?', '', false)) + field('Your private prediction <small>Optional</small>', area('nsrw-p-' + i,'','What do you expect them to infer?')) + '</div></div>';
    }).join('');
    app.modal('Create a reading packet', '<form id="nsrw-new-form" class="rw-form">' + field('Packet title', textField('nsrw-title', b.title + ' · first reading', 'Packet title')) + '<fieldset class="rw-fs"><legend>Chapters in reading order</legend>' + controls + '</fieldset><p class="rw-hint">The exported packet contains a snapshot of these chapters and the questions you choose.</p></form>', footer('nsrw-new-form','Create packet'));
  }
  function createPacket() {
    const b = workspace();
    const title = byId('nsrw-title').value.trim();
    if (!title) return app.toast('Give the reading packet a title.');
    const entries = [];
    for (const check of document.querySelectorAll('#nsrw-new-form [data-rw-choose]:checked')) {
      const c = b.chapters.find(x => x.id === check.value);
      if (!c) continue;
      const idx = check.dataset.rwChoose;
      const q = byId('nsrw-q-' + idx);
      if (!q.value.trim()) { q.focus(); return app.toast('Add a question for each selected chapter.'); }
      entries.push({chapterId:c.id, title:c.title || 'Untitled chapter', text:c.text, question:q.value.trim(), prediction:byId('nsrw-p-' + idx).value.trim()});
    }
    if (!entries.length) return app.toast('Choose at least one chapter.');
    const packet = {id:app.id(), bookId:b.id, title, createdAt:today(), entries, responses:[]};
    b.readings.push(packet); selected.set(b.id, packet.id); save('Reading packet created');
  }
  function portableReader() {
    'use strict';
    const packet = JSON.parse(document.getElementById('packet-data').textContent);
    const key = 'novel-studio.packet.' + packet.packetId;
    const q = id => document.getElementById(id);
    let draft;
    function fresh() {
      return {id:globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2), name:'',answers:[],pending:''};
    }
    try { draft = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
    if (!draft || typeof draft.id !== 'string' || !Array.isArray(draft.answers) || draft.answers.length > packet.entries.length) draft=fresh();
    function persist() { try {localStorage.setItem(key, JSON.stringify(draft));} catch {} }
    function render() {
      const idx = draft.answers.length;
      const end = idx === packet.entries.length;
      q('reading').hidden = end; q('finished').hidden = !end;
      q('packet-title').textContent = packet.title;
      if (end) return;
      const entry = packet.entries[idx];
      q('step').textContent = 'Checkpoint ' + (idx+1) + ' of ' + packet.entries.length;
      q('chapter').textContent = entry.title;
      q('prose').textContent = entry.text;
      q('prompt').textContent = entry.question;
      q('impression').value = draft.pending || '';
      q('reader-name').value = draft.name || '';
      q('who').hidden = idx > 0;
      q('next').textContent = idx === packet.entries.length - 1 ? 'Finish reading' : 'Save and continue';
    }
    q('reader-name').addEventListener('input', e => {draft.name = e.target.value; persist();});
    q('impression').addEventListener('input', e => {draft.pending = e.target.value; persist();});
    q('checkpoint-form').addEventListener('submit', e => {
      e.preventDefault();
      const text = q('impression').value.trim();
      if (!text) {q('impression').focus();return;}
      draft.answers.push({chapterId:packet.entries[draft.answers.length].chapterId, text});
      draft.pending = '';persist();render();window.scrollTo(0,0);
    });
    q('download').addEventListener('click', () => {
      const file = {format:'novel-studio-reader-response', version:1, packetId:packet.packetId, responseId:draft.id, name:(draft.name || '').trim() || 'Anonymous reader', answers:draft.answers};
      const blob = new Blob([JSON.stringify(file,null,2)],{type:'application/json'});
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = 'reader-response-' + draft.id.slice(-8) + '.json';
      document.body.appendChild(a);a.click();a.remove();setTimeout(() => URL.revokeObjectURL(url),4000);
    });
    q('another').addEventListener('click', () => {
      if (!confirm('Start another reader’s copy on this device? Download the current response first.')) return;
      draft=fresh(); persist();render();window.scrollTo(0,0);
    });
    render();
  }
  function portableHtml(p) {
    const payload = {packetId:p.id,title:p.title,entries:p.entries.map(e=>({chapterId:e.chapterId,title:e.title,text:e.text,question:e.question}))};
    const safeJson = JSON.stringify(payload).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
    const sty = '*,*:before,*:after{box-sizing:border-box}html{color-scheme:light}body{background:#f9f7f0;color:#252d23;margin:0;font:16px/1.55 system-ui,sans-serif}header{border-bottom:1px solid #d9d9cd;background:#fffdf7}header div,main{width:min(680px,calc(100% - 40px));margin:auto}header div{padding:14px 0}header b{color:#335747}header p{font-size:14px;margin:0}main{padding:34px 0 80px}h1{font:normal clamp(30px,6vw,48px)/1.14 Georgia,serif;margin:8px 0 24px}h2{font:normal 25px/1.2 Georgia,serif}#step{font-size:13px;color:#546755}#prose{white-space:pre-wrap;overflow-wrap:anywhere;font:19px/1.75 Georgia,serif}form,#finished{margin-top:35px;padding:24px;background:#fffdf8;border:1px solid #d3d9ce;border-radius:8px}label{display:block;font-weight:600;margin:12px 0}input,textarea{display:block;width:100%;margin:6px 0 12px;padding:10px;border:1px solid #acb5a8;background:#fff;border-radius:4px;font:inherit}button{padding:10px 16px;border-radius:5px;border:1px solid #315643;background:#315643;color:white;cursor:pointer;font:inherit}button.secondary{background:transparent;color:#315643}small{display:block;color:#536350;margin:10px 0 15px}button:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid #a66235}button+button{margin:8px 0 0 4px}';
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + enc(p.title) + ' · Reader packet</title><style>' + sty + '</style></head><body><header><div><b>Novel Studio</b><p id="packet-title"></p></div></header><main><article id="reading"><span id="step"></span><h1 id="chapter"></h1><div id="prose"></div><form id="checkpoint-form"><h2>First impression</h2><label id="who">Your name (optional)<input id="reader-name" autocomplete="name"></label><label><span id="prompt"></span><textarea id="impression" rows="5" required></textarea></label><small>Save your first impression before reading on. Saved answers are locked in reading order.</small><button id="next" type="submit">Save and continue</button></form></article><section id="finished" hidden><h1>Reading complete</h1><p>Download your response file and return it to the writer. Only your name and written answers are included.</p><button id="download" type="button">Download responses</button><button id="another" class="secondary" type="button">Start a new response</button></section></main><script type="application/json" id="packet-data">' + safeJson + '<\/script><script>(' + portableReader.toString() + ')();<\/script></body></html>';
  }
  function manualForm(p) {
    app.modal('Enter a reader response', '<form id="nsrw-response-form" class="rw-form" data-packet="' + enc(p.id) + '">' + field('Reader name', textField('nsrw-name','', 'Reader’s name or initials')) + p.entries.map((entry,i) => '<fieldset class="rw-fs"><legend>' + enc(entry.title) + '</legend>' + field(enc(entry.question),area('nsrw-answer-' + i,'','Record their actual words.',true)) + '</fieldset>').join('') + '</form>', footer('nsrw-response-form','Save response'));
  }
  function acceptResponse(p, raw) {
    if (!raw || raw.format !== 'novel-studio-reader-response' || raw.version !== 1 || typeof raw.responseId !== 'string' || !raw.responseId.trim() || !Array.isArray(raw.answers)) throw Error('Choose a response file downloaded from a Novel Studio reader packet.');
    if (raw.packetId !== p.id) throw Error('This response belongs to a different packet. Select its original packet first.');
    if (p.responses.some(r => r.id === raw.responseId)) throw Error('This reader response was already imported.');
    if (raw.answers.length !== p.entries.length || !raw.answers.every((a,i) => a && a.chapterId === p.entries[i].chapterId && typeof a.text === 'string' && a.text.trim())) throw Error('The file must contain one completed response for every checkpoint in this packet.');
    p.responses.push({id:raw.responseId, name:typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Anonymous reader', receivedAt:today(), answers:raw.answers.map(a=>({chapterId:a.chapterId,text:a.text.trim()}))});
    selected.set(p.bookId || app.book().id, p.id);
  }
  function passForm(pass) {
    const b = workspace();
    const list = b.chapters || [];
    if (!list.length) return app.modal('Start a revision pass', '<p class="rw-hint">Add a chapter to your manuscript first.</p>', btn('dismiss','Cancel') + btn('editor','Open manuscript','primary'));
    const scope = pass ? pass.scope : list.map(c=>c.id);
    app.modal(pass ? 'Edit revision pass' : 'Start a revision pass',
      '<form class="rw-form" id="nsrw-pass-form" data-pass="' + enc(pass?.id || '') + '">' +
      field('Pass name', textField('nsrw-pass-title',pass?.title,'For example, clarify the sisters’ relationship')) +
      field('Finish line',area('nsrw-finish',pass?.finishLine,'What would let you call this pass complete?',true)) +
      '<fieldset class="rw-fs"><legend>Chapters in scope</legend>' + list.map(c=>'<label class="rw-choice"><input type="checkbox" name="rw-scope" value="' + enc(c.id) + '"' + (scope.includes(c.id) ? ' checked' : '') + '>' + enc(c.title || 'Untitled chapter') + '</label>').join('') +
      '</fieldset></form>', footer('nsrw-pass-form', pass ? 'Save changes' : 'Start pass'));
  }
  function passCard(p, b) {
    const active = p.status === 'open';
    const scope = p.scope || [];
    const chapters = scope.map(id=>b.chapters.find(c=>c.id === id)).filter(Boolean);
    const actions = active ? btn('close-pass','Complete pass','primary',p.id) + btn('edit-pass','Edit pass','secondary',p.id)
      : btn('reopen-pass','Reopen pass','secondary',p.id) + (p.status === 'complete' ? btn('archive','Archive','secondary',p.id) : '');
    return '<article class="panel rw-pass"><div class="rw-pass-top"><div><div class="rw-over">' + (active ? 'Active pass' : p.status === 'complete' ? 'Completed pass' : 'Archived pass') + '</div><h2>' + enc(p.title) + '</h2></div><span class="rw-date">' + enc(safeDate(p.closedAt || p.createdAt)) + '</span></div><div class="rw-finish"><strong>Finish line</strong><p>' + enc(p.finishLine) + '</p></div><div class="rw-scopes">' + chapters.map(c=>'<button type="button" data-nsrw="chapter" data-nsrw-id="' + enc(c.id) + '">' + enc(c.title || 'Untitled chapter') + '</button>').join('') + (!chapters.length ? '<span>Chapters no longer in manuscript</span>' : '') + '</div>' + (p.note ? '<p class="rw-close-note"><strong>Closing note</strong> ' + enc(p.note) + '</p>' : '') + '<div class="rw-tools">' + actions + '</div></article>';
  }
  app.views.revision = () => {
    const b = workspace();
    if (!b) return emptyBook();
    const passes = b.passes.slice().reverse();
    const open = passes.filter(p=>p.status === 'open');
    const closed = passes.filter(p=>p.status === 'complete');
    const archived = passes.filter(p=>p.status === 'archived');
    return '<div class="rw-view">' + head('Manuscript revision','Revision desk','Give each pass a clear finish line and return to the chapters it touches.', passes.length ? btn('new-pass','Start a pass','primary') : '') + (passes.length ?
      '<div class="rw-summary">' + line('Active',open.length) + line('Completed',closed.length) + line('Archived',archived.length) + '</div><div class="rw-pass-grid">' + [...open,...closed].map(p=>passCard(p,b)).join('') + '</div>' + (archived.length ? '<details class="rw-archive"><summary>Archived passes (' + archived.length + ')</summary><div class="rw-pass-grid">' + archived.map(p=>passCard(p,b)).join('') + '</div></details>' : '')
      : empty('revision','Plan your first revision pass','Choose the chapters you want to revisit and write down what will be true when the work is done.','new-pass','Start a revision pass')) + '</div>';
  };
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-nsrw]');
    if (!el) return;
    const b = workspace();
    if (!b) return;
    const id = el.dataset.nsrwId;
    const p = b.readings.find(x=>x.id === id);
    const pass = b.passes.find(x=>x.id === id);
    switch(el.dataset.nsrw) {
      case 'dismiss': app.closeModal(); break;
      case 'editor': app.closeModal(); app.go('editor'); break;
      case 'chapter': if (b.chapters.some(c=>c.id === id)) {b.activeChapterId=id;app.save();app.go('editor');} break;
      case 'new': packetForm(); break;
      case 'select-packet': selected.set(b.id, id);app.render();break;
      case 'export':
        if(p) {app.download(slug(p.title) + '-reader.html',portableHtml(p),'text/html;charset=utf-8');app.toast('Reader packet downloaded');}
        break;
      case 'import':
        if (p && byId('nsrw-import')) {const input = byId('nsrw-import');input.dataset.packet = p.id;input.dataset.book = b.id;input.value = '';input.click();}
        break;
      case 'manual': if(p) manualForm(p);break;
      case 'new-pass': passForm(null);break;
      case 'edit-pass': if(pass) passForm(pass);break;
      case 'close-pass':
        if(pass) app.modal('Complete this revision pass', '<form id="nsrw-close-form" class="rw-form" data-pass="' + enc(id) + '"><div class="rw-private"><strong>Finish line</strong><p>' + enc(pass.finishLine) + '</p></div>' + field('Closing note <small>Optional</small>', area('nsrw-close-note','','What changed, or what did you choose to keep?')) + '</form>', footer('nsrw-close-form','Complete pass'));
        break;
      case 'archive': if(pass && pass.status === 'complete') {pass.status='archived';save('Revision pass archived');}break;
      case 'reopen-pass': if(pass && pass.status !== 'open') {pass.status='open';delete pass.closedAt;save('Revision pass reopened');}break;
    }
  });
  document.addEventListener('change', async e => {
    const el = e.target;
    if (el.matches('#nsrw-new-form [data-rw-choose]')) {
      const fields = document.querySelector('[data-rw-fields="' + el.dataset.rwChoose + '"]');
      if (fields) fields.hidden = !el.checked;
      return;
    }
    if (el.id !== 'nsrw-import' || !el.files || !el.files.length) return;
    const bookId = el.dataset.book, packetId = el.dataset.packet, file = el.files[0];
    try {
      let raw;
      try {raw = JSON.parse(await file.text());} catch {throw Error('Could not read the response file. Choose the JSON file downloaded by the reader.');}
      const b = workspace();
      const packet = b?.id === bookId && b.readings.find(p=>p.id === packetId);
      if (!packet) throw Error('Reopen the original packet before importing this file.');
      acceptResponse(packet,raw);save('Reader response imported');
    } catch(error) {app.toast(error.message);}
  });
  document.addEventListener('submit', e=>{
    const f = e.target;
    if (!['nsrw-new-form','nsrw-response-form','nsrw-pass-form','nsrw-close-form'].includes(f.id)) return;
    e.preventDefault();
    const b=workspace();
    if (!b) return;
    if (f.id === 'nsrw-new-form') {createPacket();return;}
    if (f.id === 'nsrw-response-form') {
      const p = b.readings.find(x=>x.id === f.dataset.packet);
      if (!p) return app.toast('Open the original reading packet and try again.');
      try {
        acceptResponse(p,{format:'novel-studio-reader-response',version:1,packetId:p.id,responseId:app.id(),name:byId('nsrw-name').value,answers:p.entries.map((entry,i)=>({chapterId:entry.chapterId,text:byId('nsrw-answer-' + i).value}))});
        save('Reader response saved');
      } catch(err) {app.toast(err.message);}
    }
    if (f.id === 'nsrw-pass-form') {
      const scope=Array.from(f.querySelectorAll('[name="rw-scope"]:checked'),c=>c.value);
      const title=byId('nsrw-pass-title').value.trim(), finishLine=byId('nsrw-finish').value.trim();
      if (!scope.length) return app.toast('Choose at least one chapter.');
      if (!title || !finishLine) return app.toast('Add a pass name and a finish line.');
      const old = b.passes.find(p=>p.id===f.dataset.pass);
      if (old) Object.assign(old,{scope,title,finishLine});
      else b.passes.push({id:app.id(),scope,title,finishLine,createdAt:today(),status:'open'});
      save(old ? 'Revision pass updated' : 'Revision pass started');
    }
    if (f.id === 'nsrw-close-form') {
      const pass = b.passes.find(x=>x.id === f.dataset.pass);
      if(pass){pass.note=byId('nsrw-close-note').value.trim();pass.closedAt=today();pass.status='complete';save('Revision pass completed');}
    }
  });
})();

