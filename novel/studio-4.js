
(function () {
  "use strict";
  const app = window.NS;
  const storageKey = "clara.novel-studio.v1";
  const format = "novel-studio-workspace";
  const stages = ["Discovery", "Outlining", "Drafting", "Revising", "Complete"];
  const h = value => app.esc(String(value == null ? "" : value));
  const now = () => new Date().toISOString();
  const plain = value => value !== null && typeof value === "object" && !Array.isArray(value);
  let loadedRaw = null;
  let baseline = "";
  let bookSignatures = new Map();
  let problem = "";
  let pendingRestore = null;
  let previousRaw = null;

  function chapter(title, text = "") {
    return {id:app.id(), title, text, pov:"", thread:"", dependsOn:[]};
  }

  function createBook(details = {}) {
    const first = chapter("Chapter one");
    return {
      id:app.id(), title:String(details.title || "Untitled manuscript"), genre:String(details.genre || ""),
      goal:String(details.goal || ""), stage:stages.includes(details.stage) ? details.stage : "Drafting",
      createdAt:now(), chapters:[first], activeChapterId:first.id,
      isSample:false, snapshots:[], readings:[], passes:[]
    };
  }

  function blankWorkspace() {
    const book = createBook();
    return {books:[book], activeBookId:book.id, activeView:"home", attempts:[], notes:[]};
  }

  async function retireUntouchedStarter(workspace) {
    // Mixed workspaces, notes, practice attempts, unknown data and edited
    // books stay intact. Only the original first-launch state is eligible.
    if (workspace.books.length !== 1 || workspace.notes.length || workspace.attempts.length ||
        Object.keys(workspace).some(key => !["books","activeBookId","activeView","attempts","notes"].includes(key))) return;
    const book = workspace.books[0];
    if (book.isSample !== true || book.chapters.length !== 3 || !window.crypto?.subtle ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(book.createdAt)) return;

    const before = JSON.stringify(workspace);
    const chapterIds = book.chapters.map(c => c.id);
    const normalized = {...book, id:"book", createdAt:"created", activeChapterId:"active",
      chapters:book.chapters.map((ch, i) => ({...ch, id:i, dependsOn:ch.dependsOn.map(id => chapterIds.indexOf(id))}))};
    const canonical = JSON.stringify(normalized, (_, value) => plain(value)
      ? Object.fromEntries(Object.keys(value).sort().map(key => [key,value[key]])) : value);
    const bytes = new TextEncoder().encode(canonical);
    if (bytes.length !== 3515) return;
    const digest = await window.crypto.subtle.digest("SHA-256",bytes);
    const hex = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,"0")).join("");
    if (hex !== "71c1ec4a37ef5b5f3cc237a9cd7df90387b3d17ca6156481306337dfa85cc237" ||
        app.state !== workspace || before !== JSON.stringify(workspace)) return;

    const oldBooks = workspace.books, oldActive = workspace.activeBookId;
    const replacement = createBook();
    workspace.books = [replacement];
    workspace.activeBookId = replacement.id;
    if (persistWorkspace()) app.render();
    else {
      workspace.books = oldBooks;
      workspace.activeBookId = oldActive;
    }
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }
  function records(value, label) {
    assert(Array.isArray(value) && value.every(plain), "Invalid " + label + " list.");
    return value;
  }
  function requireId(item, seen, label) {
    assert(typeof item.id === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(item.id) && !seen.has(item.id), "Invalid or duplicate " + label + " ID.");
    seen.add(item.id);
  }
  function checkStrings(row, keys, label) {
    keys.forEach(key => assert(typeof row[key] === "string", "Invalid " + label + " " + key + "."));
  }
  function checkOptionalStrings(row, keys, label) {
    keys.forEach(key => assert(row[key] == null || typeof row[key] === "string", "Invalid " + label + " " + key + "."));
  }
  function checkChapters(chapters) {
    const ids = new Set();
    assert(records(chapters,"chapter").length, "Every manuscript version needs a chapter.");
    for (const ch of chapters) {
      requireId(ch,ids,"chapter");
      checkStrings(ch,["title","text"],"chapter");
      checkOptionalStrings(ch,["pov","thread","aim"],"chapter");
      ch.pov ||= ""; ch.thread ||= ""; ch.dependsOn ??= [];
      assert(Array.isArray(ch.dependsOn) && ch.dependsOn.every(id=>typeof id === "string"), "Invalid chapter references.");
    }
    return ids;
  }
  function validate(workspace) {
    assert(plain(workspace), "This file does not contain a workspace.");
    const books = records(workspace.books, "manuscript");
    assert(books.length, "This workspace contains no manuscripts.");
    const bookIds = new Set();
    for (const book of books) {
      requireId(book,bookIds,"manuscript");
      checkStrings(book,["title"],"manuscript");
      assert(book.title.trim(), "A manuscript is missing its title.");
      checkOptionalStrings(book,["genre","stage","goal","createdAt","updatedAt"],"manuscript");
      book.genre ||= ""; book.goal ||= ""; book.stage ||= "Drafting";
      const chapterIds = checkChapters(book.chapters);
      if (!chapterIds.has(book.activeChapterId)) book.activeChapterId = book.chapters[0].id;
      book.readings ??= []; book.snapshots ??= []; book.passes ??= [];
      const packetIds = new Set();
      for (const packet of records(book.readings,"reader packet")) {
        requireId(packet,packetIds,"packet");
        checkStrings(packet,["title"],"reader packet");
        for (const entry of records(packet.entries,"reader checkpoint")) checkStrings(entry,["chapterId","title","text","question","prediction"],"checkpoint");
        for (const response of records(packet.responses,"reader response")) {
          checkStrings(response,["id","name"],"reader response");
          for (const answer of records(response.answers,"checkpoint answer")) checkStrings(answer,["chapterId","text"],"checkpoint answer");
        }
      }
      for (const pass of records(book.passes,"revision pass")) {
        checkStrings(pass,["id","title","finishLine","status"],"revision pass");
        assert(Array.isArray(pass.scope) && pass.scope.every(id=>typeof id === "string"), "Invalid revision scope.");
      }
      const snapIds = new Set();
      for (const snapshot of records(book.snapshots,"snapshot")) {
        requireId(snapshot,snapIds,"snapshot");
        checkStrings(snapshot,["name","date"],"snapshot");
        const ids=checkChapters(snapshot.chapters);
        if (!ids.has(snapshot.activeChapterId)) snapshot.activeChapterId=snapshot.chapters[0].id;
      }
    }
    assert(bookIds.has(workspace.activeBookId), "The active manuscript is missing.");
    workspace.notes ??= []; workspace.attempts ??= [];
    const noteIds = new Set(), attemptIds = new Set();
    for (const note of records(workspace.notes,"commonplace note")) {
      requireId(note,noteIds,"note");
      checkStrings(note,["text"],"commonplace note");
      checkOptionalStrings(note,["type","title","source","created","updated","bookId"],"note");
    }
    for (const attempt of records(workspace.attempts,"practice attempt")) {
      requireId(attempt,attemptIds,"practice attempt");
      checkStrings(attempt,["bookId","chapterId","skillId","status"],"practice attempt");
      checkOptionalStrings(attempt,["comparison","a","b","reason","choice","prediction","created","noteId","due","completed"],"practice attempt");
      assert(["draft","complete"].includes(attempt.status) && [0,1,2].includes(attempt.stage), "Invalid practice stage.");
      assert(bookIds.has(attempt.bookId), "A practice attempt refers to an unknown manuscript.");
      if (attempt.transfers != null) {
        for(const transfer of records(attempt.transfers,"follow-up"))
          checkStrings(transfer,["prompt","body","outcome"],"follow-up");
      }
      if (attempt.returnDraft != null) {
        assert(plain(attempt.returnDraft), "Invalid follow-up draft.");
        checkStrings(attempt.returnDraft,["prompt","body","outcome"],"follow-up draft");
      }
    }
    if (!["home","editor","map","practice","notebook","revision","readers"].includes(workspace.activeView)) workspace.activeView = "home";
    return workspace;
  }

  function decode(raw) {
    const envelope = JSON.parse(raw, (key, value) => {
      if (key === "__proto__" || key === "constructor" || key === "prototype") throw new Error("Invalid property in workspace file.");
      return value;
    });
    assert(plain(envelope) && envelope.format === format && envelope.version === 1, "Choose a Novel Studio workspace backup (.json).");
    if (envelope.textPool !== undefined) {
      assert(Array.isArray(envelope.textPool) && envelope.textPool.every(t=>typeof t==="string"), "Invalid manuscript text storage.");
      const stack=[envelope.workspace];
      while (stack.length) {
        const obj=stack.pop();
        if (!obj || typeof obj!=="object") continue;
        if (typeof obj.text==="number") {
          assert(Number.isInteger(obj.text) && obj.text>=0 && obj.text<envelope.textPool.length,"A manuscript passage could not be recovered.");
          obj.text=envelope.textPool[obj.text];
        }
        for (const val of Object.values(obj)) if (val && typeof val==="object") stack.push(val);
      }
    }
    return validate(envelope.workspace);
  }
  function pack(workspace,compact=false) {
    const envelope={format,version:1,savedAt:now(),workspace};
    if (!compact) return JSON.stringify(envelope);
    // Identical passages in snapshots and reader packets occupy storage only once.
    const indices=new Map();
    envelope.textPool=[];
    return JSON.stringify(envelope,(key,val)=>{
      if(key!=="text" || typeof val!=="string" || val.length<128) return val;
      if(!indices.has(val)) {indices.set(val,envelope.textPool.length);envelope.textPool.push(val);}
      return indices.get(val);
    });
  }
  function signatures(workspace) {
    return new Map(workspace.books.map(b => [b.id,JSON.stringify([b.title,b.genre,b.goal,b.stage,b.chapters.map(c=>[c.id,c.title,c.text,c.pov,c.thread,c.aim,c.dependsOn,c.needsReview])])]));
  }
  function remember(raw, workspace) {
    loadedRaw = raw;
    baseline = JSON.stringify(workspace);
    bookSignatures = signatures(workspace);
  }
  function status(kind,message) {
    app.storageStatus = {kind,message};
    if (kind !== "saved" && problem !== message && document.readyState !== "loading" && document.body && app.toast) app.toast(message);
    problem = kind === "saved" ? "" : message;
    document.dispatchEvent(new CustomEvent("ns-storage-status",{detail:app.storageStatus}));
    if (app.state && typeof app.status === "function") app.status();
  }
  function loadWorkspace() {
    let raw = null;
    try {
      raw = localStorage.getItem(storageKey);
      const workspace = raw ? decode(raw) : blankWorkspace();
      remember(raw, workspace);
      if (!raw) {
        const initial = pack(workspace,true);
        localStorage.setItem(storageKey,initial);
        loadedRaw = initial;
      }
      status("saved","Saved on this device");
      if (raw) retireUntouchedStarter(workspace).catch(() => {});
      return workspace;
    } catch (error) {
      const workspace = blankWorkspace();
      remember(raw,workspace);
      if (raw) {
        previousRaw = raw;
        status("error","Stored data needs recovery. Open Workspace data before saving.");
      } else {
        status("unavailable","Browser storage is unavailable. Download a backup to keep your work.");
      }
      return workspace;
    }
  }
  function persistWorkspace() {
    const state = app.state;
    if (!state) return false;
    if (previousRaw !== null) return false;
    try {
      if (localStorage.getItem(storageKey) !== loadedRaw) {
        status("conflict","Another tab saved changes. Open Workspace data to keep both versions."); return false;
      }
      const current = JSON.stringify(state);
      if (current === baseline && loadedRaw) {status("saved","Saved on this device");return true;}
      const nextSignatures = signatures(state);
      for (const book of state.books) if (bookSignatures.has(book.id) && bookSignatures.get(book.id) !== nextSignatures.get(book.id)) book.updatedAt = now();
      const raw = pack(state,true);
      localStorage.setItem(storageKey,raw);
      loadedRaw = raw;
      baseline = JSON.stringify(state);
      bookSignatures = nextSignatures;
      status("saved","Saved on this device");
      return true;
    } catch (error) {
      status("unavailable","Autosave is unavailable. Download a backup to keep your changes.");return false;
    }
  }
  window.addEventListener("storage",e=>{
    if ((e.key === storageKey || e.key === null) && app.state && localStorage.getItem(storageKey) !== loadedRaw)
      status("conflict","Another tab saved changes. Open Workspace data to keep both versions.");
  });
  window.addEventListener("beforeunload",e=>{
    if (app.state && app.storageStatus?.kind !== "saved" && JSON.stringify(app.state) !== baseline) {
      e.preventDefault(); e.returnValue = "";
    }
  });
  function outsideButton(formId,label) {return '<button class="btn primary" type="submit" form="'+formId+'">'+h(label)+'</button>';}
  function action(label,verb,primary=false) {return '<button type="button" class="btn '+(primary?'primary':'secondary')+'" data-ws="'+verb+'">'+h(label)+'</button>';}
  function field(label,name,value="",required=false,placeholder="") {
    return '<label class="field ws-field"><span>'+h(label)+'</span><input type="text" name="'+name+'" value="'+h(value)+'" '+(required?'required':'')+' placeholder="'+h(placeholder)+'"></label>';
  }
  function bookForm(edit=false) {
    const b = edit ? app.book() : {title:"",genre:"",goal:"",stage:"Drafting"};
    const body = '<form id="ws-book" data-book-mode="'+(edit?'edit':'new')+'" class="ws-form">'+
      field("Manuscript title","title",b.title,true,"Untitled manuscript")+
      field("Genre or form","genre",b.genre,false,"e.g. Literary fiction")+
      '<label class="field ws-field"><span>Stage</span><select name="stage">'+[...new Set([...stages,b.stage])].map(s=>'<option '+(b.stage===s?'selected':'')+'>'+h(s)+'</option>').join("")+'</select></label>'+
      '<label class="field ws-field"><span>Current writing goal</span><textarea rows="3" name="goal" placeholder="What would you like this draft to accomplish?">'+h(b.goal)+'</textarea></label></form>';
    app.modal(edit?"Manuscript details":"New manuscript",body,action("Cancel","close")+outsideButton("ws-book",edit?"Save details":"Create manuscript"));
  }
  function switchBook() {
    const rows = app.state.books.map(b=>'<button class="ws-book-row" data-ws="choose" data-book="'+h(b.id)+'">'+
      '<span class="ws-bookmark">'+app.icon("book",20)+'</span><span><strong>'+h(b.title)+'</strong><small>'+h([b.genre,b.stage,b.isSample?"Sample manuscript":""].filter(Boolean).join(" · "))+'</small></span>'+
      (b.id===app.state.activeBookId?'<span class="ws-current">Current</span>':'')+'</button>').join("");
    app.modal("Manuscript library",'<div class="ws-books">'+rows+'</div>',action("Edit current manuscript","edit")+action("New manuscript","new",true));
  }
  function exportBackup() {
    const stamp = new Date().toISOString().slice(0,10);
    app.download("Novel-Studio-"+stamp+".json", pack(app.state), "application/json");
  }
  function settings() {
    const data = app.state;
    const error=app.storageStatus?.kind && app.storageStatus.kind!=="saved";
    const current = data.books.length+" manuscript"+(data.books.length===1?"":"s")+" · "+data.notes.length+" commonplace note"+(data.notes.length===1?"":"s");
    let body = '<div class="ws-settings"><p class="ws-info">Your manuscripts and practice are stored in this browser. Download a workspace backup to move between devices or keep another copy.</p><div class="ws-meta">'+h(current)+'</div>';
    if (error) {
      body += '<div class="ws-warning" role="status">'+h(app.storageStatus.message);
      if (app.storageStatus.kind==="conflict") body += '<div>'+action("Review saved version","review-saved")+'</div>';
      if (previousRaw !== null) body += '<div>'+action("Download original data","original")+'</div>';
      body += '</div>';
    }
    body += '<div class="ws-data-actions">'+action("Download backup","backup",true)+action("Restore backup","restore")+'</div></div>';
    app.modal("Workspace data",body,action("Done","close"));
  }
  function message(title,text) {app.modal(title,'<p class="ws-info">'+h(text)+'</p>',action("Back to workspace data","data"));}
  function previewRestore(workspace,source,fromDisk) {
    pendingRestore={workspace,fromDisk};
    const current=app.state;
    const names=workspace.books.map(b=>'<li>'+h(b.title)+' <small>· '+b.chapters.length+' chapter'+(b.chapters.length===1?"":"s")+'</small></li>').join("");
    const msg=fromDisk?"Open the version saved by the other tab.":"Replace this browser’s workspace with this backup.";
    const body='<p class="ws-info">'+h(msg)+' A backup of the workspace currently on screen will download first.</p><div class="ws-meta">'+h(source)+'</div><ul class="ws-restore-list">'+names+'</ul><p class="ws-info">'+workspace.notes.length+' commonplace notes · '+workspace.attempts.length+' practice attempts. Your current workspace has '+current.books.length+' manuscript'+(current.books.length===1?"":"s")+'.</p>';
    app.modal("Review workspace restore",body,action("Cancel","data")+action("Back up and restore","confirm-restore",true));
  }
  function installRestore() {
    if (!pendingRestore) return;
    const {workspace,fromDisk,expectedRaw} = pendingRestore;
    try {
      const currentRaw = localStorage.getItem(storageKey);
      if (currentRaw!==expectedRaw) {
        pendingRestore=null;
        message("A newer saved version is available","The saved workspace changed while you were reviewing. Reopen the restore preview to continue.");
        return;
      }
      exportBackup();
      const raw=fromDisk?currentRaw:pack(workspace,true);
      localStorage.setItem(storageKey,raw);
      // Keep the shared state object alive for feature modules holding its reference.
      Object.keys(app.state).forEach(key=>delete app.state[key]);
      Object.assign(app.state,workspace);
      remember(raw,app.state);
      pendingRestore=null; previousRaw=null;
      status("saved","Saved on this device");app.closeModal();app.render();app.toast("Workspace restored.");
    } catch {
      message("Restore could not finish","Your current workspace is still open. The browser could not save this backup. Free some browser storage or try a different browser profile.");
    }
  }
  async function chooseBackup() {
    const input = document.createElement("input");
    input.type="file";input.accept=".json,application/json";
    input.addEventListener("change",async()=>{
      const file=input.files[0];if (!file) return;
      try {
        const workspace=decode(await file.text());
        const expected=localStorage.getItem(storageKey);
        previewRestore(workspace,file.name,false);pendingRestore.expectedRaw=expected;
      } catch(error) {message("Could not read this backup",error instanceof SyntaxError?"The selected file is not valid JSON.":error.message);}
    },{once:true});
    input.click();
  }
  function reviewSaved() {
    try {
      const raw=localStorage.getItem(storageKey);
      if (!raw) {message("No saved workspace","The other tab removed its saved data. Download a backup of your open workspace, then use Restore backup to save it again.");return;}
      previewRestore(decode(raw),"Saved on this device",true); pendingRestore.expectedRaw=raw;
    } catch(error) {message("Could not read the saved version",error.message);}
  }
  document.addEventListener("click",e=>{
    const target=e.target.closest("[data-ws]");if (!target) return;
    const what=target.dataset.ws;
    if (what==="new") bookForm();
    if (what==="edit") bookForm(true);
    if (what==="close") {pendingRestore=null;app.closeModal();}
    if (what==="data") {pendingRestore=null;settings();}
    if (what==="backup") exportBackup();
    if (what==="restore") chooseBackup();
    if (what==="confirm-restore") installRestore();
    if (what==="review-saved") reviewSaved();
    if (what==="original" && previousRaw!==null) app.download("Novel-Studio-original.json",previousRaw,"application/json");
    if (what==="choose") {
      const book=app.state.books.find(b=>b.id===target.dataset.book);
      if (book) {app.state.activeBookId=book.id;app.closeModal();app.go("home");}
    }
  });
  document.addEventListener("submit",e=>{
    if (e.target.id!=="ws-book") return;
    e.preventDefault();
    const form=e.target,values=new FormData(form);
    const details={};
    for (const key of ["title","genre","stage","goal"]) details[key]=String(values.get(key)||"").trim();
    if (!details.title) {form.elements.title.setCustomValidity("Enter a manuscript title.");form.elements.title.reportValidity();return;}
    if (form.dataset.bookMode==="edit") {
      Object.assign(app.book(),details);app.save();app.closeModal();app.render();return;
    }
    const b=createBook(details);
    app.state.books.push(b);app.state.activeBookId=b.id;app.closeModal();app.go("editor");
  });
  document.addEventListener("input",e=>{if (e.target.form?.id==="ws-book" && e.target.name==="title")e.target.setCustomValidity("");});
  const style = document.createElement("style");
  style.textContent = '.ws-books,.ws-form,.ws-settings{display:grid;gap:1rem}.ws-books{gap:.45rem}.ws-book-row{display:flex;align-items:center;gap:.8rem;text-align:left;width:100%;padding:.8rem;border:1px solid var(--line);color:var(--ink);background:var(--white);border-radius:9px;cursor:pointer}.ws-book-row:hover,.ws-book-row:focus-visible{border-color:var(--green);background:var(--paper)}.ws-bookmark{color:var(--green);display:grid;place-items:center;width:36px;height:42px;background:#e8eddf;border-radius:3px}.ws-book-row strong,.ws-book-row small{display:block}.ws-book-row strong{font:600 1.08rem Georgia,serif}.ws-book-row small,.ws-meta,.ws-current,.ws-restore-list small{font-size:.84rem;color:var(--muted)}.ws-book-row small{margin-top:4px}.ws-current{margin-left:auto}.ws-field{display:grid;gap:.35rem}.ws-field>span{font-weight:600;color:var(--ink)}.ws-field input,.ws-field select,.ws-field textarea{font:inherit;padding:.62rem .7rem;border:1px solid var(--line);border-radius:5px;color:var(--ink);background:var(--white);width:100%;box-sizing:border-box}.ws-field textarea{resize:vertical;min-height:70px}.ws-data-actions{display:flex;gap:.55rem;flex-wrap:wrap}.ws-info{line-height:1.55;margin:0;color:var(--ink)}.ws-meta{margin:0}.ws-warning{line-height:1.45;background:#faf0dd;border:1px solid #dbc398;border-radius:5px;padding:.75rem;color:#67451c}.ws-warning .btn{margin-top:.5rem}.ws-restore-list{line-height:1.6;max-height:14rem;overflow:auto}';
  document.head.appendChild(style);
  Object.assign(app,{loadWorkspace,persistWorkspace,createBook,newBook:()=>bookForm(false),editBook:()=>bookForm(true),switchBook,settings,exportBackup});
})();

