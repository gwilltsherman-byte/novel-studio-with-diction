
(() => {
  'use strict';
  const D = window.Diction, day = 86400000;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const folded = text => String(text || '').trim().toLowerCase();
  const signature = item => folded(item.word) + '\n' + folded(item.sense);
  const stamp = value => Date.parse(value) || 0;
  const blockedWords = new Set('after again also another around because before being could different doing first from gives have into just like little making more most much other over should some something than that their them then there these they this those through under very what when where which while with would write writer writing your'.split(' '));
  const tokens = text => (folded(text).match(/[a-z]{4,}/g) || []).filter(t => !blockedWords.has(t));
  const fromDictionary = id => String(id).startsWith('sense/');
  const rankHash = value => {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
    return h >>> 0;
  };
  const dictionaryId = (word, sense) => 'sense/' + encodeURIComponent(folded(word)) + '/' + rankHash(folded(sense)).toString(36);
  const spelling = text => folded(text).normalize('NFKC').replace(/[’‘]/g,"'").replace(/[-‐‑‒–—]/g,' ')
    .replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu,'').replace(/\s+/g,' ');
  const matches = (answer,word) => !!spelling(word) && spelling(answer)===spelling(word);
  const goalRetention = 0.82;
  const targetDays = Math.log2(1 / goalRetention);
  const direct = new Set('edge drift wade jolt shuffle cite recount suggest glimpse overhear clatter muffle blurt echo brace stagger pivot glint matte meanwhile resume yearn'.split(' '));
  const fine = new Set('qualify corroborate allege provisional contingent equivocal occlude susurrus demur insinuate translucent burnish protract confound necessary sufficient compunction'.split(' '));
  const band = word => direct.has(folded(word)) ? 1 : fine.has(folded(word)) ? 3 : 2;
  const defaultModel = () => ({steps:0, trail:[], later:{}, groups:{}, pace:0});
  const profile = () => D.state.coachModel || defaultModel();

  function cue(text, word) {
    const parts = folded(word).split(/\s+/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
    const exact = new RegExp('(^|[^a-z])' + parts.join('\\s+') + '(?=$|[^a-z])','gi');
    return String(text || '').replace(exact, (_, start) => start + '_____');
  }
  function card(entry, group, origin, packId='') {
    if (!entry?.id || !entry.word || !String(entry.sense || '').trim()) return null;
    return {...entry, group, origin, packId, example:entry.example || '',
      contrast:entry.contrast || '', neighbor:entry.neighbor || '',
      prompt:cue(entry.prompt || entry.sense, entry.word),
      hint:cue(entry.hint || ('The word starts with “' + Array.from(entry.word)[0] + '”.'), entry.word)};
  }
  function dictionaryCards(word) {
    return (D.dictionaryData?.lookup(word) || []).filter(s => s?.definition).map(s => {
      const group = s.source === 'Diction editorial glossary' ? 'Writer’s glossary' : 'Dictionary';
      return card({id:dictionaryId(word,s.definition),word,sense:s.definition,sourceName:s.source || '',pos:s.pos},group,'dictionary');
    });
  }
  function personalCards() {
    const cards = new Map();
    function put(item) {if (item && !cards.has(item.id)) cards.set(item.id,item);}
    for (const w of D.words || []) put(card(w,w.track,'study'));
    for (const p of [...(D.packCatalog || []), ...(D.state.packs?.custom || [])]) {
      for (const w of p.entries || []) if (typeof w === 'object') put(card(w,p.title,'pack',p.id));
    }
    // Only expand recently shelved packs. Every scheduled sense remains available by ID.
    const shelf = D.state.packs?.enrolled || {};
    for (const id of Object.keys(shelf).filter(id => shelf[id]).slice(-12).reverse()) {
      const pack = D.packGenerator?.get(id);
      if (!pack) continue;
      for (const word of pack.entries) {
        const original = cards.get(word.id);
        if (original) original.onShelf = true;
        else put(card(word, pack.title, 'pack', pack.id));
      }
    }
    for (const n of D.state.notes || []) {
      if (n.wordId && cards.has(n.wordId)) continue;
      put(card({id:n.id,word:n.word,sense:n.sense,example:n.source,sourceName:n.sourceName},'Notebook','notebook'));
    }
    return cards;
  }
  function dictionaryById(id) {
    const saved = D.state.reviews[id]?.coachSense;
    if (saved) return card({id,word:saved.word,sense:saved.sense,sourceName:saved.sourceName},saved.group || 'Dictionary','dictionary');
    if (!fromDictionary(id)) return null;
    let word;
    try {word = decodeURIComponent(id.split('/')[1]);} catch {return null;}
    const dictionary = dictionaryCards(word).find(item => item.id === id);
    if (dictionary) return dictionary;
    const packed = D.packGenerator?.entry(id);
    return packed ? card(packed, packed.track || packed.sourceName || 'Vocabulary packs', 'pack') : null;
  }
  function attach(item) {
    if (!item) return null;
    const review = D.state.reviews[item.id];
    return {...item,track:item.group,kind:review ? 'review' : 'new',reason:review
      ? review.lastGrade === 'missed' ? 'This sense was hard to recall last time. Try retrieving it again.'
      : review.lastGrade === 'partial' ? 'You partly recalled this sense last time. It is ready for another try.'
      : review.coachKnown ? 'You marked this word familiar. Try a recall check after the break.'
      : review.coachAt || review.lastReviewed ? 'Your spaced review is due. Try recalling the word from its meaning.'
      : 'You saved this sense to practice. Try retrieving it from its meaning.'
      : 'A new sense to try in your writing.'};
  }
  function recentWriting() {
    const practice = D.state.drafts?.practice, sessions = (D.state.sessions || []).slice(-3).reverse();
    const texts = [practice?.original,practice?.revision,practice?.intent,D.manuscriptLink?.excerpt];
    for (const s of sessions) texts.push(s.revision,s.original,s.intent);
    for (const j of (D.state.packs?.journal || []).slice(-2)) texts.push(j.passage,j.followupPassage);
    for (const sample of (D.state.coachWriting || []).slice(-3)) texts.push(sample.sentence);
    return {terms:new Set(tokens(texts.filter(Boolean).map(t=>String(t).slice(-1200)).join(' '))),
      tracks:[practice?.track,...sessions.map(s=>s.track)].filter(Boolean)};
  }
  function next() {
    const now = Date.now(), model = profile(), cards = personalCards();
    const reviews = D.state.reviews, seen = new Set(), snoozed = new Set(), due = [];
    const lastWord = now-model.lastAt < 5*60000 ? model.lastWord : '';
    for (const [id,until] of Object.entries(model.later)) {
      if (until<=now) continue;
      const item=cards.get(id) || dictionaryById(id);
      if (item) snoozed.add(signature(item));
    }
    for (const [id,r] of Object.entries(reviews)) {
      const item = cards.get(id) || dictionaryById(id);
      if (!item) continue;
      seen.add(signature(item));
      if (stamp(r.due) > now || snoozed.has(signature(item))) continue;
      const overdue = Math.max(0,(now-stamp(r.due))/day);
      const last = stamp(r.lastReviewed) || r.coachAt;
      const age = last ? Math.max(0,(now-last)/day) : 0;
      const risk = last ? 1-Math.pow(0.5,age/halfLife(r)) : 0.25;
      due.push({item,score:risk + 0.15*Math.log1p(Math.min(365,overdue))});
    }
    due.sort((a,b)=>b.score-a.score || String(a.item.id).localeCompare(String(b.item.id)));
    const nextDue=due.find(row=>folded(row.item.word)!==lastWord);
    if (nextDue) return attach(nextDue.item);
    const writing = recentWriting(), trail = model.trail.slice(-4);
    const allReviewed = Object.keys(reviews).length;
    const explore = (model.steps || 0)%7 === 5;
    const feedback = Array.from(model.challengeHistory || '');
    const familiar = feedback.filter(e=>e==='k').length;
    const adjusted = feedback.reduce((target,e)=>target+({k:0.34,r:0.16,m:-0.42,p:-0.15}[e] || 0),2);
    const target = clamp(adjusted,1,3);
    const requestedBand = explore ? (target>=2 ? target-0.7 : target+0.7) : target;
    const weakness = new Map();
    for (const h of (D.state.reviewHistory || []).slice(-80)) {
      const w = cards.get(h.id);
      if (!w || h.fromStudy) continue;
      const stat = weakness.get(w.group) || [0,0];
      stat[0] += h.grade === 'missed' ? 1 : h.grade === 'partial' || h.assisted ? 0.55 : 0;
      stat[1]++; weakness.set(w.group,stat);
    }
    let best = null, bestScore = -Infinity, bestWithoutLevel = null, baseScore = -Infinity;
    const considered = new Set();
    function consider(item) {
      if (!item || Object.hasOwn(reviews,item.id) || model.later[item.id] > now) return;
      const key = signature(item);
      if (seen.has(key) || snoozed.has(key) || considered.has(key)) return;
      considered.add(key);
      const study = item.origin === 'study' || item.origin === 'pack';
      const context = new Set(tokens([item.sense,item.contrast,item.example,item.group].join(' ')));
      const hits = [...context].filter(t=>writing.terms.has(t));
      const enrolled = item.onShelf || !!D.state.packs?.enrolled?.[item.packId];
      const track = writing.tracks.includes(item.group);
      const history = weakness.get(item.group);
      const weaknessScore = history ? (history[0]+1)/(history[1]+4) - 0.25 : 0;
      const pref = model.groups['g/'+item.group]?.interest || 0;
      let score = (study ? 2.2 : 0.25) + (track ? 2.4 : 0) + (enrolled ? 1.7 : 0)
        + Math.min(3,hits.length)*0.75 + weaknessScore*3 + pref + (item.origin==='notebook' ? 2.7 : 0);
      score -= trail.filter(t=>t===item.group).length * (explore ? 2.5 : 0.95);
      if (trail.at(-1)===item.group) score -= 0.6;
      if (folded(item.word)===lastWord) score -= 30;
      if (explore && !study) score += 2.8;
      if (!model.steps && !allReviewed && item.id==='thread') score += 0.5;
      score += rankHash(item.id+'|'+(model.steps || 0))/4294967296 * 0.22;
      if (score>baseScore) {baseScore=score;bestWithoutLevel=item.id;}
      const editorial = item.origin==='study' || (item.origin==='pack' && D.packCatalog.some(p=>p.id===item.packId));
      if (editorial) score -= 0.85*Math.abs(band(item.word)-requestedBand);
      if (score <= bestScore) return;
      bestScore = score;
      let reason = item.neighbor ? 'A word with a close alternative to try in a sentence.' : 'A new sense to try in your writing.';
      if (item.origin==='notebook') reason='A sense from your notebook, ready to put to work.';
      else if (hits.length>=2) reason='Its meaning overlaps with details in your recent writing.';
      else if (track) reason='This word fits the craft track you have been practicing.';
      else if (enrolled) reason='This word comes from a pack on your shelf.';
      else if (weaknessScore>0.12) reason='Recent recalls suggest more practice with this kind of word could help.';
      else if (explore) reason='A change of focus from the senses you have been practicing.';
      best={...attach(item),reason};
    }
    for (const item of cards.values()) consider(item);
    const heads = D.dictionaryData?.definedHeadwords || [], size = heads.length;
    const start = size ? ((model.steps || 0)*61)%size : 0;
    for (let i=0; i<size && (i<96 || !best); i++) {
      for (const item of dictionaryCards(heads[(start+i)%size])) consider(item);
    }
    if (best && !explore && familiar>=2 && requestedBand>2.5 && bestWithoutLevel!==best.id &&
        (best.origin==='study' || (best.origin==='pack' && D.packCatalog.some(p=>p.id===best.packId))) && band(best.word)===3) {
      best.reason='You marked several recent words familiar, so this is a finer distinction.';
    }
    return best || (due[0] ? attach(due[0].item) : null);
  }
  function halfLife(r) {
    const at = stamp(r.lastReviewed);
    if (r.coachHalfLife && (!at || at <= (r.coachAt || 0))) return r.coachHalfLife;
    const interval = Math.max(1,(stamp(r.due)-at)/day);
    return at ? interval/targetDays : 1/targetDays;
  }
  function record(id, outcome, options={}) {
    if (!['studied','known','skip','got','partial','missed'].includes(outcome)) return false;
    const item = personalCards().get(id) || dictionaryById(id);
    if (!item) return false;
    const model = D.state.coachModel ||= defaultModel();
    const now=Date.now(), previous=D.state.reviews[id];
    if (model.later[id]>now || stamp(previous?.due)>now) return false;
    if (outcome==='studied' && previous) return false;
    if (!previous && ['got','partial','missed'].includes(outcome)) return false;
    for (const [key,until] of Object.entries(model.later)) if (until<=now) delete model.later[key];
    const group = model.groups['g/'+item.group] ||= {pace:0,interest:0};
    model.steps++;
    model.lastWord=folded(item.word);model.lastAt=now;
    model.trail.push(item.group);model.trail=model.trail.slice(-5);
    const sentence = String(options.sentence || '').trim();
    if (sentence) {
      D.state.coachWriting ||= [];
      D.state.coachWriting.push({id,word:item.word,sentence,date:new Date(now).toISOString()});
    }
    if (outcome==='skip') {
      model.challengeHistory=((model.challengeHistory || '')+'.').slice(-10);
      group.interest=clamp(group.interest*0.9-0.6,-2,1);
      model.later[id]=now+7*day;
      if (previous) previous.due=new Date(model.later[id]).toISOString();
      D.save();return true;
    }
    let hours, h;
    const assisted=!!options.assisted;
    const exactMatch=matches(options.attempt,item.word);
    if (outcome==='got' && (assisted || !exactMatch)) outcome='partial';
    const signal={studied:'.',known:'k',partial:'p',missed:'m',got:'r'}[outcome];
    model.challengeHistory=((model.challengeHistory || '')+signal).slice(-10);
    if (outcome==='studied' || outcome==='known') {
      hours = outcome==='known' ? 30*24 : 24*Math.exp(clamp(model.pace+group.pace,-0.9,0.65));
      h = hours/24/targetDays;
      if (outcome==='studied') group.interest=clamp(group.interest*0.94+0.08,-2,1);
    } else {
      h=halfLife(previous);
      const last=Math.max(stamp(previous.lastReviewed),previous.coachAt || 0);
      const elapsed=last ? Math.max(0,(now-last)/day) : 0;
      const predicted=Math.pow(0.5,elapsed/h);
      const observed=outcome==='got' ? 1 : outcome==='partial' ? 0.35 : 0;
      // Learn a shared pace only from unassisted delayed tests, never from first looks or familiarity.
      if (!assisted && elapsed>=0.5 && !previous.coachKnown) {
        const error=observed-predicted;
        model.pace=clamp(0.97*model.pace+0.18*error,-0.65,0.45);
        group.pace=clamp(0.94*group.pace+0.23*error,-0.6,0.45);
      }
      if (outcome==='got') {
        h=clamp(h*(1.35+1.8*(1-predicted))*Math.exp(0.2*(model.pace+group.pace)),1.4,730);
        hours=clamp(h*targetDays*24,12,365*24);
      } else {
        h=clamp(h*(outcome==='partial'?0.65:0.4),0.8,45);
        hours=outcome==='partial' ? clamp(h*targetDays*24,6,18) : 1/6;
      }
      D.recordRecall({id,word:item.word,grade:{got:'recalled',partial:'partial',missed:'missed'}[outcome],
        answer:String(options.attempt || '').slice(0,300),assisted,fromStudy:false});
    }
    const review=D.state.reviews[id] ||= {level:0};
    review.due=new Date(now+hours*3600000).toISOString();
    review.coachHalfLife=h; review.coachAt=now; review.coachKnown=outcome==='known';
    if (fromDictionary(id) && !review.coachSense) review.coachSense={word:item.word,sense:item.sense,group:item.group,sourceName:item.sourceName};
    const lastEvent=D.state.reviewHistory?.at(-1);
    if (['got','partial','missed'].includes(outcome) && lastEvent?.id===id) {
      lastEvent.due=review.due;lastEvent.exactMatch=exactMatch;
    }
    D.save();return true;
  }
  function get(id) {
    if (profile().later[id]>Date.now() || stamp(D.state.reviews[id]?.due)>Date.now()) return null;
    return attach(personalCards().get(id) || dictionaryById(id));
  }
  D.coach={next,record,get,matches,dictionaryId,reviewItem:id=>attach(dictionaryById(id))};
})();

