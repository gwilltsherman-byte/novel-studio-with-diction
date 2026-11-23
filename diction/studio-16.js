
(() => {
  'use strict';
  const D = window.Diction;
  const e = D.esc;
  let showing = 0;
  const roundSize = 3;
  const outcomes = {
    studied:'Added to reviews', known:'Marked familiar', skip:'Set aside',
    got:'Recalled unaided', partial:'Partial recall', missed:'Needs another try'
  };
  const currentRound = () => Array.isArray(D.state.quickRound?.events) ? D.state.quickRound : null;
  D.quickRoundInfo = () => {
    const round = currentRound();
    return round && !round.finished ? {done:round.events.length,total:roundSize} : null;
  };

  function mask(text, word) {
    if (!word || !text) return '';
    const literal = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp('(^|[^\\p{L}\\p{N}])' + literal + '(?=$|[^\\p{L}\\p{N}])', 'giu'), '$1_____');
  }

  function entry(card) {
    return '<p class="coach-sense">' + e(card.sense) + '</p>' +
      (card.example ? '<blockquote>' + e(card.example) + '</blockquote>' : '') +
      (card.contrast ? '<div class="coach-distinction"><h2>' +
        (card.neighbor ? e(card.word) + ' or ' + e(card.neighbor) + '?' : 'The distinction') +
        '</h2><p>' + e(card.contrast) + '</p></div>' : '');
  }

  function button(action, label, type = 'secondary') {
    return '<button type="button" class="' + type + '" data-coach="' + action + '">' + label + '</button>';
  }
  function sentenceField(draft, newWord) {
    return '<label class="field"><span class="field-label">Try it in a sentence <span class="coach-optional">(optional)</span></span>' +
      '<textarea data-field="sentence" rows="2" maxlength="1600" placeholder="Write a line you could use in your own work.">' +
      e(draft.sentence) + '</textarea></label>' +
      (newWord ? '<label class="coach-self-check"><input type="checkbox" data-field="checked"'+(draft.checkedSense?' checked':'')+'> I checked my sentence against this meaning.</label>' : '');
  }

  function pendingCard(prior) {
    if (!(prior?.attempt || prior?.sentence || prior?.revealed || prior?.hinted || prior?.passed)) return null;
    const card = D.coach.get(prior.id);
    return card?.kind === prior.kind ? card : null;
  }
  D.pendingGuided = () => pendingCard(D.state.drafts.guidedWord);

  function recap(round) {
    ++showing;
    const complete = round.events.length >= roundSize;
    D.root.innerHTML = '<section class="coach-page coach-round-summary"><p class="eyebrow">Three-word practice</p><h1>' +
      (complete ? 'Round complete' : 'You’re caught up') + '</h1>' +
      (!complete ? '<p>Your next word will appear when another sense or review is ready.</p>' : '') +
      '<ul class="coach-results">' + round.events.map(item => '<li><strong>' + e(item.word) + '</strong><span>' +
        e(outcomes[item.outcome]) + '</span></li>').join('') + '</ul><div class="actions"><a class="primary" href="#home">Back to word practice</a>' +
      (D.coach.next() ? '<a class="secondary" href="#guided?round=1">Start another round</a>' : '') + '</div></section>';
    D.root.focus?.({preventScroll:true});
  }

  D.guided = function (options = {}) {
    let round = currentRound();
    const quick = options.round === '1' || options.round === 'recap';
    if (quick && options.round === 'recap' && round?.finished) {recap(round);return;}
    if (quick && (!round || round.finished)) {
      round = D.state.quickRound = {events:[]}; D.save();
    }
    const prior = quick ? round.draft : D.state.drafts.guidedWord;
    const mode = quick ? 'quick' : options.return === 'journey' ? 'journey' : 'guided';
    const card = pendingCard(prior) || (mode === 'journey' && options.id && D.coach.get(options.id)) || D.coach.next();
    show(card, card && prior?.id === card.id && prior.kind === card.kind ? prior : null, mode);
  };

  function show(card, prior, mode, message = '', focus = false) {
    const version = ++showing;
    const root = D.root;
    const draft = {id:card?.id, kind:card?.kind, attempt:'', sentence:'', revealed:false, hinted:false, passed:false, ...prior};
    const review = card?.kind === 'review';
    const testing = review && !draft.revealed;
    const select = selector => root.querySelector(selector);
    const round = mode === 'quick' ? currentRound() : null;
    const journey = mode === 'journey';
    const saveDraft = () => {
      if (round) round.draft=draft; else D.state.drafts.guidedWord=draft;
      D.save();
    };
    const back = journey ? '<a href="#journey" class="back">Back to journey</a>' : '<a href="#home" class="back">'+(round?'Pause round':'Word practice')+'</a>';
    const surface = '<section class="coach-page">' + back +
      (round && card ? '<div class="coach-round-meter"><span>Word '+(round.events.length+1)+' of '+roundSize+'</span><progress aria-label="Words finished this round" max="'+roundSize+'" value="'+round.events.length+'"></progress></div>' : '') +
      '<p role="status" class="coach-status"' + (message ? '' : ' hidden') + '>' + e(message) + '</p>';
    if (!card) {
      if (round) {round.finished=true;delete round.draft;D.save();D.go('guided',{round:'recap'});return;}
      root.innerHTML = surface + '<header class="pagehead"><h1>You’re all caught up.</h1><p>Your next word will appear here when a review is due or you add an edition with new definitions.</p></header><a class="primary" href="#home">Back to word practice</a></section>';
      if (focus) root.focus?.({preventScroll:true});
      return;
    }
    let content;
    if (testing) {
      const cue = mask(card.prompt || card.sense, card.word);
      const hint = card.hint ? mask(card.hint, card.word) : 'The word begins with “' + Array.from(card.word)[0] + '”.';
      content = '<p class="eyebrow">Scheduled recall</p><h1>Which word fits?</h1><p class="coach-sense">' + e(cue) + '</p>' +
        '<form id="coach-recall"><label class="field"><span class="field-label">Your word or phrase</span>' +
        '<input data-field="attempt" maxlength="160" autocomplete="off" spellcheck="false" required value="' + e(draft.attempt) + '"></label>' +
        (draft.hinted ? '<p class="notice">' + e(hint) + '</p>' : '') + '<div class="actions"><button class="primary" type="submit">Compare my word</button>' +
        (draft.hinted ? '' : button('hint','Show a hint')) + button('pass','Can’t recall','back') + '</div></form>';
    } else {
      const matched = review && !draft.passed && D.coach.matches(draft.attempt,card.word);
      content = '<p class="eyebrow">' + (review ? 'Compare your recall' : 'Your next word') + '</p><h1>' + e(card.word) + '</h1>' +
        (review && draft.attempt && !draft.passed ? '<p class="coach-comparison">' + (matched
          ? (draft.hinted ? 'You found the target word with a hint.' : 'You recalled the target word.')
          : 'You wrote <strong>“' + e(draft.attempt) + '”</strong>. Compare its meaning with the study word.') + '</p>' : '') +
        entry(card) + sentenceField(draft,!review);
      if (review) {
        content += '<fieldset class="coach-rating"><legend>How well did you recall this word?</legend><div class="actions">' +
          (matched && !draft.hinted ? button('got','Recalled it','primary') : '') +
          (!draft.passed ? button('partial',draft.hinted ? 'With a hint' : 'Close') : '') +
          button('missed','Needs practice',draft.passed ? 'primary' : 'secondary') + '</div></fieldset>';
      } else {
        const label = journey ? 'Add to reviews &amp; finish step' : round?.events.length===roundSize-1 ? 'Add to reviews &amp; finish' : 'Add to reviews &amp; continue';
        content += '<div class="actions">' + button('studied',label,'primary') +
          button('known','I know this word') + button('skip','Set aside','back') + '</div>';
      }
    }
    root.innerHTML = surface + '<article class="coach-study">' + content + '</article>' +
      (!testing && card.reason ? '<aside class="coach-why"><h2>Why this word?</h2><p>' + e(card.reason) + '</p></aside>' : '') + '</section>';
    const field = name => select('[data-field="' + name + '"]');
    for (const name of ['attempt','sentence']) {
      const input = field(name);
      if (input) input.oninput = () => {
        if (version !== showing) return;
        draft[name] = input.value; saveDraft();
      };
    }
    if(field('checked')) field('checked').onchange=event=>{draft.checkedSense=event.target.checked;saveDraft();};
    function reveal(passed) {
      if (version !== showing) return;
      draft.attempt = field('attempt').value.trim();
      if (!passed && !draft.attempt) { field('attempt').value=''; field('attempt').reportValidity(); return; }
      draft.revealed = true; draft.passed = passed;
      saveDraft(); show(card,draft,mode,'',true);
    }
    if (testing) select('#coach-recall').onsubmit = event => { event.preventDefault(); reveal(false); };
    for (const control of root.querySelectorAll('[data-coach]')) {
      control.onclick = event => {
        if (version !== showing || event?.detail > 1) return;
        const action = control.dataset.coach;
        if (action === 'hint') {
          draft.hinted = true; saveDraft(); show(card,draft,mode); field('attempt').focus(); return;
        }
        if (action === 'pass') { reveal(true); return; }
        control.disabled = true;
        if (round) delete round.draft; else delete D.state.drafts.guidedWord;
        const accepted = D.coach.record(card.id, action, {
          sentence:field('sentence')?.value.trim() || '',
          assisted:!!(draft.hinted || draft.passed), attempt:draft.attempt, checkedSense:!!field('checked')?.checked
        });
        if (round && accepted) {
          round.events.push({word:card.word,outcome:action});
          if (round.events.length>=roundSize) {
            ++showing;round.finished=true;D.save();D.go('guided',{round:'recap'});return;
          }
        }
        D.save();
        if (journey) {
          D.go('journey');
          return;
        }
        const messages = {
          studied:'Added to your reviews', known:'Marked familiar', skip:'Set aside', got:'Recall saved',
          partial:'Partial recall saved', missed:'Queued for more practice'
        };
        const next = D.coach.next();
        const hiddenMatch = next?.kind === 'review' && next.word.toLowerCase() === card.word.toLowerCase();
        const status = accepted ? messages[action] + (hiddenMatch ? '.' : ' · ' + card.word) : 'Your recommendations have been refreshed.';
        show(next,null,mode,status,true);
      };
    }
    if (focus) root.focus?.({preventScroll:true});
  }
})();

