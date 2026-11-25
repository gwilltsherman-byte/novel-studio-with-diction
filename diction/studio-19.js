(() => {
  'use strict';
  if (window.parent === window) return;
  let hub;
  try { hub = window.parent.CombinedStudio; } catch { return; }
  if (!hub?.register) return;
  const D = window.Diction;
  let pending = false;

  function reportReviews() {
    if (pending || !hub.updateDictionReview) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      hub.updateDictionReview(D.reviewStatus());
    });
  }
  function closeLookup() {
    const dialog = document.getElementById('ql-dialog');
    if (dialog?.open || dialog?.hasAttribute('open')) dialog.querySelector('#ql-close')?.click();
  }
  // Refresh a visible notebook list only. Other screens may contain unsaved editing fields.
  function refreshNotebook() {
    if (D.view !== 'notebook' || !D.root.querySelector('#lx-notes')) return;
    const term = D.root.querySelector('#lx-search')?.value;
    D.notebook();
    const search = D.root.querySelector('#lx-search');
    if (search && term) { search.value = term; search.dispatchEvent(new Event('input')); }
  }
  // Words selected from prose arrive inflected: "slides", "reached", "glinting".
  function baseForms(word) {
    const forms = [];
    const add = form => { if (form.length > 1 && form !== word && !forms.includes(form)) forms.push(form); };
    const stem = (ending, ...replacements) => {
      if (!word.endsWith(ending) || word.length <= ending.length + 1) return;
      const root = word.slice(0, -ending.length);
      for (const extra of replacements) add(root + extra);
      if (/([b-df-hj-np-tv-z])\1$/.test(root)) add(root.slice(0, -1));
    };
    stem('’s', ''); stem("'s", '');
    stem('ies', 'y'); stem('es', '', 'e'); stem('s', '');
    stem('ied', 'y'); stem('ed', '', 'e');
    stem('ing', '', 'e');
    stem('ier', 'y'); stem('iest', 'y'); stem('er', '', 'e'); stem('est', '', 'e');
    stem('ily', 'y'); stem('ly', '');
    return forms;
  }
  function define(request) {
    const query = String(request || '').trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').slice(0, 180);
    let found = D.lookupTerm(query);
    const exact = found;
    if (!found.senses.length && !/\s/.test(query)) {
      for (const form of baseForms(query.toLowerCase())) {
        const match = D.lookupTerm(form);
        if (match.senses.length) { found = {...match, from: query}; break; }
      }
    }
    if (!found.suggestions.length) found = {...found, suggestions: exact.suggestions};
    return {
      query, word: found.word, from: found.from || '', suggestions: found.suggestions.slice(0, 5),
      senses: found.senses.map(sense => ({
        definition: sense.definition, pos: sense.pos || '', source: sense.source || '',
        saved: Boolean(D.savedDictionarySense?.(found.word, sense))
      }))
    };
  }
  function saveSense(word, sense, personal = false) {
    if (typeof word !== 'string' || !word.trim() || typeof sense?.definition !== 'string' || !sense.definition.trim()) return false;
    const entry = personal ? {definition: sense.definition.trim().slice(0, 600), source: 'Writer’s own meaning', pos: ''}
      : {definition: sense.definition, pos: String(sense.pos || ''), source: String(sense.source || '')};
    D.saveDictionarySense(word.trim().slice(0, 180), entry, '', personal === true);
    refreshNotebook();
    D.refreshQuickLookup?.();
    return true;
  }

  D.onReviewChange = reportReviews;
  hub.register('diction', {
    openContext(request) {
      const word = typeof request?.word === 'string' ? request.word.trim().slice(0, 180) : '';
      if (!word) return;
      closeLookup();
      D.go('dictionary', {word, query:word});
    },
    openReview() { closeLookup(); D.go('review'); },
    define,
    saveSense,
    reviewStatus:D.reviewStatus,
    onVisible:reportReviews,
    onHidden:closeLookup
  });
  reportReviews();
})();
