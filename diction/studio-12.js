
(() => {
  'use strict';
  const D = window.Diction, size = 5;
  const indexed = new WeakMap();
  const kinds = {
    noun: ['Nouns', 'Choose a noun that tells the reader exactly what to picture.',
      'Describe a room just after someone has left. Let one carefully chosen noun reveal what happened.',
      'A visitor returns years later. Let one object show how the room has changed.'],
    verb: ['Verbs', 'Use a verb to show how an action unfolds.',
      'Two people carry the same object across a room. Change the verb to suggest a different intention.',
      'A person sets something down before speaking. Let the action suggest what the speaker wants.'],
    adjective: ['Adjectives', 'Choose a quality a viewpoint character would notice.',
      'Describe an ordinary object from the perspective of someone who urgently needs it. Choose a precise adjective.',
      'Describe that kind of object through the eyes of someone seeing it for the first time.'],
    adverb: ['Adverbs', 'Change how a reader understands the manner or timing of an action.',
      'Write two lines in which the manner of answering matters as much as the answer. Try one adverb, then read the lines without it.',
      'Describe someone crossing a threshold. Choose a word that changes the reader’s sense of timing or intention.'],
    mixed: ['Word studies', 'Choose a sense from this edition and test it in a passage of your own.',
      'Write four lines about a choice someone makes. Use one of these words where its precise meaning helps the reader.',
      'Move the choice to a different setting and write it again. Which word earns its place this time?']
  };

  function editions() { return Array.from(D.installedDictionaryEditions?.() || []); }
  function group(sense) {
    const pos = sense.pos.toLowerCase().trim().replace(/\.$/, '');
    if (/^(n|noun)$/.test(pos)) return 'noun';
    if (/^(v|vb|verb|transitive verb|intransitive verb)$/.test(pos)) return 'verb';
    if (/^(a|adj|adjective)$/.test(pos)) return 'adjective';
    if (/^(adv|adverb)$/.test(pos)) return 'adverb';
    return 'mixed';
  }
  function tracksFor(edition) {
    if (indexed.has(edition)) return indexed.get(edition);
    const groups = {noun:[], verb:[], adjective:[], adverb:[], mixed:[]};
    for (const head of edition.map.values()) {
      const sense = head.senses[0];
      if (sense) groups[group(sense)].push(head);
    }
    for (const kind of Object.keys(groups)) {
      if (kind !== 'mixed' && groups[kind].length < size) {
        groups.mixed.push(...groups[kind]);
        groups[kind] = [];
      }
    }
    // Include the last few unclassified words in one additional mixed set.
    if (groups.mixed.length && groups.mixed.length < size && edition.map.size >= size) {
      const need = size - groups.mixed.length;
      const extras = Object.values(groups).find(pool => pool !== groups.mixed && pool.length >= size);
      if (extras) groups.mixed.push(...extras.slice(0, need));
    }
    const tracks = [];
    for (const [kind, heads] of Object.entries(groups)) {
      if (heads.length < size) continue;
      heads.sort((a, b) => a.word < b.word ? -1 : a.word > b.word ? 1 : 0);
      const id = 'edition-track/' + encodeURIComponent(edition.id) + '/' + kind;
      const info = {id, title:kinds[kind][0] + ' · ' + edition.name, description:kinds[kind][1],
        count:Math.ceil(heads.length / size), words:heads.slice(0, 12).map(head => head.word)};
      tracks.push({edition, kind, heads, info});
    }
    indexed.set(edition, tracks);
    return tracks;
  }
  function allTracks() { return editions().flatMap(tracksFor); }

  function card(word, sense, sourceName) {
    const id = D.coach.dictionaryId(word, sense.definition);
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prompt = sense.definition.replace(new RegExp('(^|[^\\p{L}\\p{N}])' + escaped + '(?=$|[^\\p{L}\\p{N}])', 'giu'), '$1_____');
    return {id, word, sense:sense.definition, pos:sense.pos, sourceName, prompt};
  }
  function makePack(editionId, source, kind, entries) {
    const [groupTitle, goal, challenge, followup] = kinds[kind];
    const path = encodeURIComponent(editionId) + '/' + kind;
    // Encode the actual sense IDs so adding, removing or reordering other words
    // never changes what a previously opened link means.
    const id = 'edition/' + path + '/' + entries.map(entry => entry.id.slice('sense/'.length)).join('/');
    const names = entries.map(entry => entry.word);
    return {id, generated:true, trackId:'edition-track/' + path, trackTitle:groupTitle + ' · ' + source,
      title:names.slice(0, 2).join(', ') + ' & ' + names[2], description:'With ' + names[3] + ' and ' + names[4] + '. ' + goal,
      goal, challenge, followup, entries};
  }
  function at(index, trackId) {
    if (!Number.isSafeInteger(index) || index < 0) return null;
    for (const {edition, kind, heads, info} of allTracks()) {
      if (trackId !== undefined && trackId !== info.id) continue;
      if (index >= info.count) { index -= info.count; continue; }
      const selected = [];
      // Deal across the alphabet to avoid a pack of five neighboring spellings.
      for (let i = index; i < heads.length; i += info.count) selected.push(heads[i]);
      for (let i = index + 1; selected.length < size; i++) {
        const head = heads[i % heads.length];
        if (!selected.includes(head)) selected.push(head);
      }
      return makePack(edition.id, edition.name, kind, selected.map(head => card(head.word, head.senses[0], edition.name)));
    }
    return null;
  }

  // Locate one genuine set without constructing every set in a large edition.
  function findExample(trackId, terms) {
    const track=allTracks().find(t=>t.info.id===trackId);
    if(!track)return null;
    if(!terms.length)return at(0,trackId);
    if(!track.searchIndex)track.searchIndex=track.heads.map((h,i)=>[h.word.toLowerCase(),i])
      .sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
    const index=track.searchIndex, first=terms[0], count=track.info.count;
    let lo=0,hi=index.length;
    while(lo<hi){const mid=(lo+hi)>>>1;if(index[mid][0]<first)lo=mid+1;else hi=mid;}
    const matches=set=>set && terms.every(t=>set.entries.some(entry=>entry.word.toLowerCase().includes(t)));
    // A headword normally belongs to exactly one dealt set. At most four
    // final sets can borrow another headword to bring their size up to five.
    const tried=new Set();
    function probe(i){if(tried.has(i))return null;tried.add(i);
      const words=[];
      for(let k=i;k<track.heads.length;k+=count)words.push(track.heads[k].word.toLowerCase());
      if(words.length===size&&!terms.every(t=>words.some(w=>w.includes(t))))return null;
      const pack=at(i,trackId);return matches(pack)?pack:null;
    }
    for(let i=lo;i<index.length&&index[i][0].startsWith(first);i++){
      const result=probe(index[i][1]%count);if(result)return result;
    }
    for(let i=Math.max(0,track.heads.length-(size-1)*count);i<count;i++){
      const result=probe(i);if(result)return result;
    }
    return null;
  }

  const archives = () => D.state.savedEditionPacks || {};
  let archivedCards;
  function remember(entry) { archivedCards.set(entry.id, entry); }
  function savedEntries(snapshot) {
    return snapshot.words.map(([word, definition, pos]) => card(word, {definition, pos}, snapshot.source));
  }
  function retain(pack) {
    if (!pack?.id.startsWith('edition/') || Object.hasOwn(archives(), pack.id)) return;
    const saved = D.state.savedEditionPacks ||= {};
    saved[pack.id] = {source:pack.entries[0].sourceName, words:pack.entries.map(e => [e.word, e.sense, e.pos])};
    if (archivedCards) pack.entries.forEach(remember);
  }
  function get(id) {
    if (typeof id !== 'string' || !id.startsWith('edition/')) return null;
    const parts = id.split('/');
    if (parts.length !== 3 + size * 2 || !Object.hasOwn(kinds, parts[2])) return null;
    let editionId;
    try { editionId = decodeURIComponent(parts[1]); } catch { return null; }
    const kind = parts[2], snapshot = archives()[id];
    if (snapshot) return makePack(editionId, snapshot.source, kind, savedEntries(snapshot));
    const edition = editions().find(source => source.id === editionId);
    if (!edition) return null;
    const entries = [];
    for (let i = 3; i < parts.length; i += 2) {
      let word;
      try { word = decodeURIComponent(parts[i]); } catch { return null; }
      const head = edition.map.get(word);
      const key = 'sense/' + parts[i] + '/' + parts[i + 1];
      const sense = head?.senses.find(s => D.coach.dictionaryId(word, s.definition) === key);
      if (!sense) return null;
      entries.push(card(head.word, sense, edition.name));
    }
    const pack = makePack(editionId, edition.name, kind, entries);
    return pack.id === id && new Set(entries.map(e => e.word)).size === size ? pack : null;
  }
  function entry(id) {
    if (typeof id !== 'string' || !id.startsWith('sense/')) return null;
    const parts = id.split('/');
    if (parts.length !== 3) return null;
    let word;
    try { word = decodeURIComponent(parts[1]); } catch { return null; }
    for (const edition of editions()) {
      const head = edition.map.get(word);
      const sense = head?.senses.find(s => D.coach.dictionaryId(word,s.definition) === id);
      if (sense) return card(head.word,sense,edition.name);
    }
    if (!archivedCards) {
      archivedCards = new Map();
      for (const stored of Object.values(archives())) savedEntries(stored).forEach(remember);
    }
    return archivedCards.get(id) || null;
  }
  D.editionPacks = {tracks:() => allTracks().map(track => track.info),
    count:() => allTracks().reduce((n, track) => n + track.info.count, 0), at, get, entry, retain, findExample};
})();

