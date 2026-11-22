
(() => {
  "use strict";
  const N = window.NS;
  const esc = value => N.esc(String(value ?? ""));
  const ic = (name, size = 17) => N.icon(name, size);
  let focusMode = false;
  let importDraft = null;
  let mapFilter = "";
  let saveTimer;
  let hasTextChanges = false;
  let otherChapterWords = 0;
  const words = text => (String(text || "").match(/\S+/g) || []).length;
  const fmt = value => value.toLocaleString();
  const nwords = chapter => words(chapter.text);
  const chapterRef = (book, id) => book.chapters.find(c => c.id === id);
  const activeChapter = book => chapterRef(book, book.activeChapterId) || book.chapters[0];
  const clone = value => JSON.parse(JSON.stringify(value));
  const newChapter = (title, text = "") => ({ id: N.id(), title, text, pov: "", thread: "", dependsOn: [], aim: "", needsReview: false });
  const action = (name, label, options = {}) => {
    const { value = "", icon = "", cls = "secondary", title = "", disabled = false } = options;
    return `<button type="button" class="btn ${cls}" data-ms="${name}" data-value="${esc(value)}" ${title ? `title="${esc(title)}"` : ""} ${disabled ? "disabled" : ""}>${icon ? ic(icon) : ""}<span>${label}</span></button>`;
  };
  const smallIcon = (name, label, value, glyph, disabled = false) =>
    `<button type="button" class="ms-icon" title="${esc(label)}" aria-label="${esc(label)}" data-ms="${name}" data-value="${esc(value)}" ${disabled ? "disabled" : ""}>${glyph}</button>`;
  const field = (label, html) => `<label class="ms-field"><span>${label}</span>${html}</label>`;
  const get = id => document.getElementById(id);
  const val = id => get(id)?.value?.trim() || "";
  const modal = (title, body, actions = "") => N.modal(title, `<div class="ms-dialog">${body}</div>`, actions);
  const store = () => { clearTimeout(saveTimer); hasTextChanges = false; return N.save(); };
  const flush = () => { if (hasTextChanges) store(); };
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
  const date = iso => {
    const d = new Date(iso);
    return Number.isNaN(+d) ? "" : d.toLocaleString(undefined, {month:"short", day:"numeric", hour:"numeric", minute:"2-digit"});
  };
  const ordinal = (book, chapter) => book.chapters.findIndex(c => c.id === chapter.id) + 1;
  const ensure = book => {
    if (!Array.isArray(book.chapters)) book.chapters = [];
    if (!Array.isArray(book.snapshots)) book.snapshots = [];
    return book;
  };
  function draftChapter(id) {
    const book = ensure(N.book());
    if (!chapterRef(book, id)) return;
    book.activeChapterId = id;
    store();
    N.closeModal();
    N.go("editor");
  }
  N.openChapter = draftChapter;
  function addChapter() {
    const book = ensure(N.book());
    modal("New chapter", field("Chapter title", `<input id="ms-new-title" class="field" placeholder="Untitled chapter" maxlength="180" autofocus>`) +
      field("What should this chapter do?", '<textarea id="ms-new-aim" class="field" rows="3" placeholder="Optional intention for this chapter"></textarea>'),
      action("create", "Create chapter", {cls:"primary", value:book.id}));
  }
  N.addChapter = addChapter;
  function metadata(id) {
    const book = ensure(N.book()), ch = chapterRef(book, id);
    if (!ch) return;
    const links = book.chapters.filter(other => other.id !== id);
    modal("Chapter notes", field("Chapter title", `<input class="field" id="ms-meta-title" required maxlength="180" value="${esc(ch.title)}">`) +
      field("Intended effect", `<textarea class="field" id="ms-meta-aim" rows="2" placeholder="What do you want a reader to feel or understand?">${esc(ch.aim)}</textarea>`) +
      '<div class="ms-field-grid">' + field("Point of view", `<input class="field" id="ms-meta-pov" value="${esc(ch.pov)}" placeholder="Narrator or viewpoint">`) +
      field("Story thread", `<input class="field" id="ms-meta-thread" value="${esc(ch.thread)}" placeholder="Relationship, subplot, motif…">`) + '</div>' +
      (links.length ? `<fieldset class="ms-link-field"><legend>Chapters this one depends on</legend><div>${links.map((other) =>
        `<label><input type="checkbox" name="ms-dependency" value="${esc(other.id)}" ${(ch.dependsOn || []).includes(other.id) ? "checked" : ""}> ${esc(other.title)}</label>`).join("")}</div></fieldset>` : ""),
      (book.chapters.length>1 ? action("prepare-cut", "Cut chapter", {value:id}) : "") + action("save-meta", "Save chapter notes", {cls:"primary", value:id}));
  }
  function editorView() {
    const book = ensure(N.book()), ch = activeChapter(book);
    const wordTotal = book.chapters.reduce((s, c) => s+nwords(c), 0);
    otherChapterWords = wordTotal - (ch ? nwords(ch) : 0);
    return `<section class="ms-screen ms-editor" aria-label="Manuscript editor">
      <header class="view-head ms-view-head"><div><div class="eyebrow">WRITING DESK</div><h1>Manuscript</h1><p>${esc(book.title)}</p></div>
        <div class="ms-actions">${action("import","Import")}${action("export","Export",{icon:"download"})}</div></header>
      <div class="ms-workspace">
        <aside class="ms-contents"><div class="ms-contents-head"><span class="eyebrow">CHAPTERS</span>${smallIcon("new","Add chapter","",ic("plus",17))}</div>
          <div class="ms-chapter-list">${book.chapters.map((item, i)=>`<button type="button" data-ms="select" data-value="${esc(item.id)}" class="ms-chapter ${item.id===ch?.id ? "current" : ""}" ${item.id===ch?.id ? 'aria-current="page"' : ""}><span class="ms-num">${String(i+1).padStart(2,"0")}</span><span>${esc(item.title)}</span></button>`).join("")}</div>
          <div class="ms-book-count"><span data-ms-total>${fmt(wordTotal)}</span> manuscript words</div>
        </aside>
        ${ch ? `<div class="ms-sheet"><div class="ms-tools"><div class="eyebrow">CHAPTER ${String(ordinal(book,ch)).padStart(2,"0")}</div>
          <div class="ms-tool-actions">${smallIcon("meta","Edit chapter notes",ch.id,ic("edit",17))}
          ${smallIcon("snapshots","Draft snapshots","",ic("history",17))}
          ${action("focus", focusMode ? "Exit focus" : "Focus",{icon:"focus",cls:"ms-quiet"})}</div></div>
          <div class="ms-paper"><h2>${esc(ch.title)}</h2>
          ${ch.aim ? `<button class="ms-aim" data-ms="meta" data-value="${esc(ch.id)}" title="Edit intention">${esc(ch.aim)}</button>` : ""}
          <textarea aria-label="Chapter prose" id="ms-prose" spellcheck="true" placeholder="Begin this chapter…">${esc(ch.text)}</textarea></div>
          <footer class="ms-editor-foot"><span><span data-ms-words>${fmt(nwords(ch))}</span> words</span><span class="ms-divider"></span><span data-ms-status>${esc(N.storageStatus?.kind === "saved" ? "Saved on this device" : N.storageStatus?.message || "Local draft")}</span>
          <button class="ms-practice-link" data-ms="practice" data-value="${esc(ch.id)}">Practice with this chapter</button></footer>
        </div>` : `<div class="ms-sheet ms-empty"><h2>Your first chapter</h2><p>Start with a title, or bring in a draft.</p>${action("new","Add chapter",{cls:"primary",icon:"plus"})}</div>`}
      </div></section>`;
  }
  N.views.editor = editorView;
  N.after.editor = () => {
    document.body.classList.toggle("ms-focused", focusMode);
    const ch = activeChapter(ensure(N.book())), el = get("ms-prose");
    if (el && ch) {
      if (el.value !== ch.text) el.value = ch.text || "";
      const pos = Math.min(ch.cursor || 0, el.value.length);
      el.setSelectionRange(pos,pos);
      el.scrollTop = ch.scroll || 0;
    }
  };
  function leaveFocus() {
    focusMode = false;
    document.body.classList.remove("ms-focused");
  }
  new MutationObserver(() => {
    if (focusMode && !get("ms-prose")) leaveFocus();
  }).observe(document.body, {childList:true,subtree:true});
  function chapterChanged(el) {
    const book = ensure(N.book()), ch = activeChapter(book);
    if (!ch) return;
    ch.text = el.value;
    ch.cursor = el.selectionStart;
    ch.updatedAt = new Date().toISOString();
    hasTextChanges = true;
    const chapterWords = nwords(ch);
    document.querySelector("[data-ms-words]").textContent = fmt(chapterWords);
    document.querySelector("[data-ms-total]").textContent = fmt(otherChapterWords + chapterWords);
    const status = document.querySelector("[data-ms-status]");
    if (status) status.textContent = "Saving…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const saved = store();
      if (status?.isConnected) status.textContent = saved ? "Saved on this device" : N.storageStatus?.message || "Changes are in this tab";
    }, 320);
  }
  document.addEventListener("input", e => {
    if (e.target.id === "ms-prose") chapterChanged(e.target);
  });
  document.addEventListener("focusout", e => {
    if (e.target.id === "ms-prose") {
      const ch = activeChapter(ensure(N.book()));
      if (ch) { ch.cursor = e.target.selectionStart; ch.scroll = e.target.scrollTop; }
      store();
    }
  });
  function snapshot(book,name) {
    const entry = {id:N.id(), name, date:new Date().toISOString(), chapters:clone(book.chapters), activeChapterId:book.activeChapterId};
    book.snapshots.unshift(entry);
    return entry;
  }
  function snapshots() {
    const book = ensure(N.book());
    const listing = book.snapshots.map(snap => `<div class="ms-version"><div><strong>${esc(snap.name)}</strong><small>${esc(date(snap.date))} · ${snap.chapters.length} chapter${snap.chapters.length === 1 ? "" : "s"}</small></div>${action("review-snapshot","View",{value:snap.id})}</div>`).join("");
    modal("Draft snapshots",field("Save this version", '<input class="field" id="ms-snapshot-name" maxlength="160" placeholder="Before the structural pass">') +
      `<div class="ms-list-versions">${listing || '<p class="ms-muted">Saved versions of the full manuscript will appear here.</p>'}</div>`,
      action("save-snapshot","Save snapshot",{cls:"primary"}));
  }
  N.openSnapshot = snapshots;
  function reviewSnapshot(id) {
    const book = ensure(N.book()), snap = book.snapshots.find(s=>s.id===id);
    if (!snap) return;
    modal(snap.name, `<p class="ms-muted">${esc(date(snap.date))} · ${fmt(snap.chapters.reduce((n,c)=>n+nwords(c),0))} words</p><div class="ms-snapshot-preview">${snap.chapters.map(ch => `<details><summary>${esc(ch.title)}</summary><p>${esc(ch.text) || "Empty chapter"}</p></details>`).join("")}</div><p class="ms-muted">Restoring saves your current draft as another snapshot.</p>`,
      action("snapshots","Back") + action("restore","Restore this draft",{cls:"primary",value:id}));
  }
  function moveChapter(book,id,by) {
    const origin = book.chapters.findIndex(c=>c.id===id), dest = origin+by;
    if (origin<0 || dest<0 || dest>=book.chapters.length) return;
    const old = new Map(book.chapters.map((ch,i)=>[ch.id,i]));
    const moved = book.chapters.splice(origin,1)[0];
    book.chapters.splice(dest,0,moved);
    const now = new Map(book.chapters.map((ch,i)=>[ch.id,i]));
    let flagged=0;
    book.chapters.forEach(ch=>{
      const affected = (ch.dependsOn || []).some(dep=>old.has(dep) && now.has(dep) &&
        (dep === id || (ch.id === id && (old.get(dep)<old.get(ch.id))!==(now.get(dep)<now.get(ch.id)))));
      if (affected) { ch.needsReview = true; flagged++; }
    });
    store(); N.render();
    N.toast(flagged ? `Chapter moved. ${flagged} linked chapter${flagged===1?"":"s"} marked for review.` : "Chapter moved");
  }
  function mapView() {
    leaveFocus();
    const book = ensure(N.book()), terms = [...new Set(book.chapters.map(c=>c.thread).filter(Boolean))];
    if (mapFilter!=="__review" && !terms.includes(mapFilter)) mapFilter="";
    const shown = book.chapters.filter(c=>!mapFilter || (mapFilter==="__review" ? c.needsReview : c.thread===mapFilter));
    const passes = Array.isArray(book.passes) ? book.passes : [];
    const pass = passes.find(p=>p.status === "open");
    return `<section class="ms-screen"><header class="view-head ms-view-head"><div><div class="eyebrow">STORY STRUCTURE</div><h1>Novel map</h1><p>${esc(book.title)}</p></div><div class="ms-actions">${action("snapshots","Snapshots",{icon:"history"})}${action("new","Add chapter",{cls:"primary",icon:"plus"})}</div></header>
      <div class="ms-map-controls"><label class="ms-filter"><span class="eyebrow">SHOW</span><select class="field" id="ms-thread-filter"><option value="">All chapters</option><option value="__review" ${mapFilter==="__review"?"selected":""}>Needs a reread</option>${terms.map(t=>`<option value="${esc(t)}" ${mapFilter===t?"selected":""}>${esc(t)}</option>`).join("")}</select></label><span>${shown.length} of ${book.chapters.length} chapters</span></div>
      <div class="ms-map-list">${shown.map(ch=>{
        const idx=ordinal(book,ch), deps=(ch.dependsOn||[]).map(id=>chapterRef(book,id)).filter(Boolean);
        return `<article class="ms-map-card"><div class="ms-map-index">${String(idx).padStart(2,"0")}</div>
          <div class="ms-map-content"><button class="ms-title-link" data-ms="select" data-value="${esc(ch.id)}">${esc(ch.title)}</button>
          ${ch.aim ? `<p>${esc(ch.aim)}</p>` : ""}<div class="ms-tags">${ch.pov ? `<span>POV · ${esc(ch.pov)}</span>` : ""}${ch.thread ? `<span>${esc(ch.thread)}</span>` : ""}<span>${fmt(nwords(ch))} words</span></div>
          ${deps.length ? `<div class="ms-links">Depends on ${deps.map(d=>esc(d.title)).join(", ")}</div>` : ""}
          ${ch.needsReview ? `<button class="ms-review" data-ms="ack" data-value="${esc(ch.id)}">Needs a reread · Mark reviewed</button>` : ""}</div>
          <div class="ms-map-buttons">${smallIcon("meta","Edit chapter notes",ch.id,ic("edit",16))}${smallIcon("earlier","Move earlier",ch.id,'<span aria-hidden="true">↑</span>',idx===1)}${smallIcon("later","Move later",ch.id,'<span aria-hidden="true">↓</span>',idx===book.chapters.length)}</div></article>`;}).join("") || `<div class="ms-empty"><p>${book.chapters.length ? "No chapters match this view." : "Your chapter sequence starts here."}</p>${book.chapters.length ? action("all","Show all chapters") : action("new","Add chapter",{cls:"primary"})}</div>`}</div>
      <div class="ms-pass"><div><div class="eyebrow">REVISION PASS</div><h2>${esc(pass?.title || "Choose a finish line")}</h2><p>${esc(pass?.finishLine || "Decide what would make this pass complete before revising the sequence.")}</p>
      ${passes.some(p=>p.status==="complete")?`<small>${passes.filter(p=>p.status==="complete").length} completed pass${passes.filter(p=>p.status==="complete").length===1?"":"es"}</small>`:""}</div>${action("revision","Open revision desk")}</div>
      </section>`;
  }
  N.views.map = mapView;
  const cleanFilename = text => String(text||"Manuscript").replace(/[<>:"/\\|?*\x00-\x1F]/g,"-").slice(0,150)||"Manuscript";
  const xml = text => String(text||"").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
  const wordNS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  async function docx(book) {
    if (!window.JSZip) throw new Error("The Word document component is unavailable.");
    const zip=new window.JSZip(), head='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const rels="http://schemas.openxmlformats.org/package/2006/relationships", office="http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    zip.file("[Content_Types].xml", head+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
    zip.file("_rels/.rels",head+`<Relationships xmlns="${rels}"><Relationship Id="rId1" Type="${office}/officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.file("word/_rels/document.xml.rels",head+`<Relationships xmlns="${rels}"><Relationship Id="rId1" Type="${office}/styles" Target="styles.xml"/></Relationships>`);
    zip.file("word/styles.xml",head+`<w:styles xmlns:w="${wordNS}"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="90" w:line="340" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="48"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:pageBreakBefore/><w:keepNext/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style></w:styles>`);
    function para(text,style) {
      return `<w:p>${style?`<w:pPr><w:pStyle w:val="${style}"/></w:pPr>`:""}<w:r>${String(text||"").split("\t").map(t=>`<w:t xml:space="preserve">${xml(t)}</w:t>`).join("<w:tab/>")}</w:r></w:p>`;
    }
    const paragraphs=[para(book.title,"Title")];
    book.chapters.forEach(ch=>{paragraphs.push(para(ch.title,"Heading1")); String(ch.text||"").split(/\r?\n/).forEach(line=>paragraphs.push(para(line)));});
    zip.file("word/document.xml",head+`<w:document xmlns:w="${wordNS}"><w:body>${paragraphs.join("")}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:bottom="1440" w:left="1440" w:right="1440"/></w:sectPr></w:body></w:document>`);
    return zip.generateAsync({type:"blob",compression:"DEFLATE",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
  }
  const chapterHeading = /^chapter\s+(?:\d+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?:\s*[:.\-–—]\s*\S.*)?\s*$/i;
  function parseText(text, filename, md) {
    const lines=text.replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n").split("\n"), entries=[], data=[];
    const markdownH2=md && lines.some(line=>/^##\s+\S/.test(line));
    let title=null, started=false;
    function commit() {
      const prose=data.join("\n").replace(/^\n+|\n+$/g,"");
      if (title !== null || prose.trim()) entries.push(newChapter(title || filename, prose));
      data.length=0;
    }
    const chapterStyle=lines.some(line=>chapterHeading.test(line.trim()));
    for (let i=0;i<lines.length;i++) {
      const line=lines[i], trim=line.trim();
      if (!started && !data.some(s=>s.trim()) && ((markdownH2&&/^#\s+/.test(trim))||
        (!md && chapterStyle && !chapterHeading.test(trim) && cleanFilename(trim).toLocaleLowerCase()===filename.toLocaleLowerCase() && i===lines.findIndex(l=>l.trim()) && lines.slice(i+1).find(l=>l.trim())?.trim().match(chapterHeading)))) {
        started=true;continue;
      }
      let next=null;
      if (md && (markdownH2 ? /^##\s+\S/.test(line) : /^#\s+\S/.test(line))) next=line.replace(/^#{1,2}\s+/,"").trim();
      else if (chapterHeading.test(trim)) next=trim.replace(/^chapter\s+\d+\s+[—–-]\s+(.+)$/i,"$1");
      if (next!==null) {commit();title=next;started=true;} else data.push(line);
    }
    commit();
    return entries;
  }
  async function parseDocx(file,base) {
    if (!window.JSZip) throw new Error("The Word document component is unavailable.");
    const pack=await window.JSZip.loadAsync(file), fileXml=pack.file("word/document.xml");
    if (!fileXml) throw new Error("This file has no readable Word manuscript.");
    const tree=new DOMParser().parseFromString(await fileXml.async("string"),"application/xml");
    if (tree.querySelector("parsererror")) throw new Error("This Word document could not be read.");
    const ps=[...tree.getElementsByTagNameNS("*","p")].map(p=>{
      const styleNode=p.getElementsByTagNameNS("*","pStyle")[0];
      const style=(styleNode?.getAttributeNS(wordNS,"val") || styleNode?.getAttribute("w:val") || "").toLowerCase().replace(/[\s-]+/g,"");
      const text=[...p.getElementsByTagName("*")].map(t=>t.localName==="t"?t.textContent:t.localName==="tab"?"\t":t.localName==="br"?"\n":"").join("");
      return {style,text};
    });
    const level=ps.some(p=>p.style==="heading1")?"heading1":"heading2";
    if (ps.some(p=>p.style===level)) {
      const entries=[], lines=[]; let title=null;
      const commit=()=>{const prose=lines.join("\n"); if(title!==null || prose.trim()) entries.push(newChapter(title || base,prose)); lines.length=0;};
      ps.forEach((p,i)=>{if(p.style==="title" && i===0) return; if(p.style===level && p.text.trim()){commit();title=p.text.trim();} else lines.push(p.text);});
      commit(); return entries;
    }
    return parseText(ps.filter((p,i)=>!(i===0 && p.style==="title")).map(p=>p.text).join("\n"),base,false);
  }
  function importDialog() {
    const book=ensure(N.book()); importDraft=null;
    modal("Import manuscript",'<p class="ms-muted">Choose a Word document, Markdown manuscript, or plain text draft. Chapter headings become separate chapters.</p>'+field("Manuscript file",'<input id="ms-import-file" class="field" type="file" accept=".docx,.md,.markdown,.txt,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document">')+'<div class="ms-import-info" id="ms-import-info" role="status"></div>'+field("Add to this book",'<select class="field" id="ms-import-mode"><option value="append">Append as new chapters</option><option value="replace">Replace chapters and keep a snapshot</option></select>'),
       action("do-import","Import chapters",{cls:"primary",disabled:true,value:book.id}));
  }
  N.openImport=importDialog;
  function exportDialog() {
    const book=ensure(N.book());
    modal("Export manuscript",`<p class="ms-muted">${esc(book.title)} · ${book.chapters.length} chapters · ${fmt(book.chapters.reduce((s,c)=>s+nwords(c),0))} words</p>` +
      field("File format",'<select id="ms-export-format" class="field"><option value="docx">Word document (.docx)</option><option value="md">Markdown (.md)</option><option value="txt">Plain text (.txt)</option></select>'),
      action("do-export","Download manuscript",{cls:"primary",icon:"download",value:book.id}));
  }
  N.openExport=exportDialog;
  document.addEventListener("change", async e=>{
    if (e.target.id==="ms-thread-filter") {mapFilter=e.target.value;N.render();return;}
    if (e.target.id!=="ms-import-file") return;
    const file=e.target.files[0], input=e.target, info=get("ms-import-info"), button=document.querySelector('[data-ms="do-import"]');
    importDraft=null;button.disabled=true;
    if (!file) {info.textContent="";return;}
    const owner=N.book().id, base=file.name.replace(/\.[^.]+$/,"")||"Imported chapter";
    info.textContent="Reading manuscript…";
    try {
      const chapters=/\.docx$/i.test(file.name) ? await parseDocx(file,base) : /\.(md|markdown|txt)$/i.test(file.name) ? parseText(await file.text(),base,/\.(md|markdown)$/i.test(file.name)) : null;
      if (!chapters) throw new Error("Choose a DOCX, Markdown or TXT file.");
      if (!chapters.length) throw new Error("This file contains no chapters or prose.");
      if (!input.isConnected || input.files[0]!==file || N.book().id!==owner) return;
      importDraft={chapters,owner};button.disabled=false;info.textContent=`${chapters.length} chapter${chapters.length===1?"":"s"} ready · ${fmt(chapters.reduce((n,c)=>n+nwords(c),0))} words`;
    } catch(error) {if (input.isConnected && input.files[0]===file) info.textContent=error.message || "This file could not be imported.";}
  });
  async function exportBook(type,book) {
    const filename=cleanFilename(book.title)+"."+type;
    let body,mime;
    if(type==="docx"){body=await docx(book);mime=body.type;}
    else if(type==="md"){body="# "+book.title+"\n\n"+book.chapters.map(c=>"## "+c.title+"\n\n"+c.text).join("\n\n")+"\n";mime="text/markdown;charset=utf-8";}
    else {body=book.title+"\n\n"+book.chapters.map((c,i)=>"Chapter "+(i+1)+" — "+c.title+"\n\n"+c.text).join("\n\n")+"\n";mime="text/plain;charset=utf-8";}
    N.download(filename,body,mime);
  }
  document.addEventListener("click",async e=>{
    const btn=e.target.closest("[data-ms]"); if(!btn || btn.disabled) return;
    const name=btn.dataset.ms, id=btn.dataset.value;
    const book=ensure(N.book()), ch=chapterRef(book,id);
    switch (name) {
      case "focus": focusMode=!focusMode;document.body.classList.toggle("ms-focused",focusMode); btn.querySelector("span:last-child").textContent=focusMode?"Exit focus":"Focus";get("ms-prose")?.focus();break;
      case "new":addChapter();break;
      case "create": {
        if(id!==book.id) return;
        const added=newChapter(val("ms-new-title")||`Chapter ${book.chapters.length+1}`);
        added.aim=val("ms-new-aim");book.chapters.push(added);draftChapter(added.id);break;
      }
      case "select":draftChapter(id);break;
      case "meta":metadata(id);break;
      case "save-meta":{
        if(!ch)return;
        const input=get("ms-meta-title");if(!input?.reportValidity())return;
        ch.title=val("ms-meta-title") || ch.title;ch.aim=val("ms-meta-aim");ch.pov=val("ms-meta-pov");ch.thread=val("ms-meta-thread");ch.dependsOn=[...document.querySelectorAll('input[name="ms-dependency"]:checked')].map(x=>x.value);store();N.closeModal();N.render();N.toast("Chapter notes saved");break;
      }
      case "prepare-cut":{
        if(!ch || book.chapters.length<=1)return;
        modal("Cut this chapter?",`<p class="ms-muted">“${esc(ch.title)}” will leave the active manuscript. A full draft snapshot will preserve it, and chapters that rely on it will be marked for rereading.</p>`,
          action("meta","Keep chapter",{value:id})+action("cut","Cut and save snapshot",{cls:"primary",value:id}));break;
      }
      case "cut":{
        if(!ch || book.chapters.length<=1)return;
        const idx=ordinal(book,ch)-1;
        snapshot(book,"Before cutting "+ch.title);
        book.chapters=book.chapters.filter(c=>c.id!==id);
        for (const item of book.chapters) if ((item.dependsOn||[]).includes(id)) {
          item.needsReview=true; item.dependsOn=item.dependsOn.filter(dep=>dep!==id);
        }
        if(book.activeChapterId===id)book.activeChapterId=book.chapters[Math.min(idx,book.chapters.length-1)].id;
        const ok=store();N.closeModal();N.render();N.toast(ok ? "Chapter cut. A draft snapshot was saved." : N.storageStatus?.message || "Changes are in this tab.");break;
      }
      case "practice":N.openPractice(id);break;
      case "snapshots":snapshots();break;
      case "save-snapshot":snapshot(book,val("ms-snapshot-name")||"Draft snapshot");store();snapshots();N.toast("Draft snapshot saved");break;
      case "review-snapshot":reviewSnapshot(id);break;
      case "restore":{
        const version=book.snapshots.find(v=>v.id===id);if(!version)return;
        snapshot(book,"Before restoring "+version.name);book.chapters=clone(version.chapters);book.activeChapterId=version.activeChapterId || book.chapters[0]?.id;store();N.closeModal();N.render();N.toast("Snapshot restored");break;
      }
      case "earlier":moveChapter(book,id,-1);break;
      case "later":moveChapter(book,id,1);break;
      case "ack":if(ch){ch.needsReview=false;store();N.render();}break;
      case "all":mapFilter="";N.render();break;
      case "revision":N.go("revision");break;
      case "import":importDialog();break;
      case "export":exportDialog();break;
      case "do-import":{
        if(!importDraft || importDraft.owner!==book.id || id!==book.id)return;
        const chapters=importDraft.chapters;
        if(get("ms-import-mode")?.value==="replace"){if(book.chapters.length)snapshot(book,"Before manuscript import");book.chapters=chapters;}
        else book.chapters.push(...chapters);
        importDraft=null;draftChapter(chapters[0].id);N.toast("Manuscript imported");break;
      }
      case "do-export":{
        if(id!==book.id)return;
        btn.disabled=true;
        try {await exportBook(val("ms-export-format"),clone(book));N.closeModal();N.toast("Manuscript exported");} catch(error){N.toast(error.message || "Export failed");}finally{btn.disabled=false;}
        break;
      }
    }
  });
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape" && focusMode){leaveFocus();N.render();}
    if(e.key==="Enter" && e.target.id==="ms-new-title"){e.preventDefault();document.querySelector('[data-ms="create"]')?.click();}
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="s"&&get("ms-prose")){e.preventDefault();const ok=store();N.toast(ok ? "Manuscript saved" : N.storageStatus?.message || "Changes are in this tab");}
  });
})();

