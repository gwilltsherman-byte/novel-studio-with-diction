
(() => {
  'use strict';
  const D = window.Diction, esc = D.esc;
  const chapterSize = 8;
  const fold = value => String(value || '').toLowerCase();
  const stopwords = new Set('about after again around before being chance choose craft could describe detail different exactly first focus from have into make next other scene sense short some something than their them there these they this those through time using what when where which while with word words would write writer writing your'.split(' '));
  const tokens = text => new Set((fold(text).match(/[a-z]{3,}/g) || []).filter(t => !stopwords.has(t)));
  const url = (view, opts = {}) => '#' + view + (Object.keys(opts).length ? '?' + new URLSearchParams(opts) : '');
  const prefs = () => D.state.journey || {};
  const history = () => D.state.reviewHistory || [];
  const progress = () => new Set([
    ...history().map(event => event.id),
    ...Object.keys(D.state.reviews).filter(id => D.state.reviews[id]?.lastReviewed)
  ].filter(Boolean)).size;

  function writingTerms() {
    const texts = [];
    for (const s of (D.state.packs?.journal || []).slice(-3)) texts.push(s.passage, s.followupPassage);
    for (const s of (D.state.coachWriting || []).slice(-4)) texts.push(s.sentence);
    for (const s of (D.state.packs?.usage || []).slice(-4)) texts.push(s.response);
    return tokens(texts.filter(Boolean).map(t => String(t).slice(-1200)).join(' '));
  }

  function packSuggestions(tracks) {
    const memory = prefs();
    const shelf = D.state.packs || {};
    const focused = tracks.find(track => track.id === memory.focus);
    const enrolled = new Set(Object.keys(shelf.enrolled || {}).filter(id => shelf.enrolled[id]));
    const recentIds = [...new Set((shelf.newLog || []).slice(-36).reverse().map(event => event.pack))];
    const recentTracks = recentIds.map(id => D.packById(id)?.trackId).filter(Boolean);
    const latestGrades = new Map();
    for (const event of history().slice(-40)) {
      if (!event.fromStudy) latestGrades.set(fold(event.word), event.grade);
    }
    const difficult = new Set([...latestGrades].filter(([,grade]) => grade === 'missed' || grade === 'partial').map(([word]) => word));
    const writing = writingTerms();
    const practiced = new Set(history().map(event => fold(event.word)));
    const visits = recentIds.length + (shelf.journal || []).length;
    const offset = Math.max(0, Number(memory.offset) || 0);
    const candidates = [];
    const visibleTracks = focused ? [focused] : tracks;
    for (const [index, track] of visibleTracks.entries()) {
      if (!track.count) continue;
      const familyWords = new Set((track.words || []).map(fold));
      const relevant = [...tokens([track.title,track.description,...familyWords].join(' '))].filter(t => writing.has(t));
      const recallWord = [...difficult].find(word => familyWords.has(word));
      const variety = recentTracks.slice(0, 3).includes(track.id) ? -4 : 0;
      const rotation = ((index - (visits + offset) % visibleTracks.length) + visibleTracks.length) % visibleTracks.length;
      const familyScore = Math.min(3, relevant.length) * 2 + (recallWord ? 3 : 0) + variety - rotation / visibleTracks.length;
      let best = null;
      // Build a set from the eligible senses themselves, then compare a small
      // spread from the catalog without enumerating every five-word combination.
      const start = (visits + offset) % track.count;
      const pool = D.packGenerator.trackEntries(track.id);
      const packs = [];
      if (pool.length >= 5) {
        const shift = (visits + offset) * 5 % pool.length;
        const ranked = [...pool.slice(shift),...pool.slice(0,shift)].map(w => {
          const review = D.state.reviews[w.id];
          const availability = !review ? 3 : Date.parse(review.due) <= Date.now() ? 4 : 0;
          return {word:w.word, score:availability + (practiced.has(fold(w.word)) ? 0 : .5) + (writing.has(fold(w.word)) ? .3 : 0)};
        }).sort((a,b) => b.score-a.score);
        packs.push(D.packGenerator.fromWords(track.id,ranked.slice(0,5).map(w=>w.word)));
      }
      for (let j = 0; j < Math.min(5, track.count); j++) {
        packs.push(D.packGenerator.at((start + j) % track.count, track.id));
      }
      for (const pack of packs) {
        if (!pack || pack.id === memory.passedId) continue;
        const onShelf = enrolled.has(pack.id);
        const queue = onShelf ? D.packPlan(pack) : null;
        const ready = queue ? queue.today.length : pack.entries.some(w => {
          const review = D.state.reviews[w.id];
          return !review || (!review.lastReviewed && !(review.level > 0) && !review.coachAt) || Date.parse(review.due) <= Date.now();
        });
        if (!ready) continue;
        const unseen = pack.entries.filter(w => !practiced.has(fold(w.word)) && !D.state.reviews[w.id]?.coachAt).length;
        const shelfBonus = queue?.fresh.length ? 1 : 0;
        const score = familyScore + unseen / Math.max(1, pack.entries.length) * 3 + shelfBonus;
        if (best && best.score >= score) continue;
        const reason = focused ? 'You chose ' + track.title + ' as your focus.'
          : relevant.length ? '“' + relevant[0] + '” appears in your vocabulary exercises and in this family of words.'
          : recallWord ? 'A recent recall of “' + recallWord + '” was difficult. This pack practices related language.'
          : shelfBonus ? 'This pack is on your shelf and has more words ready to study.'
          : recentTracks.length && !recentTracks.slice(0, 3).includes(track.id) ? 'A different focus from your recent packs gives this chapter a change of subject.'
          : 'These words share a writing purpose. Start with a short study, then try them in a passage.';
        best = {pack, score, reason};
      }
      if (best) candidates.push(best);
    }
    return candidates.sort((a,b) => b.score - a.score);
  }

  function packStop(choice) {
    if (!choice) return null;
    const p = choice.pack;
    return {kind:'Pack study', title:p.trackTitle || p.title, body:p.goal || p.description, why:choice.reason,
      action:'Start pack practice', href:url('packs',{id:p.id,start:'1'}), icon:'layers', packId:p.id,
      words:p.entries.map(w => w.word).slice(0,5)};
  }

  function guidedStop(card, resumed) {
    const review = card.kind === 'review';
    return {kind:resumed ? 'Unfinished word practice' : review ? 'Recall' : 'Guided word', title:review ? 'Recall a word from its meaning' : card.word,
      body:review ? 'Try the clue from memory. Your response helps set the next review.' : card.sense,
      why:resumed ? 'You have a word practice in progress.' : card.reason, icon:'book',
      action:resumed ? 'Resume word practice' : review ? 'Try the recall' : 'Practice this word',
      href:url('guided',{id:card.id,return:'journey'}), reviewWord:review ? card.word : ''};
  }

  function writingStop(pack, followup) {
    return {kind:followup ? 'Follow-up brief' : 'Writing brief', title:followup ? 'Revisit '+pack.title : 'Write with '+pack.title,
      body:followup ? followup.followupPrompt : 'Put a word from this pack into a passage of your own.',
      why:followup ? 'A week has passed since your first passage. Try these words in a different scene.' : 'You have practiced words from this pack. A writing brief lets you choose which ones belong in a scene.',
      action:followup ? 'Open follow-up brief' : 'Open writing brief', icon:'pen',
      href:url('packs',followup ? {id:pack.id,followup:followup.id} : {id:pack.id,challenge:'1'}), packId:pack.id};
  }

  function nextScheduled() {
    const pending = D.pendingGuided();
    if (pending) return guidedStop(pending, true);
    const shelf = D.state.packs || {};
    for (const id of Object.keys(shelf.active || {}).reverse()) {
      const pack = D.packById(id);
      if (pack && shelf.active[id]) return {kind:'Unfinished pack',title:pack.title,body:pack.goal || pack.description,
        why:'Your place in this pack is saved.',action:'Resume pack practice',icon:'layers',packId:id,href:url('packs',{id,study:'1'})};
    }
    if (Object.values(D.state.reviews).some(row => Date.parse(row?.due) <= Date.now())) {
      const card = D.coach.next();
      if (card?.kind === 'review') return guidedStop(card, false);
    }
    const followup = D.packDueChallenges().find(j => D.packById(j.packId));
    if (followup) return writingStop(D.packById(followup.packId), followup);
    const use = shelf.usage?.at(-1);
    if (use && !shelf.journal?.some(j => j.packId === use.packId && Date.parse(j.date)>=Date.parse(use.date))) {
      const pack = D.packById(use.packId);
      if (pack && prefs().passedBrief !== use.date) return {...writingStop(pack),canDefer:true};
    }
    return null;
  }

  function lastStop(upcoming) {
    const recall = history().at(-1), journal = D.state.packs?.journal || [];
    const lastBrief = journal.reduce((last, current) => !last || Date.parse(current.completed || current.date) > Date.parse(last.completed || last.date) ? current : last, null);
    const sentence = D.state.coachWriting?.at(-1);
    const previous = [
      recall && {date:recall.date, text:fold(recall.word) === fold(upcoming?.reviewWord) ? 'Practiced a word from memory' : 'Practiced “'+recall.word+'”'},
      lastBrief && {date:lastBrief.completed || lastBrief.date,text:(lastBrief.completed ? 'Wrote a follow-up for ' : 'Wrote a passage for ')+lastBrief.title},
      sentence && {date:sentence.date,text:fold(sentence.word) === fold(upcoming?.reviewWord) ? 'Saved a practice sentence' : 'Wrote a sentence with “'+sentence.word+'”'}
    ].filter(Boolean).sort((a,b) => Date.parse(b.date)-Date.parse(a.date))[0];
    return previous?.text || '';
  }

  function stopCard(stop) {
    return '<article class="journey-stop"><div class="journey-kind">'+D.icon(stop.icon,20)+'<span>'+esc(stop.kind)+'</span></div>'+
      '<h2>'+esc(stop.title)+'</h2><p>'+esc(stop.body)+'</p>'+
      (stop.words?.length ? '<ul class="journey-words" aria-label="Words in this pack">'+stop.words.map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul>' : '')+
      '<div class="journey-actions"><a class="primary" href="'+esc(stop.href)+'">'+esc(stop.action)+'</a>'+
      (stop.canDefer ? '<button type="button" class="back" id="journey-brief-later">Later</button>' : '')+'</div></article>';
  }

  D.journey = () => {
    const tracks = D.packGenerator.tracks();
    const choices = packSuggestions(tracks);
    const scheduled = nextScheduled();
    const suggested = packStop(choices[0]);
    const fallback = !scheduled && !suggested ? D.coach.next() : null;
    let current = scheduled || suggested || (fallback && guidedStop(fallback, false));
    if (!current) {
      const focus = tracks.find(t => t.id === prefs().focus);
      const writingCount = D.state.packs?.journal?.length || 0;
      const count = focus?.count || D.packGenerator.count();
      const pack = count ? D.packGenerator.at(writingCount % count,focus?.id) : D.packCatalog[0];
      current = {...writingStop(pack),why:'The study queue is clear. Try familiar words in a different setting.'};
    }
    const branch = scheduled && suggested?.packId !== current.packId ? suggested : packStop(choices.find(c => c.pack.id !== current.packId));
    const practiced = progress(), done = practiced % chapterSize, chapter = Math.floor(practiced / chapterSize) + 1;
    const last = lastStop(current);
    const focus = tracks.some(t => t.id === prefs().focus) ? prefs().focus : '';
    const canChange = suggested && (focus ? tracks.find(t => t.id === focus).count > 1 : D.packGenerator.count() > 1);
    D.root.innerHTML = '<section class="journey-view"><header class="journey-head"><div><span class="eyebrow">Chapter '+chapter.toLocaleString()+'</span><h1>Your vocabulary journey</h1></div>'+
      '<div class="journey-progress"><label for="journey-level">'+done+' of '+chapterSize+' senses tested this chapter</label><progress id="journey-level" max="'+chapterSize+'" value="'+done+'"></progress></div></header>'+
      '<div class="journey-layout"><ol class="journey-path" aria-label="Practice path">'+
      (last ? '<li class="journey-step journey-past"><span class="eyebrow">Last stop</span><p>'+esc(last)+'</p></li>' : '')+
      '<li class="journey-step journey-now"><span class="eyebrow">Your next stop</span>'+stopCard(current)+'</li>'+
      (branch ? '<li class="journey-step journey-branch"><span class="eyebrow">Another path</span><a href="'+esc(branch.href)+'">'+esc(branch.title)+'</a><p>'+esc(branch.words.join(' · '))+'</p></li>' : '')+'</ol>'+
      '<aside class="journey-tools"><section><h2>Why this stop?</h2><p>'+esc(current.why)+'</p></section>'+
      '<section><h2>Steer your journey</h2><label for="journey-focus">Pack focus</label><select id="journey-focus"><option value="">Adapt to my practice</option>'+
      tracks.map(t => '<option value="'+esc(t.id)+'"'+(focus===t.id?' selected':'')+'>'+esc(t.title)+'</option>').join('')+'</select>'+
      (canChange ? '<button type="button" class="secondary" id="journey-another">'+(scheduled ? 'Change suggested pack' : 'Try a different pack')+'</button>' : '')+
      '<a href="#packs">Browse every pack</a></section></aside></div></section>';
    const update = values => { D.state.journey = {...prefs(), ...values}; D.save(); D.journey(); };
    D.root.querySelector('#journey-focus').onchange = event => {
      update({focus:event.target.value,offset:0,passedId:''});
      D.root.querySelector('#journey-focus').focus();
    };
    const another = D.root.querySelector('#journey-another');
    if (another) another.onclick = () => {
      update({offset:(Number(prefs().offset) || 0)+1, passedId:(scheduled ? branch : suggested)?.packId || ''});
      D.root.querySelector('#journey-another')?.focus();
    };
    const later = D.root.querySelector('#journey-brief-later');
    if (later) later.onclick = () => {
      update({passedBrief:D.state.packs?.usage?.at(-1)?.date || ''});
      D.root.querySelector('.journey-stop .primary')?.focus();
    };
  };
})();

