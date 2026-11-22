
function installNovelBridge(studio, root, hub) {
  const findEditor = () => root.querySelector('#ms-prose');
  let saved = null;

  function wordAt(text, point) {
    const words = /[\p{L}\p{M}\p{N}]+(?:[’'-][\p{L}\p{M}\p{N}]+)*/gu;
    for (const match of text.matchAll(words)) {
      const start = match.index, end = start + match[0].length;
      if (start > point) break;
      if (point <= end) return {start, end};
    }
    return {start:point, end:point};
  }

  function sceneExcerpt(text, start, end) {
    if (end > start && text.slice(start, end).trim()) return text.slice(start, Math.min(end, start + 1200)).trim();
    const paragraphStart = text.lastIndexOf('\n', start - 1) + 1;
    const nextBreak = text.indexOf('\n', end);
    const paragraphEnd = nextBreak < 0 ? text.length : nextBreak;
    const from = Math.max(paragraphStart, Math.min(start - 600, paragraphEnd - 1200));
    return text.slice(from, Math.min(paragraphEnd, from + 1200)).trim();
  }

  function capture(mode = 'browse') {
    const editor = findEditor();
    if (!editor || studio.state.activeView !== 'editor') { saved = null; return null; }
    const book = studio.book();
    const chapter = book.chapters.find(item => item.id === book.activeChapterId) || book.chapters[0];
    if (!chapter) { saved = null; return null; }
    if (chapter.text !== editor.value) editor.dispatchEvent(new Event('input', {bubbles:true}));
    const text = editor.value;
    const start = editor.selectionStart, end = editor.selectionEnd;
    const selected = text.slice(start, end);
    const phrase = selected.trim();
    let from = start, to = end;
    if (phrase) {
      from += selected.indexOf(phrase);
      to = from + phrase.length;
    } else if (mode === 'lookup' && start === end) {
      ({start:from, end:to} = wordAt(text, start));
    }
    const selectionText = text.slice(from, to);
    const short = selectionText.length <= 80 && !/[\r\n]/.test(selectionText) &&
      selectionText.trim().split(/\s+/).length <= 5;
    const word = short && selectionText.trim() ? selectionText.trim() : '';
    const canInsert = short && (start === end || Boolean(phrase));
    const context = {
      mode, action:mode, word, selectionText:short ? selectionText : '', hasSelection:from !== to,
      hasTarget:true, canInsert, bookId:book.id, chapterId:chapter.id,
      bookTitle:book.title, chapterTitle:chapter.title,
      projectTitle:book.title, sceneTitle:chapter.title,
      excerpt:mode === 'practice' ? sceneExcerpt(text, start, end) : ''
    };
    saved = {bookId:book.id, chapterId:chapter.id, text, start, end, from, to,
      direction:editor.selectionDirection, scroll:editor.scrollTop, horizontal:editor.scrollLeft, canInsert};
    chapter.cursor = start; chapter.scroll = editor.scrollTop;
    studio.save();
    return context;
  }

  function returnToDraft(word) {
    const inserting = typeof word === 'string';
    const stop = message => ({ok:false, message});
    if (!saved) return stop('Open a chapter and choose where the word should go.');
    const trip = saved;
    const book = studio.state.books.find(item => item.id === trip.bookId);
    const chapter = book?.chapters.find(item => item.id === trip.chapterId);
    if (!chapter) { saved = null; return stop('That chapter is no longer in the manuscript.'); }
    if (inserting && (!trip.canInsert || !word.trim() || /[\r\n]/.test(word) || word.trim().length > 160)) {
      return stop('Place the cursor or select a short phrase in the manuscript first.');
    }
    if (chapter.text !== trip.text) {
      if (studio.state.activeView === 'editor' && studio.state.activeBookId === book.id &&
          book.activeChapterId === chapter.id && findEditor()?.value === trip.text) {
        studio.render();
      }
      if (inserting) {
        saved = null;
        return stop('The draft has changed. Select the passage again to use this word.');
      }
    }
    if (studio.state.activeView !== 'editor' || studio.state.activeBookId !== book.id ||
        book.activeChapterId !== chapter.id || !findEditor()) {
      studio.state.activeBookId = book.id;
      book.activeChapterId = chapter.id;
      studio.go('editor');
    }
    const editor = findEditor();
    if (!editor) return stop('The manuscript editor could not open.');
    if (inserting && editor.value !== trip.text) {
      saved = null;
      return stop('The draft has changed. Select the passage again to use this word.');
    }
    editor.focus({preventScroll:true});
    if (inserting) {
      editor.setRangeText(word.trim(), trip.from, trip.to, 'end');
      editor.dispatchEvent(new Event('input', {bubbles:true}));
      chapter.cursor = editor.selectionStart;
      studio.save();
    } else if (editor.value === trip.text) {
      editor.setSelectionRange(trip.start, trip.end, trip.direction);
    }
    editor.scrollTop = trip.scroll;
    editor.scrollLeft = trip.horizontal;
    saved = null;
    return {ok:true, message:inserting ? 'Word added to the manuscript.' : ''};
  }

  function drawTools() {
    const paper = root.querySelector('.ms-paper');
    if (!paper || !findEditor() || root.querySelector('[data-word-tools]')) return;
    paper.insertAdjacentHTML('afterend',
      '<div data-word-tools role="group" aria-label="Vocabulary tools" class="ms-word-tools">'+
      '<button type="button" class="btn secondary" data-studio-word="lookup">Look up a word</button>'+
      '<button type="button" class="btn secondary" data-studio-word="practice">Practice scene words</button></div>');
  }
  const afterEditor = studio.after.editor;
  studio.after.editor = (...args) => { afterEditor?.(...args); drawTools(); };
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-studio-word]');
    if (!button || !root.contains(button)) return;
    const ctx = capture(button.dataset.studioWord);
    if (!ctx) return;
    if (ctx.mode === 'practice' && !ctx.excerpt) {
      studio.toast('Write a paragraph or select a passage to find words for this scene.');
      findEditor()?.focus();
      return;
    }
    hub.openVocabulary(ctx);
  });
  const bridge = {getContext:capture, returnToDraft:() => returnToDraft(), insertWord:word => returnToDraft(word)};
  hub.register('novel', bridge);
  drawTools();
  return bridge;
}

installNovelBridge(window.NS,document.body,parent.CombinedStudio);
document.querySelector('.skip-link')?.addEventListener('click',event=>{
          event.preventDefault();document.querySelector('#main')?.focus();
        });
