
// Paired scenes let a writer try a word with support, then make a fresh choice unaided.
(() => {
  'use strict';
  const D = window.Diction = window.Diction || {};
  const sceneBanks = {
    observation: [
      'Someone watching a rehearsal from the wings spots a change the audience misses.',
      'A night porter unlocks a room that looked empty through the glass.',
      'In a secondhand shop, two people recognize the same coat for different reasons.',
      'A gardener notices the first sign that somebody else has tended the plot.',
      'A passenger sees a familiar figure for a moment as two trains pass.',
      'A painter wipes one corner of an old sign and uncovers another name.',
      'At a crowded meal, one place setting has been quietly moved.',
      'A photographer returns to take the same picture a season later.'
    ],
    materials: [
      'A potter opens a kiln and lifts out the only bowl that survived.',
      'A cook unpacks two nearly identical parcels delivered to the kitchen.',
      'An apprentice tries to mend a coat without covering an old repair.',
      'A museum preparator unwraps an ordinary object somebody kept for fifty years.',
      'At closing time, a baker sets aside one loaf for the person who taught her.',
      'A set builder makes a new room look as though a family just left it.',
      'An instrument maker tests a repair before handing the instrument back.',
      'A child recognizes a house they have never seen by something inside it.'
    ],
    sound: [
      'A station announcer falls quiet mid-sentence, but the passengers keep moving.',
      'A pianist in one apartment waits for the person practicing upstairs to finish.',
      'Two people in a closed shop hear the first customers arrive outside.',
      'A sound recordist tries to catch the instant a school empties for the day.',
      'An instrument maker listens from the back row while someone else plays the repair.',
      'A visitor to an unfamiliar house wakes just before everyone else.',
      'A ferry passenger knows the landing is close before the ramp comes into view.',
      'A stagehand must decide from behind the curtain whether the audience is ready.'
    ],
    outdoors: [
      'A river guide returns to a landing after a night of rain.',
      'A walker realizes the path on an old map ends before the beach.',
      'A boat crew waits for the moment it can leave a narrow inlet.',
      'Two neighbors reach opposite conclusions about a change in the weather.',
      'Someone comes back to a childhood orchard and tries to locate one tree.',
      'A bicycle courier takes a shortcut just as the street market closes.',
      'A fieldworker follows a boundary that no longer has a fence.',
      'A family reaches a lookout before the valley is visible.'
    ],
    movement: [
      'Two movers have one chance to fit a piano around a landing.',
      'A latecomer tries to take the last empty seat during a quiet performance.',
      'A dance partner forgets the next step. The other partner notices first.',
      'A child carries an overfull cup across a newly washed floor.',
      'A crowd at a station gives way for someone it cannot quite see.',
      'An apprentice repeats a movement that looked effortless in the teacher’s hands.',
      'A swimmer comes ashore at a different place from the one they aimed for.',
      'A stranger guides a visitor through a house where everyone is asleep.'
    ],
    exchange: [
      'Two siblings meet to decide who should keep a key to the old house.',
      'A regular customer asks the new owner to honor a promise made years ago.',
      'A translator pauses over the host’s last sentence. Both guests are waiting.',
      'An actor asks for one more rehearsal after the director has packed up.',
      'A committee must return a gift that one of its members chose.',
      'A volunteer asks a friend to take the least popular shift.',
      'At a reunion, two people introduce the same person quite differently.',
      'A host offers the best chair to the guest who arrived uninvited.'
    ],
    evidence: [
      'Two maintenance logs disagree about when a hall last flooded.',
      'A reporter has a photograph, a receipt and two different accounts of the same afternoon.',
      'A librarian finds an inscription that might identify a book’s first owner.',
      'A curator has room for one more sentence on the label of an unsigned portrait.',
      'A gardener compares two beds after only one set of seedlings comes up.',
      'Someone correcting a family history discovers a name missing from one letter.',
      'An editor asks which part of a disappearing footpath story can be checked.',
      'A restoration team finds that the drawing and the finished building disagree.'
    ],
    narrative: [
      'A recording stops in the middle of an ordinary family meal.',
      'Someone returns a borrowed book twenty years after promising to bring it back.',
      'Two invitations arrive on the same day. Their dates overlap.',
      'An understudy has the length of a costume change to learn what happened.',
      'A visitor arrives for a celebration everyone else remembers as a farewell.',
      'One letter in a bundle was opened much later than all the others.',
      'An editor must introduce a photograph taken the morning before a town changed its name.',
      'A stranger brings the last item to an auction after the auctioneer has finished.'
    ]
  };
  const themes = {
    observation: ['viewpoint','line-of-sight','light','surfaces-light','firelight','thresholds'],
    materials: ['surfaces','cloth','breakage','scent','taste','handwork'],
    sound: ['acoustics-room','acoustics','sound'],
    outdoors: ['route','ridgelines','waterways','weatherfront'],
    movement: ['motion','footing','posture','crowd'],
    exchange: ['subtext','motives','power-dialogue','conflict','negotiation','concealment','tone'],
    evidence: ['inference','evidence','testimony','cause','uncertainty'],
    narrative: ['time','timing','structure','prosecraft','passingtime']
  };
  const familyFor = new Map(Object.entries(themes).flatMap(([family, ids]) => ids.map(id => [id,family])));
  const forms = [
    'Write the moment from the point of view of someone who has just arrived.',
    'Tell it in three sentences. Let one small detail change what the final sentence means.',
    'Write two or three lines someone present might send to a friend immediately afterward.',
    'Start with what a bystander could notice, then move closer to one person’s experience.',
    'Recount the moment in the voice of someone who remembers it a year later.',
    'Write a paragraph in which the reader recognizes the change before anyone names it.',
    'Open with one line of dialogue and let the next two sentences change how we hear it.'
  ];
  const transfers = [
    'Write a first-person recollection for somebody who missed it. Choose one detail that would matter to that listener.',
    'Write the opening of a scene for a reader who has no background. Give them just enough to follow what happens next.',
    'Write what the least-informed person present might say afterward. Let the limits of their knowledge shape the account.',
    'Write a note for someone who must step in next. Decide what that person needs to know first.',
    'Tell this in two sentences for an impatient reader. Give the most revealing detail room to land.',
    'Write one line a witness might say aloud, then one sentence about what the witness leaves out.',
    'Write a version for someone directly involved. Trust what that reader already knows and choose what still needs saying.'
  ];
  function hash(text) {
    let value = 2166136261;
    for (const char of text) value = Math.imul(value ^ char.codePointAt(0), 16777619);
    return value >>> 0;
  }
  function forPack(pack, cycle = 0) {
    const turn = Number.isSafeInteger(cycle) && cycle >= 0 ? cycle : 0;
    const id = String(pack?.id || pack?.title || '');
    const track = pack?.trackId || id;
    const bank = sceneBanks[familyFor.get(track) || 'narrative'];
    const start = (hash(id + '/scene') + turn % bank.length) % bank.length;
    const round = Math.floor(turn / bank.length);
    const gap = 1 + (hash(id + '/other') + round) % (bank.length - 1);
    const other = (start + gap) % bank.length;
    const form = forms[(hash(id + '/form') + turn % forms.length) % forms.length];
    const transfer = transfers[(hash(id + '/transfer') + (turn % transfers.length) + round) % transfers.length];
    const words = [...new Set((pack?.entries || []).map(entry => typeof entry === 'string' ? entry : entry?.word).filter(Boolean))];
    const word = words.length ? words[(hash(id + '/word') + turn % words.length) % words.length] : '';
    const goal = String(pack?.goal || '').trim();
    const focus = goal && goal + (/[.!?…]$/.test(goal) ? '' : '.');
    const cue = word && 'Try “' + word + '” in one line, then keep it only if it earns its place.';
    return {
      challenge: [bank[start], form, focus, cue].filter(Boolean).join(' '),
      followup: [bank[other], transfer, focus].filter(Boolean).join(' ')
    };
  }
  D.writingBriefs = {forPack};
})();

