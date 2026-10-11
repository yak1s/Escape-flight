import type { SceneDef } from '../engine/types';

// Scene art is drawn in a 1000 × 1500 viewBox; hotspot rects use the same units.
export const SCENES: SceneDef[] = [
  // ================================================================ PROMENADE
  {
    id: 'promenade',
    title: 'Promenade Deck',
    short: 'Promenade',
    art: 'promenade',
    ambience: 'amb_wreck',
    hotspots: [
      {
        id: 'ice-cave',
        label: 'The way you came in',
        rect: { x: 30, y: 700, w: 280, h: 520 },
        closeup: {
          title: 'The ice cave',
          text: [
            {
              text: 'Where you squeezed in, there is now a wall of packed snow and ice, blue in the torchlight. Beyond it the storm is howling. You will not get out this way.',
            },
          ],
        },
      },
      {
        id: 'deck-plan',
        label: 'Broken deck plan',
        key: true,
        rect: { x: 610, y: 470, w: 220, h: 330 },
        puzzle: 'P01',
        closeup: {
          title: 'The deck plan',
          text: [{ text: 'The enamel deck plan, pieced back together on its frame.' }],
          actions: [{ label: 'Study the plan', doc: 'deck-plan', effects: [] }],
        },
      },
      {
        id: 'deck-chair',
        label: 'Deck chair',
        rect: { x: 300, y: 1030, w: 300, h: 240 },
        closeup: {
          title: 'A deck chair',
          art: 'deckchair',
          text: [
            { when: 'doc:lund-novel', text: 'A deck chair frozen to the planking, a tartan rug folded on it as neatly as if its owner had just stepped away.' },
            { text: 'A deck chair frozen to the planking. A tartan rug, folded. On the seat, a book, its pages swollen with ice.' },
          ],
          actions: [{ label: 'Take the book', show: '!doc:lund-novel', doc: 'lund-novel', effects: [{ doc: 'lund-novel' }] }],
        },
      },
      {
        id: 'lounge-doors',
        label: 'Doors to the lounge',
        rect: { x: 440, y: 540, w: 170, h: 280 },
        closeup: {
          title: 'Lounge doors',
          text: [
            { when: 'visited:lounge', text: 'Sealed with a thick skin of ice. The lounge is reached by the spiral stair from B deck.' },
            { text: 'The double doors to the lounge are sealed with a thick skin of ice. Your gloved fists make no impression. There must be another way in.' },
          ],
        },
      },
      {
        id: 'windows',
        label: 'Promenade windows',
        rect: { x: 60, y: 300, w: 330, h: 380 },
        closeup: {
          title: 'The windows',
          text: [{ text: 'The long, slanted windows are packed with glacier ice. Green light moves in it like weed in deep water: the aurora, filtering down through a hundred feet of ice.' }],
        },
      },
      { id: 'to-corridor', label: 'Cabin corridor', key: true, rect: { x: 830, y: 620, w: 170, h: 560 }, goto: 'corridor' },
    ],
  },

  // ================================================================ CORRIDOR
  {
    id: 'corridor',
    title: 'Cabin Corridor',
    short: 'Corridor',
    art: 'corridor',
    ambience: 'amb_wreck',
    hotspots: [
      {
        id: 'luggage',
        label: 'Frozen luggage',
        key: true,
        rect: { x: 270, y: 800, w: 460, h: 280 },
        puzzle: 'P02',
        closeup: {
          title: 'The luggage',
          text: [{ text: 'The trunks have been shoved aside; the steward\'s trolley sits in the linen alcove. The CREW ONLY door is clear.' }],
        },
      },
      {
        id: 'crew-door',
        label: 'CREW ONLY — B deck',
        key: true,
        rect: { x: 420, y: 520, w: 160, h: 270 },
        goto: 'bdeck',
        gotoWhen: 'solved:P02',
        closeup: {
          title: 'CREW ONLY',
          text: [{ text: 'A door stencilled CREW ONLY — B DECK. A frozen jumble of trunks and a steward\'s trolley are wedged in front of it.' }],
        },
      },
      {
        id: 'doors-port',
        label: 'Port cabin doors',
        rect: { x: 20, y: 480, w: 250, h: 760 },
        closeup: {
          title: 'Port side cabins',
          art: 'doorstrip',
          text: [
            { when: 'conn_door_open', text: 'Port side, from forward: 1 · 3 · 5 · 7 · 6 · 11. Cabin 7 stands open; inside, the connecting door to the next cabin has been unbolted — fifty-one years ago.' },
            { when: 'solved:P09', text: 'Port side, from forward: 1 · 3 · 5 · 7 · 6 · 11. The "6" is really Cabin 9 — Sorrel\'s — its plate spun round. Its door has a heavy modern combination lock.' },
            {
              text: 'Port side, from forward: 1 · 3 · 5 · 7 · 6 · 11. Most doors are frozen shut. The door plated "6" hangs its brass number from a single screw, and has a heavy modern combination lock, like a bank vault\'s.',
            },
          ],
          actions: [{ label: 'Go through Cabin 7 into Cabin 9', show: 'conn_door_open', goto: 'cabin9', effects: [] }],
        },
      },
      {
        id: 'doors-stbd',
        label: 'Starboard cabin doors',
        rect: { x: 730, y: 480, w: 250, h: 760 },
        closeup: {
          title: 'Starboard side cabins',
          art: 'doorstrip',
          text: [
            { when: 'solved:P09', text: 'Starboard side, from forward: 2 · 4 · 9 · 8 · 10 · 12. The loose "9" is really Cabin 6, the steward\'s spare. The hook behind its door is empty — Wren took the keys in 1938.' },
            { text: 'Starboard side, from forward: 2 · 4 · 9 · 8 · 10 · 12. The doors are frozen shut. One brass plate dangles from a single screw.' },
          ],
        },
      },
      {
        id: 'sorrel-case',
        label: 'A plain black case',
        show: 'solved:P02',
        rect: { x: 560, y: 1090, w: 200, h: 160 },
        closeup: {
          title: '"E. SORREL"',
          text: [{ text: 'A plain black case with no stickers, no address and not a single scuff. A luggage tag in a neat, sloping hand: E. Sorrel · Cabin 9 · Tromsø. The case itself is empty.' }],
          actions: [{ label: 'Take the luggage tag', show: '!doc:sorrel-tag', doc: 'sorrel-tag', effects: [{ doc: 'sorrel-tag' }] }],
        },
      },
      { id: 'to-promenade', label: 'Back to the promenade', rect: { x: 380, y: 1300, w: 240, h: 180 }, goto: 'promenade' },
    ],
  },

  // ================================================================ B DECK
  {
    id: 'bdeck',
    title: 'B Deck Passage',
    short: 'B deck',
    art: 'bdeck',
    ambience: 'amb_wreck',
    hotspots: [
      { id: 'to-wireless', label: 'Wireless room', key: true, rect: { x: 40, y: 520, w: 210, h: 420 }, goto: 'wireless' },
      { id: 'crew-stair', label: 'Crew stair up to the corridor', rect: { x: 40, y: 1280, w: 300, h: 200 }, goto: 'corridor' },
      { id: 'spiral', label: 'Spiral stair up to the lounge', key: true, rect: { x: 650, y: 1130, w: 300, h: 330 }, goto: 'lounge' },
      {
        id: 'galley',
        label: 'Galley',
        rect: { x: 40, y: 960, w: 240, h: 300 },
        goto: 'keel',
        gotoWhen: 'visited:keel',
        closeup: {
          title: 'The galley',
          art: 'galley',
          text: [
            { when: 'shaft_clear', text: 'The dumbwaiter car is gone — winched up the shaft fifty-one years ago. Above you the shaft opens into the dark of the keel.' },
            { text: 'Frozen copper pans, a stove furred with frost, and a dumbwaiter shaft with its car jammed halfway up in a plug of ice. On the faded wall plate: KEEL ↑.' },
          ],
          actions: [{ label: 'Climb the shaft into the keel', show: 'shaft_clear', goto: 'keel', effects: [] }],
        },
      },
      {
        id: 'bar',
        label: 'The bar',
        rect: { x: 750, y: 520, w: 230, h: 320 },
        closeup: {
          title: 'The bar',
          text: [
            { when: 'chapter>=c3', text: 'Frosted bottles, a brass rail and a spike of drinks chits behind the counter, the top ones still legible.' },
            { text: 'Frosted bottles behind a brass rail. A spike of chits behind the counter, frozen into a lump.' },
          ],
          actions: [{ label: 'Read the top chit', show: ['chapter>=c3', '!doc:bar-chit'], doc: 'bar-chit', effects: [{ doc: 'bar-chit' }] }],
        },
      },
      {
        id: 'mail',
        label: 'Mail room',
        rect: { x: 750, y: 870, w: 230, h: 260 },
        closeup: {
          title: 'The mail room',
          text: [
            { when: 'chapter>=c5', text: 'Pigeonholes, a franking machine, Finch\'s ledger on the desk, and a canvas sack of letters posted aboard on the last night — frozen together, but you can ease a few apart.' },
            { text: 'Pigeonholes, a franking machine and a canvas sack labelled ALBATROSS — BERGEN, frozen solid. Letters posted aboard on the last night are inside.' },
          ],
          actions: [
            {
              label: 'Ease the letters apart',
              show: ['chapter>=c5', '!doc:letter-solberg'],
              effects: [{ doc: 'letter-pell' }, { doc: 'letter-vasseur' }, { doc: 'letter-solberg' }, { doc: 'letter-fenwick' }, { toast: 'Four letters added to Evidence.' }],
              sfx: 'page',
            },
            { label: "Read Finch's ledger", show: ['chapter>=c5', '!doc:finch-ledger'], doc: 'finch-ledger', effects: [{ doc: 'finch-ledger' }] },
          ],
        },
      },
      {
        id: 'smoking',
        label: 'Smoking room airlock',
        rect: { x: 430, y: 560, w: 150, h: 270 },
        goto: 'smoking',
        gotoWhen: 'smoking_open',
        closeup: {
          title: 'SMOKING ROOM',
          text: [
            { when: 'item:smoking-key', text: 'A heavy airlock door: SMOKING ROOM — PRESSURISED. Wren\'s key fits the lock.' },
            { text: 'A heavy airlock door with a porthole: SMOKING ROOM — PRESSURISED. Locked.' },
          ],
          actions: [{ label: 'Unlock it with the key from the clock', show: 'item:smoking-key', goto: 'smoking', effects: [{ set: 'smoking_open' }], sfx: 'unlock' }],
        },
      },
      {
        id: 'officers',
        label: "Officers' passage",
        rect: { x: 280, y: 610, w: 130, h: 270 },
        goto: 'captain',
        gotoWhen: 'officers_open',
        closeup: {
          title: "Officers' passage",
          text: [{ text: 'A bulkhead door marked OFFICERS. Its locking wheel is frozen solid; the door will not move.' }],
        },
      },
      {
        id: 'notice',
        label: 'Crew mess noticeboard',
        rect: { x: 600, y: 590, w: 130, h: 170 },
        closeup: {
          title: 'Crew mess noticeboard',
          text: [{ text: 'Rotas, a dance notice ("Bergen, Saturday 29th — all crew welcome!"), a lost-property card for one glove.' }],
          actions: [{ label: 'Read the night rota', show: ['chapter>=c4', '!doc:watch-rota'], doc: 'watch-rota', effects: [{ doc: 'watch-rota' }] }],
        },
      },
    ],
  },

  // ================================================================ WIRELESS ROOM
  {
    id: 'wireless',
    title: 'Wireless Room',
    short: 'Wireless',
    art: 'wireless',
    ambience: 'amb_wreck',
    hotspots: [
      {
        id: 'radio',
        label: 'The wireless set',
        key: true,
        rect: { x: 320, y: 540, w: 360, h: 500 },
        puzzle: ['P03', 'P04'],
        closeup: {
          title: 'Marconi AD.37',
          art: 'radioset',
          text: [
            { when: 'solved:P04', text: 'The set hums softly, its dial resting on 1330. A walkie-talkie leans against the loudspeaker.' },
            { text: 'A Marconi AD.37 transmitter-receiver in a steel rack. Its valve sockets are empty.' },
          ],
        },
      },
      { id: 'logbook', label: 'Wireless log', rect: { x: 560, y: 1050, w: 170, h: 120 }, doc: 'radio-log' },
      {
        id: 'clock',
        label: 'Wall clock',
        key: true,
        rect: { x: 710, y: 280, w: 200, h: 200 },
        closeup: {
          title: 'The clock',
          art: 'clock',
          text: [
            { when: 'item:sixpence', text: 'Frozen at twelve minutes past three. Behind its hinged face, where a key and a sixpence waited fifty-one years for you, there are only gears.' },
            { when: 'wren_hid_clock', text: 'Frozen at twelve minutes past three. "It\'s in the clock," Wren said. Its face is hinged.' },
            { text: 'A brass ship\'s clock, frozen at twelve minutes past three. Its face is hinged; behind it there is nothing but gears and frost.' },
          ],
          actions: [
            {
              label: 'Open the clock face',
              show: ['wren_hid_clock', '!item:sixpence'],
              effects: [{ shimmer: true }, { sfx: 'shimmer' }, { item: 'smoking-key' }, { item: 'sixpence' }, { doc: 'wren-sixpence-note' }, { say: 'c2-date' }],
            },
          ],
        },
      },
      {
        id: 'desk',
        label: "Operator's desk",
        rect: { x: 240, y: 1060, w: 300, h: 180 },
        closeup: { title: 'The desk', text: [{ text: 'The operator\'s desk is crushed flat under a fallen roof beam. The drawer is a splintered sandwich of ice; nothing in it could be got out.' }] },
      },
      {
        id: 'shelf',
        label: 'Spare-parts shelf',
        rect: { x: 720, y: 560, w: 250, h: 320 },
        closeup: { title: 'The shelf', text: [{ text: 'The spare-parts shelf has collapsed. Its tins of fuses and screws have burst and rusted together into one frozen lump.' }] },
      },
      {
        id: 'floor',
        label: 'Floor panel',
        rect: { x: 300, y: 1260, w: 420, h: 170 },
        closeup: { title: 'The floor', text: [{ text: 'A loose floor panel — under a foot of clear, solid ice. Whatever is beneath it will stay there until the glacier melts.' }] },
      },
      {
        id: 'chart',
        label: 'Frequency chart',
        rect: { x: 60, y: 400, w: 220, h: 280 },
        closeup: { title: 'Frequency chart', text: [{ text: 'A framed frequency chart. The backing has rotted clean away; the chart hangs in tatters and there is nothing behind it but bare wall.' }] },
      },
      { id: 'photo', label: 'Framed photograph', rect: { x: 80, y: 720, w: 180, h: 220 }, doc: 'crew-photo' },
      { id: 'exit', label: 'Out to B deck', rect: { x: 0, y: 1120, w: 200, h: 340 }, goto: 'bdeck' },
    ],
  },

  // ================================================================ LOUNGE
  {
    id: 'lounge',
    title: 'The Lounge',
    short: 'Lounge',
    art: 'lounge',
    ambience: 'amb_wreck',
    hotspots: [
      {
        id: 'piano',
        label: 'Painted piano',
        key: true,
        rect: { x: 60, y: 800, w: 400, h: 330 },
        puzzle: 'P05',
        closeup: {
          title: 'The piano',
          text: [
            { when: 'solved:P05', text: 'Jonas Aakre\'s painting, wiped clear of frost: the albatross, the seven stars, the full moon, the two-masted ship.' },
            { text: 'An aluminium piano, light enough to fly. Its painted lid is buried under thick frost.' },
          ],
          actions: [{ label: 'Look at the painting', show: 'solved:P05', doc: 'piano-painting', effects: [] }],
        },
      },
      {
        id: 'trunk',
        label: "Vasseur's trunk",
        key: true,
        rect: { x: 590, y: 950, w: 350, h: 260 },
        closeup: {
          title: 'A trunk of painted stars',
          art: 'trunk',
          text: [
            { when: 'solved:P12', text: 'The trunk stands open. Le Spectre\'s lens still points at the wall where the Rat Run glowed.' },
            { when: 'trunk_open', text: 'The trunk stands open: Le Spectre, the lantern apparatus, waits inside for a light.' },
            { when: 'doc:vasseur-notebook', text: 'MME O. VASSEUR — THÉÂTRE. Behind the glass of the lid, twelve cards in a frozen fan, four face down. Four little card windows form the lock.' },
            { when: 'chapter>=c4', text: 'MME O. VASSEUR — THÉÂTRE. Four little card windows form the lock. An outer pocket bulges with a notebook.' },
            { text: 'A trunk painted with gold stars: MME O. VASSEUR — THÉÂTRE. Locked with four little card windows instead of a keyhole.' },
          ],
          actions: [
            { label: 'Take the notebook from the pocket', show: ['chapter>=c4', '!doc:vasseur-notebook'], doc: 'vasseur-notebook', effects: [{ doc: 'vasseur-notebook' }] },
            { label: 'Set the card locks', show: ['wren_vasseur', '!solved:P11'], puzzle: 'P11', effects: [] },
            { label: 'Work Le Spectre', show: ['vasseur_ally', '!solved:P12'], puzzle: 'P12', effects: [] },
            { label: 'Look at the projected map', show: 'solved:P12', doc: 'rat-run-map', effects: [] },
          ],
        },
      },
      {
        id: 'bird',
        label: 'Singing bird automaton',
        key: true,
        rect: { x: 455, y: 700, w: 150, h: 260 },
        puzzle: 'P16',
        closeup: {
          title: 'The singing bird',
          art: 'bird',
          text: [
            { when: 'solved:P16', text: 'The little brass bird sings when you touch its lever: the Clockmaker\'s Lullaby.' },
            { text: 'A singing-bird automaton in a gilded cage. The song cylinder in its base has lost half its pins; the bird is silent. A brass plate is engraved with a maker\'s name and a worn stave of music.' },
          ],
          actions: [{ label: "Read the maker's plate", doc: 'bird-plate', effects: [{ doc: 'bird-plate' }] }],
        },
      },
      {
        id: 'windows',
        label: 'Lounge windows',
        rect: { x: 150, y: 280, w: 700, h: 380 },
        closeup: { title: 'The great windows', text: [{ text: 'Where passengers once watched the aurora, the windows are walls of blue ice. Two of the port panes are cracked right across.' }] },
      },
      {
        id: 'armchair',
        label: 'Armchair',
        rect: { x: 310, y: 1170, w: 270, h: 210 },
        closeup: {
          title: 'An armchair',
          text: [{ text: 'A deep leather armchair. Something papery is tucked down the side of the cushion.' }],
          actions: [{ label: 'Pull it out', show: '!doc:krag-telegram', doc: 'krag-telegram', effects: [{ doc: 'krag-telegram' }] }],
        },
      },
      { id: 'to-dining', label: 'Dining salon', rect: { x: 830, y: 540, w: 160, h: 360 }, goto: 'dining' },
      { id: 'spiral-down', label: 'Spiral stair down to B deck', key: true, rect: { x: 30, y: 1240, w: 260, h: 240 }, goto: 'bdeck' },
    ],
  },

  // ================================================================ DINING SALON
  {
    id: 'dining',
    title: 'Dining Salon',
    short: 'Dining',
    art: 'dining',
    ambience: 'amb_wreck',
    hotspots: [
      {
        id: 'cloak',
        label: 'Cloakroom alcove',
        key: true,
        rect: { x: 40, y: 560, w: 230, h: 430 },
        closeup: {
          title: 'The cloakroom',
          text: [{ text: 'Frozen coats on a rail, a counter, and Finch\'s cloakroom book lying open where he left it.' }],
          actions: [{ label: "Read Finch's cloakroom book", doc: 'cloakroom-note', effects: [{ doc: 'cloakroom-note' }] }],
        },
      },
      {
        id: 'seating',
        label: 'Seating plan',
        rect: { x: 420, y: 590, w: 170, h: 280 },
        closeup: { title: 'Seating plan', text: [{ text: 'A seating plan on an easel. Damp got into it long ago; the names have run into a single blue blur.' }] },
      },
      {
        id: 'drawing',
        label: 'Something under a table',
        rect: { x: 560, y: 1140, w: 240, h: 160 },
        closeup: {
          title: 'Under the table',
          text: [{ text: 'A sheet of drawing paper, crayon on cartridge, frozen to the carpet.' }],
          actions: [{ label: 'Peel it free', show: '!doc:pip-supper', doc: 'pip-supper', effects: [{ doc: 'pip-supper' }] }],
        },
      },
      {
        id: 'tables',
        label: 'Laid tables',
        rect: { x: 250, y: 900, w: 300, h: 220 },
        closeup: { title: 'Breakfast', text: [{ text: 'Tables still laid for a breakfast that never came. Frost-furred napkins folded into swans.' }] },
      },
      { id: 'to-lounge', label: 'Back to the lounge', rect: { x: 820, y: 1220, w: 180, h: 260 }, goto: 'lounge' },
    ],
  },

  // ================================================================ SMOKING ROOM
  {
    id: 'smoking',
    title: 'Smoking Room',
    short: 'Smoking room',
    art: 'smoking',
    ambience: 'amb_wreck',
    hotspots: [
      {
        id: 'initials',
        label: 'Scratches on the wall',
        key: true,
        rect: { x: 560, y: 520, w: 360, h: 320 },
        closeup: {
          title: 'Scratched initials',
          text: [{ text: 'Six sets of initials scratched deep into the panelling, and a date.' }],
          actions: [{ label: 'Read them', doc: 'six-initials', effects: [{ doc: 'six-initials' }] }],
        },
      },
      {
        id: 'skylight',
        label: 'Skylight',
        rect: { x: 340, y: 150, w: 320, h: 220 },
        closeup: { title: 'The skylight', text: [{ text: 'A cracked skylight packed with snow. If the snow ever shifted, this would be a way out.' }] },
      },
      {
        id: 'chairs',
        label: 'Armchairs',
        rect: { x: 220, y: 900, w: 560, h: 320 },
        closeup: { title: 'The smoking room', text: [{ text: 'Leather armchairs bolted to the deck, a brass lighter chained to the table. The only room aboard where a flame was allowed — sealed behind an airlock, built to be the strongest room in the ship.' }] },
      },
      { id: 'exit', label: 'Back through the airlock', rect: { x: 40, y: 700, w: 200, h: 520 }, goto: 'bdeck' },
    ],
  },

  // ================================================================ CAPTAIN'S CABIN
  {
    id: 'captain',
    title: "Captain's Cabin",
    short: "Captain's cabin",
    art: 'captain',
    ambience: 'amb_wreck',
    onEnter: [{ when: 'said:c3-keys', effects: [{ say: 'c3-cipher' }] }],
    hotspots: [
      {
        id: 'logbook',
        label: "Captain's log",
        key: true,
        rect: { x: 560, y: 860, w: 320, h: 230 },
        closeup: {
          title: "Captain Brekke's log",
          text: [
            { when: 'solved:P10', text: '"ALBATROSS. COMPASS FALSE. WE ARE OVER LAND. DAHL WILL NOT TURN."' },
            { text: 'The captain\'s private log, swollen with ice. A few early pages are legible.' },
          ],
          actions: [
            { label: 'Read the legible entries', doc: 'captain-log', effects: [{ doc: 'captain-log' }] },
            { label: 'Decode the last entry', show: ['wren_cipher', 'item:cipher-disc', '!solved:P10'], puzzle: 'P10', effects: [] },
          ],
        },
      },
      {
        id: 'drawer',
        label: 'Desk drawer',
        rect: { x: 590, y: 1100, w: 260, h: 140 },
        closeup: {
          title: 'The desk drawer',
          text: [
            { when: 'item:cipher-disc', text: 'Pencils, a pipe, a tin of tobacco frozen into a brick.' },
            { text: 'Pencils, a pipe, a tin of tobacco frozen into a brick — and a brass disc engraved H.B., two rings of letters riveted at the centre.' },
          ],
          actions: [{ label: 'Take the brass disc', show: '!item:cipher-disc', effects: [{ item: 'cipher-disc' }], sfx: 'pickup' }],
        },
      },
      { id: 'photo', label: 'Photograph', rect: { x: 610, y: 500, w: 180, h: 220 }, doc: 'brekke-photo' },
      {
        id: 'barometer',
        label: 'Barometer',
        rect: { x: 290, y: 470, w: 160, h: 220 },
        closeup: { title: 'Barometer', text: [{ text: 'The needle is pinned at STORMY, as if it has been shouting for fifty-one years.' }] },
      },
      {
        id: 'bunk',
        label: 'Bunk',
        rect: { x: 60, y: 820, w: 400, h: 330 },
        closeup: { title: 'The bunk', text: [{ text: 'A narrow bunk with a grey blanket, a dent in the pillow frozen solid. Fifty-one years ago a doctor sat here, watching an unconscious captain breathe.' }] },
      },
      { id: 'exit', label: 'Back to B deck', rect: { x: 20, y: 1240, w: 240, h: 240 }, goto: 'bdeck' },
    ],
  },

  // ================================================================ CABIN 9
  {
    id: 'cabin9',
    title: 'Cabin 9',
    short: 'Cabin 9',
    art: 'cabin9',
    ambience: 'amb_wreck',
    onEnter: [{ when: 'said:c5-sorrel', effects: [{ say: 'c5-falter' }] }],
    hotspots: [
      {
        id: 'receiver',
        label: 'The resonance receiver',
        key: true,
        rect: { x: 240, y: 500, w: 520, h: 580 },
        puzzle: 'P15',
        closeup: {
          title: 'Resonance receiver',
          text: [
            { when: 'solved:P15', text: 'Its twin, fifty-one years away, is singing in tune. The static is a soft, even surf.' },
            { text: 'Coils as thick as your arm, a horn of beaten brass and three dials behind cracked glass: FREQUENCY, AMPLITUDE, PHASE.' },
          ],
          actions: [{ label: 'Read the frozen dials', doc: 'receiver-dials', effects: [{ doc: 'receiver-dials' }] }],
        },
      },
      { id: 'notebook', label: "Professor's notebook", rect: { x: 100, y: 1090, w: 250, h: 170 }, doc: 'prof-notebook' },
      {
        id: 'starwheel',
        label: 'Star wheel',
        key: true,
        rect: { x: 650, y: 1080, w: 250, h: 190 },
        puzzle: 'P21',
        closeup: {
          title: 'Star wheel',
          text: [
            { when: 'item:planisphere', text: 'A clean rectangle in the frost where the star wheel lay.' },
            { text: 'A planisphere — a star wheel — frozen to the folding desk, with an azimuth arm and a pencilled latitude: 61° N.' },
          ],
          actions: [{ label: 'Prise it loose', show: '!item:planisphere', effects: [{ item: 'planisphere' }], sfx: 'pickup' }],
        },
      },
      { id: 'door', label: 'Back through Cabin 7', rect: { x: 10, y: 580, w: 170, h: 620 }, goto: 'corridor' },
    ],
  },

  // ================================================================ KEEL
  {
    id: 'keel',
    title: 'The Keel',
    short: 'Keel',
    art: 'keel',
    ambience: 'amb_wreck',
    onEnter: [{ when: 'said:c6-start', effects: [{ say: 'c6-keel' }] }],
    hotspots: [
      {
        id: 'catwalk',
        label: 'Collapsed catwalk',
        key: true,
        rect: { x: 140, y: 920, w: 720, h: 360 },
        puzzle: 'P18',
        closeup: { title: 'The lattice', text: [{ when: 'solved:P18', text: 'You have crossed the lattice. The girders hum with cold.' }, { text: 'The catwalk has collapsed. Only a lattice of girders spans the gap — some stamped, some cracked.' }] },
      },
      {
        id: 'ballast',
        label: 'Ballast station (frame 125)',
        key: true,
        show: 'catwalk_done',
        rect: { x: 700, y: 500, w: 270, h: 330 },
        puzzle: 'P19',
        closeup: {
          title: 'Ballast station',
          text: [{ when: 'solved:P19', text: 'The bags at frames 125 and 205 hang empty — released fifty-one years ago, the moment Wren pulled the toggles.' }, { text: 'A board of brass plates, one for each water-ballast bag.' }],
          actions: [{ label: 'Read the brass plate', doc: 'ballast-board', effects: [{ doc: 'ballast-board' }] }],
        },
      },
      {
        id: 'cords',
        label: 'Valve cord frame',
        key: true,
        show: 'solved:P19',
        rect: { x: 40, y: 470, w: 260, h: 400 },
        puzzle: 'P20',
        closeup: { title: 'Valve cords', text: [{ text: 'Cords from the gas-cell valves come down through a frame of pulleys to seven handles, A to G. Handle E hangs lower than the rest.' }] },
      },
      {
        id: 'hatch',
        label: 'Hatch to the control car',
        key: true,
        show: 'chapter>=c8',
        rect: { x: 420, y: 480, w: 180, h: 220 },
        puzzle: 'P24',
        goto: 'control',
        gotoWhen: 'hatch_open',
        closeup: { title: 'The hatch', text: [{ text: 'A round hatch in the keel floor, its wheel disconnected from the latch.' }] },
      },
      { id: 'shaft', label: 'Down the shaft to B deck', rect: { x: 410, y: 1300, w: 200, h: 180 }, goto: 'bdeck' },
      { id: 'knife', label: 'Something in the girders', show: 'catwalk_done', rect: { x: 820, y: 1130, w: 150, h: 130 }, doc: 'strand-knife' },
      { id: 'photo', label: 'Photograph on a girder', rect: { x: 320, y: 540, w: 120, h: 150 }, doc: 'haugen-photo' },
    ],
  },

  // ================================================================ CONTROL CAR
  {
    id: 'control',
    title: 'Control Car',
    short: 'Control car',
    art: 'control',
    ambience: 'amb_wreck',
    hotspots: [
      {
        id: 'helm',
        label: 'The helm',
        key: true,
        rect: { x: 400, y: 760, w: 240, h: 300 },
        closeup: {
          title: 'The helm',
          art: 'card',
          text: [
            { when: 'card_turned', text: 'The card, turned round: 081, in Wren\'s round, forward-leaning hand. The helmsman stood on the other side of the chart table.' },
            { text: 'In the card clip at the helm, a stiff card with a course written on it in pencil: 180.' },
          ],
          actions: [{ label: 'Turn the card round', show: '!card_turned', close: false, effects: [{ set: 'card_turned' }, { doc: 'course-card' }], sfx: 'card' }],
        },
      },
      { id: 'clock', label: 'Clock', rect: { x: 280, y: 540, w: 160, h: 160 }, doc: 'control-clock' },
      { id: 'altimeter', label: 'Altimeter', rect: { x: 620, y: 540, w: 160, h: 160 }, doc: 'control-altimeter' },
      { id: 'telegraph', label: 'Engine telegraphs', rect: { x: 700, y: 820, w: 260, h: 320 }, doc: 'control-telegraph' },
      { id: 'chart', label: 'Chart table', rect: { x: 40, y: 940, w: 340, h: 230 }, doc: 'control-chart' },
      { id: 'alcove', label: 'Chart alcove', rect: { x: 40, y: 600, w: 200, h: 230 }, doc: 'pell-memo' },
      { id: 'up', label: 'Up the ladder to the keel', rect: { x: 400, y: 120, w: 220, h: 200 }, goto: 'keel' },
    ],
  },
];
