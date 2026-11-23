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

  D.onReviewChange = reportReviews;
  hub.register('diction', {
    openContext(request) {
      const word = typeof request?.word === 'string' ? request.word.trim().slice(0, 180) : '';
      if (!word) return;
      closeLookup();
      D.go('dictionary', {word, query:word});
    },
    openReview() { closeLookup(); D.go('review'); },
    reviewStatus:D.reviewStatus,
    onVisible:reportReviews,
    onHidden:closeLookup
  });
  reportReviews();
})();
