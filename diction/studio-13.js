
(() => {
  'use strict';
  const D = window.Diction;
  const size = 5;
  const prefix = 'field/';
  const byId = new Map();
  const cards = new Map();
  let catalog;

  // Each list selects one teachable sense per headword. A suffix selects a
  // particular editorial glossary sense when a headword has several meanings.
  function focus(id, title, goal, words, challenge, followup) {
    return {id, title, goal, words:words.split('|'), challenge, followup};
  }
  const core = [
    focus('line-of-sight', 'At the edge of sight', 'Control what a witness can make out through distance, glass, or a half-open door.',
      'glimpse|peer|discern|occlude|silhouette|afterimage|aperture|glance|blur|glare|conspicuous|faint',
      'A passenger sees something through the opposite window of a moving train. Write the three seconds in which it is visible.',
      'Two people remember a coat in a dark hallway differently. Give each a sentence that shows what the light allowed them to see.'),
    focus('testimony', 'Whose account is this?', 'Choose the verb that shows how a speaker stands behind a report or raises a doubt.',
      'allege|recount|qualify|concede|maintain|dispute|cite|corroborate|acknowledge|attribute|assert|contradict',
      'Report a meeting where the chair and the caretaker give different accounts of who had the building key. Give both people a fair hearing.',
      'Write a correction to a museum label after a donor challenges the date. Distinguish the source of each claim.'),
    focus('route', 'A route through obstacles', 'Give a moving body a path, resistance, and a reason to change direction.',
      'thread|sidle|wade|shuffle|edge|jolt|crest|veer|drift|trudge|pivot|stagger',
      'A courier crosses a platform against the flow of passengers. Write the route so a reader could trace it on paper.',
      'Follow a dog carrying an unwieldy stick through a crowded garden. Change the rhythm of the sentence when its path narrows.'),
    focus('timing', 'The clock inside a scene', 'Change how much time the reader feels between one action and the next.',
      'meanwhile|lull|belated|intermittent|protract|resume|abate|beat|chronology|deadline|delay|false start',
      'Two apartment doors must open at nearly the same moment for the neighbors to meet. Make the timing clear without giving a clock time.',
      'A cook is listening for a telephone call while following a recipe. Let a small change in timing alter the meal.'),
    focus('surfaces-light', 'How a surface holds light', 'Distinguish shine, reflection, color, and changing light in a description.',
      'dapple|burnish|matte|glint|glisten|mottled|translucent|glimmer|gleam|glaze|beam|bleach',
      'Describe two buttons from the same uniform, one kept in a drawer and one worn for years. Let the light reveal which is which.',
      'A stagehand checks a prop under the house lights and again under a spotlight. Describe the difference from the last row.'),
    focus('power-dialogue', 'The turn a conversation takes', 'Give an answer a second job such as avoiding a question, testing trust, or yielding ground.',
      'demur|parry|blurt|hedge|insinuate|deflect|confide|admit|allude|concede|backchannel|aside',
      'A shopkeeper wants to know where a customer found an old receipt. Write four lines in which the customer keeps the conversation going without answering.',
      'At a rehearsal, the newest performer spots an error in the director’s instructions. Let the next four lines show who can safely speak.'),
    focus('conflict', 'Before a choice is made', 'Place a competing desire, hesitation, or private objection inside an outwardly simple decision.',
      'rue|begrudge|misgiving|compunction|yearn|affront|ambivalent|chafe:2|dither|intent|deliberate:2|wince',
      'Two cousins are asked which one should keep a family photograph. Write the moment before either answers.',
      'A candidate finds her rival’s lost speech in a stairwell. Give her a reason to return it and a reason to wait.'),
    focus('acoustics-room', 'A room heard from outside', 'Use duration, distance, and the surface making a sound to locate an unseen event.',
      'clank|thrum|clatter|peal|muffle|rasp|susurrus|drone|grate|chime|echo|hoarse',
      'Someone waits on a landing outside a closed workshop. Let the reader work out what has just stopped working from the sounds alone.',
      'A visitor arrives before an orchestra rehearsal begins. Use three sounds from behind the curtain to suggest how many people are there.'),
    focus('evidence', 'Room for doubt', 'Match the confidence of a sentence to the strength and limits of its evidence.',
      'tentative|plausible|provisional|apparent|infer|suggest|consistent with|contingent|inconclusive|equivocal|credible|caveat',
      'Write two labels for an unsigned portrait. One curator has only the frame; the other has found a dated receipt.',
      'Describe a light seen across a lake first in a field notebook, then in a letter to someone who wants it to be a signal.'),
    focus('cause', 'What follows from what?', 'Track the assumptions and conditions connecting an observation to an explanation.',
      'hypothesis|premise|anomaly|confound|necessary|sufficient|coincidence|counterexample|causal|counterfactual|consequence|assumption',
      'A garden flourished the year its keeper changed both the soil and the watering schedule. Write what a visitor can responsibly conclude.',
      'Three clocks in a station stop during the same hour. Write one possible explanation and the observation that would make you reconsider it.'),
    focus('structure', 'Where a story places its clues', 'Move a detail earlier or later and change the work a reader must do to understand it.',
      'backfill|foreshadow|motif|exposition|climax|arc|anecdote|juxtapose|compress|chronology|excerpt|frame',
      'Open a story with someone returning the wrong umbrella. Decide where to reveal that the mistake was intentional, then try the revelation one sentence earlier.',
      'Write the opening of a reunion and plant a small detail whose meaning changes in your final sentence.'),
    focus('tone', 'A voice on the page', 'Make a speaker’s history and relationship to the listener audible in the delivery of a line.',
      'dry|deadpan|barbed|curt|gruff|blunt|elliptical|explicit|register|voice|cadence|subtext',
      'Write the same dinner invitation from a host addressing an old friend and a host addressing a difficult neighbor. Keep the occasion and date identical.',
      'Two volunteers announce a delay to the same queue. Give each a distinct voice with the same information.'),
    focus('viewpoint', 'Who gets to tell the story?', 'Filter an event through a narrator’s position, attention, language, and blind spots.',
      'perspective|focalization|unreliable narrator|empathy|deception|characterization|connotation|nuance|detail|envisage|depict|evoke',
      'The town has removed a bench. Describe the empty space first through the person who ordered the work and then through the person who sat there every morning.',
      'Give two siblings a different memory of one object on a kitchen shelf. Let each recognize a feature the other overlooked.')
  ];

  function choose(n, k) {
    if (k > n) return 0;
    let result = 1;
    for (let i = 1; i <= k; i++) result = result * (n - i + 1) / i;
    return Math.round(result);
  }
  function gcd(a, b) {
    while (b) [a, b] = [b, a % b];
    return a;
  }
  // Indexed combinations make a random page as cheap to open as the first.
  function unrank(n, rank) {
    const result = [];
    for (let i = 0; result.length < size; i++) {
      const span = choose(n - i - 1, size - result.length - 1);
      if (rank < span) result.push(i);
      else rank -= span;
    }
    return result;
  }
  function rankOf(n, indices) {
    let rank = 0, start = 0;
    for (let i = 0; i < indices.length; i++) {
      for (let j = start; j < indices[i]; j++) rank += choose(n - j - 1, size - i - 1);
      start = indices[i] + 1;
    }
    return rank;
  }
  function entryFromSense(word, sense, sourceName, pos) {
    const id = D.coach.dictionaryId(word, sense);
    return {id, word, sense, sourceName, pos, prompt:sense};
  }
  function initialize() {
    if (catalog) return;
    const studied = new Map();
    for (const entry of [...(D.words || []), ...(D.packCatalog || []).flatMap(p => p.entries)]) {
      if (!studied.has(entry.word)) studied.set(entry.word, entry);
    }
    function lookup(spec) {
      if (typeof spec !== 'string') return entryFromSense(spec.word, spec.sense, 'Diction field glossary', spec.pos);
      const [word, occurrence] = spec.split(':');
      if (!occurrence && studied.has(word)) return studied.get(word);
      const meanings = (D.dictionaryData?.lookup(word) || []).filter(s => s.source === 'Diction editorial glossary');
      const meaning = meanings[Number(occurrence || 1) - 1];
      return meaning && entryFromSense(word, meaning.definition, meaning.source, meaning.pos);
    }
    const themes = D.journeyWordThemes || [];
    const sources = [];
    for (let i = 0; i < Math.max(themes.length, core.length); i++) {
      if (themes[i]) sources.push(themes[i]);
      if (core[i]) sources.push(core[i]);
    }
    const built = [];
    for (const source of sources) {
      const items = source.words.map(lookup).filter(Boolean);
      if (items.length < size) continue;
      const count = choose(items.length, size);
      // Cover the whole word pool in the first few packs. Afterward walk through
      // the remaining combinations exactly once in a dispersed order.
      const opening = [];
      for (let start = 0; start < items.length; start += size) {
        const indices = Array.from({length:size}, (_, i) => (start + i) % items.length).sort((a,b) => a-b);
        opening.push(rankOf(items.length, indices));
      }
      const remaining = count - opening.length;
      let stride = Math.ceil(remaining * 0.618) || 1;
      while (remaining > 0 && gcd(stride, remaining) !== 1) stride++;
      const track = {...source, items, count, opening, sortedOpening:[...opening].sort((a,b) => a-b), stride,
        wordIndex:new Map(items.map((item, i) => [item.word, i]))};
      byId.set(track.id, track);
      for (const item of items) {
        if (!cards.has(item.id)) cards.set(item.id, {...item,track:track.title});
      }
      built.push(track);
    }
    const tracks = built.map(t => ({id:t.id, title:t.title, description:t.goal, count:t.count, words:t.items.map(e => e.word)}));
    catalog = {built, tracks, total:built.reduce((sum,t) => sum + t.count, 0)};
  }
  function makePack(track, indices) {
    const entries = indices.map(i => track.items[i]);
    const names = entries.map(e => e.word);
    // The ID records actual words. Adding another word to a focus does not
    // change the membership of a previously enrolled pack or saved brief.
    const id = prefix + track.id + '/' + names.map(encodeURIComponent).join('~');
    const title = names[0][0].toUpperCase() + names[0].slice(1) + ', ' + names[1] + ' & ' + names[2];
    const description = 'With ' + names[3] + ' and ' + names[4] + '. ' + track.goal;
    return {id, title, description, goal:track.goal, generated:true, trackId:track.id, trackTitle:track.title,
      entries, challenge:track.challenge, followup:track.followup};
  }
  function localPack(track, index) {
    if (!track || index >= track.count) return null;
    let rank = track.opening[index];
    if (rank === undefined) {
      rank = ((index - track.opening.length) * track.stride) % (track.count - track.opening.length);
      for (const reserved of track.sortedOpening) if (reserved <= rank) rank++;
    }
    return makePack(track, unrank(track.items.length, rank));
  }
  function at(index, trackId) {
    initialize();
    if (!Number.isSafeInteger(index) || index < 0) return null;
    if (typeof trackId === 'string' && trackId.startsWith('edition-track/')) return D.editionPacks?.at(index, trackId) || null;
    if (trackId != null) return localPack(byId.get(trackId), index);
    if (index >= catalog.total) return D.editionPacks?.at(index - catalog.total) || null;
    // Interleave all tracks, dropping exhausted ones without building a catalog
    // containing tens of thousands of pack objects.
    let low = 0, high = Math.max(...catalog.tracks.map(t => t.count));
    const before = round => catalog.tracks.reduce((sum,t) => sum + Math.min(round, t.count), 0);
    while (low + 1 < high) {
      const mid = Math.floor((low + high) / 2);
      if (before(mid) <= index) low = mid;
      else high = mid;
    }
    const offset = index - before(low);
    return localPack(catalog.built.filter(t => t.count > low)[offset], low);
  }
  function get(id) {
    if (typeof id === 'string' && id.startsWith('edition/')) return D.editionPacks?.get(id) || null;
    if (typeof id !== 'string' || !id.startsWith(prefix) || id.length > 600) return null;
    initialize();
    const parts = id.split('/');
    const track = byId.get(parts[1]);
    if (parts.length !== 3 || !track) return null;
    let names;
    try { names = parts[2].split('~').map(decodeURIComponent); } catch { return null; }
    const indices = names.map(word => track.wordIndex.get(word));
    if (indices.length !== size || indices.some((i, pos) => i === undefined || (pos > 0 && i <= indices[pos-1]))) return null;
    const pack = makePack(track, indices);
    return pack.id === id ? pack : null;
  }
  function fromWords(trackId, words) {
    if (!Array.isArray(words) || words.length !== size || new Set(words).size !== size) return null;
    initialize();
    const track = byId.get(trackId);
    if (!track) return null;
    const indices = words.map(word => track.wordIndex.get(word));
    if (indices.some(i => i === undefined)) return null;
    return makePack(track, indices.sort((a,b) => a-b));
  }
  D.packGenerator = {
    tracks() { initialize(); return catalog.tracks.concat(D.editionPacks?.tracks() || []); },
    count() { initialize(); return catalog.total + (D.editionPacks?.count() || 0); },
    trackEntries(id) { initialize(); return byId.get(id)?.items.slice() || []; },
    at, get, fromWords,
    entry(id) { initialize(); return cards.get(id) || D.editionPacks?.entry(id) || null; }
  };
})();

