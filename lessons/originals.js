/* Original PDFs stay on this device. Only named course documents are read from the ZIPs. */
(() => {
  'use strict';
  const host = document.getElementById('lesson-originals');
  if (!host) return;
  const database = 'novel-studio-lesson-originals-v1';
  const tracks = { 'fiction-tabs': 'fiction', 'vocab-tabs': 'vocabulary' };
  let dbPromise, active, revision = 0, objectUrl, importing = false;

  function openStore() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(database, 1);
        request.onupgradeneeded = () => request.result.createObjectStore('pdfs');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }).catch(error => { dbPromise = null; throw error; });
    }
    return dbPromise;
  }

  function lessonKey(track, name) {
    if (/^map\.pdf$/i.test(name) && track === 'fiction') return 'fiction/map';
    const week = /^week\s+(\d{1,2})\.pdf$/i.exec(name);
    if (week && +week[1] >= 1 && +week[1] <= 20) return `${track}/week-${+week[1]}`;
    return null;
  }

  function checkedPDF(bytes) {
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') throw Error('That file is not a readable PDF.');
    return new Blob([bytes], {type:'application/pdf'});
  }

  async function readZip(file) {
    const buffer = await file.arrayBuffer(), bytes = new Uint8Array(buffer), view = new DataView(buffer);
    let end = buffer.byteLength - 22;
    const lower = Math.max(0, end - 65535);
    for (; end >= lower; end--) if (view.getUint32(end, true) === 0x06054b50) break;
    if (end < lower) throw Error('Choose the original fiction-tabs.zip or vocab-tabs.zip.');
    const count = view.getUint16(end + 10, true), files = new Map();
    let offset = view.getUint32(end + 16, true);
    for (let i = 0; i < count; i++) {
      if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) throw Error('This ZIP is incomplete.');
      const method = view.getUint16(offset + 10, true), size = view.getUint32(offset + 20, true);
      const rawSize = view.getUint32(offset + 24, true), local = view.getUint32(offset + 42, true);
      const nameLen = view.getUint16(offset + 28, true), extra = view.getUint16(offset + 30, true), comment = view.getUint16(offset + 32, true);
      const path = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLen));
      offset += 46 + nameLen + extra + comment;
      if (path.split('/').some(part => part.startsWith('.') || part === '__MACOSX')) continue;
      const parts = path.split('/');
      const track = tracks[parts[parts.length-2]?.toLowerCase()] || (parts.length === 1 ? tracks[file.name.toLowerCase().replace(/\.zip$/, '')] : null);
      const key = track && lessonKey(track, parts[parts.length-1]);
      if (!key) continue;
      if (local + 30 > end || view.getUint32(local, true) !== 0x04034b50 || rawSize > 16 * 1024 * 1024) throw Error('Could not read a course PDF from this ZIP.');
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      if (start + size > end) throw Error('This ZIP is incomplete.');
      const data = bytes.subarray(start, start + size);
      let raw = data;
      if (method !== 0) {
        if (method !== 8 || typeof DecompressionStream === 'undefined') throw Error('Unzip this archive on your device and choose its PDF files instead.');
        try { raw = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()); }
        catch { throw Error('Unzip this archive on your device and choose its PDF files instead.'); }
      }
      if (raw.byteLength !== rawSize) throw Error('A PDF in this ZIP is incomplete.');
      files.set(key, checkedPDF(raw));
    }
    if (!files.size) throw Error('This archive contains no recognized weekly course PDFs.');
    return files;
  }

  const details = document.createElement('details'), summary = document.createElement('summary'), copy = document.createElement('p');
  const link = document.createElement('a'), label = document.createElement('label'), picker = document.createElement('input'), status = document.createElement('p');
  summary.textContent = 'Original lesson PDF';
  copy.textContent = 'Choose fiction-tabs.zip or vocab-tabs.zip once to keep the original pages on this device. You can also choose individual PDFs for this course.';
  link.target = '_blank'; link.rel = 'noopener'; link.hidden = true; link.textContent = 'Open original PDF';
  label.textContent = 'Add course ZIPs or PDFs';
  picker.type = 'file'; picker.multiple = true; picker.accept = '.zip,.pdf,application/zip,application/pdf';
  label.append(picker); status.setAttribute('role','status');
  details.append(summary, copy, link, label, status); host.append(details);
  function updateUrl(blob) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = blob ? URL.createObjectURL(blob) : null; link.hidden = !blob;
    if (blob) link.href = objectUrl; else link.removeAttribute('href');
  }
  async function select({track, lesson}, keepMessage = false) {
    if (!['fiction','vocabulary'].includes(track) || !lesson) return;
    const key = `${track}/${lesson}`, ticket = ++revision; active = {track,lesson}; updateUrl(null);
    if (!keepMessage && !importing) status.textContent = '';
    try {
      const db = await openStore();
      const blob = await new Promise((resolve,reject) => {
        const req = db.transaction('pdfs').objectStore('pdfs').get(key);
        req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
      });
      if (ticket === revision && blob) updateUrl(blob);
    } catch { if (ticket === revision) status.textContent = 'Browser storage is unavailable for original PDFs.'; }
  }
  document.getElementById('jump-original')?.addEventListener('click', () => {
    details.open = true;
    (link.hidden ? picker : link).focus({preventScroll:true});
    details.scrollIntoView({block:'center'});
  });
  picker.addEventListener('change', async () => {
    if (importing || !active || !picker.files.length) return;
    const selected = Array.from(picker.files), track = active.track;
    picker.disabled = true; importing = true; status.textContent = 'Reading the selected files…';
    try {
      const entries = new Map();
      for (const file of selected) {
        if (/\.zip$/i.test(file.name)) { for (const [key,blob] of await readZip(file)) entries.set(key,blob); }
        else {
          const key = lessonKey(track,file.name);
          if (!key) throw Error('Select a numbered Week PDF, the fiction Map PDF, or the original course ZIP.');
          entries.set(key,checkedPDF(new Uint8Array(await file.arrayBuffer())));
        }
      }
      const db = await openStore();
      await new Promise((resolve,reject) => {
        const txn = db.transaction('pdfs','readwrite'), store = txn.objectStore('pdfs');
        txn.oncomplete = resolve; txn.onabort = () => reject(txn.error); txn.onerror = () => reject(txn.error);
        for (const [key,blob] of entries) store.put(blob,key);
      });
      status.textContent = `${entries.size} original PDF${entries.size === 1 ? '' : 's'} available on this device.`;
      await select(active,true);
    } catch (err) { status.textContent = err?.message || 'Could not save these files on this device.'; }
    finally { picker.disabled = false; picker.value = ''; importing = false; }
  });
  window.addEventListener('ns-lesson-rendered', e => select(e.detail || {}));
  if (host.dataset.track && host.dataset.lesson) select(host.dataset);
})();
