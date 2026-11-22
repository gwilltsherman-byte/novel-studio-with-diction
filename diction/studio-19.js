
function installDictionBridge(D, mount, hub) {
  let sceneKey = '';
  const link = {
    excerpt: '',
    active: () => Boolean(sceneKey),
    getDraft() {
      return sceneKey ? D.state.drafts.sceneWords?.[sceneKey] : null;
    },
    setDraft(draft) {
      if (!sceneKey) return;
      if (draft) {
        D.state.drafts.sceneWords ||= {};
        D.state.drafts.sceneWords[sceneKey] = draft;
      } else if (D.state.drafts.sceneWords) {
        delete D.state.drafts.sceneWords[sceneKey];
      }
    },
    offer(container, word) {
      if (!container || !word || !hub.canUseWord() || container.querySelector('[data-use-scene-word]')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary';
      button.setAttribute('data-use-scene-word', '');
      const target = hub.getContext?.();
      button.textContent = target?.hasSelection ? 'Replace selection in manuscript' : 'Insert at manuscript cursor';
      button.setAttribute('aria-label', target?.hasSelection
        ? 'Replace “' + target.selectionText + '” with “' + word + '” in manuscript'
        : 'Insert “' + word + '” at manuscript cursor');
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (hub.canUseWord()) hub.useWord(word);
      });
      container.appendChild(button);
    }
  };
  D.manuscriptLink = link;
  function closeLookup() {
    const dialog = mount.querySelector('#ql-dialog');
    if (dialog?.open || dialog?.hasAttribute('open')) dialog.querySelector('#ql-close')?.click();
  }
  hub.register('diction', {
    openContext(context) {
      if (!context) return;
      closeLookup();
      const practice = (context.action || context.mode) === 'practice';
      link.excerpt = practice ? String(context.excerpt || '').slice(0, 1200) : '';
      sceneKey = practice ? JSON.stringify([context.bookId || context.projectTitle || context.bookTitle || '',
        context.chapterId || context.sceneTitle || context.chapterTitle || '']) : '';
      if (practice) {
        D.go('guided', {from:'manuscript'});
      } else {
        const word = String(context.word || '').trim().slice(0, 180);
        D.go('dictionary', word ? {word, query:word} : {});
      }
    },
    onHidden:closeLookup,
    clear() {
      sceneKey = '';
      link.excerpt = '';
      for (const button of mount.querySelectorAll('[data-use-scene-word]')) button.remove();
      if (D.view === 'guided' && D.options?.from === 'manuscript') D.go('guided');
    }
  });
}

installDictionBridge(window.Diction,document.body,parent.CombinedStudio);
