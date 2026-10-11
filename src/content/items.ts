import type { ItemDef } from '../engine/types';

export const ITEMS: ItemDef[] = [
  {
    id: 'torch',
    name: 'Torch',
    icon: 'torch',
    description: [{ text: 'A heavy rubber torch. Its beam turns the ice blue and the brass gold.' }],
  },
  {
    id: 'brooch',
    name: 'Brass wren brooch',
    icon: 'brooch',
    description: [
      { when: 'solved:P17', text: "Wren's brooch — Gran's brooch — made by J. Ashdown of Hull. Its locket held a note for fifty-one years." },
      { when: 'wren_brooch', text: 'A brass wren with spread wings, a crest, a tail that turns and a tiny keyhole under it. Wren described exactly this.' },
      {
        text: "Gran's brooch: a little brass wren with spread wings. You've never seen it open, though one wing has a hairline seam. Gran made you promise to wear it.",
      },
    ],
    actions: [{ label: 'Open the locket', show: ['wren_brooch', 'item:tiny-key', '!solved:P17'], puzzle: 'P17', effects: [] }],
  },
  {
    id: 'box',
    name: "Gran's tin box",
    icon: 'box',
    description: [
      { when: 'env4_opened', text: 'A dented biscuit tin painted with roses. Every envelope is open now.' },
      {
        text: 'A dented biscuit tin painted with roses: a battery, valves in a tea towel, Gran\'s note "For the wireless", and envelopes labelled in her hand — "When she asks for proof", "When you hear the song", "NOT until you find the card".',
      },
    ],
    actions: [
      { label: 'Read "For the wireless"', doc: 'wireless-note', effects: [] },
      {
        label: 'Open "When you hear the song"',
        show: ['wren_sparks', '!doc:clipping-1957'],
        doc: 'clipping-1957',
        effects: [{ doc: 'clipping-1957' }],
        sfx: 'page',
      },
      {
        label: 'Open "NOT until you find the card"',
        show: ['can_open_env4', '!env4_opened'],
        doc: 'gran-last-letter',
        effects: [{ doc: 'appendix-c' }, { doc: 'gran-last-letter' }, { set: 'env4_opened' }],
        sfx: 'page',
      },
    ],
  },
  {
    id: 'walkie',
    name: 'Walkie-talkies',
    icon: 'walkie',
    description: [{ text: 'One sits by the wireless loudspeaker; you carry the other. Wren can reach you anywhere in the wreck.' }],
  },
  {
    id: 'smoking-key',
    name: 'Smoking-room key',
    icon: 'key',
    description: [{ text: 'A brass key on a loop of rotten string, from the wireless-room clock. Fifty-one years ago it was hidden there a minute before you found it.' }],
  },
  {
    id: 'sixpence',
    name: 'Sixpence',
    icon: 'coin',
    description: [{ text: '1937 sixpence, black with tarnish. "If you are real, you owe me a sixpence."' }],
  },
  {
    id: 'cipher-disc',
    name: "Captain's cipher disc",
    icon: 'disc',
    description: [{ text: 'Two brass discs riveted at the centre: an outer A–Z ring and a rotating inner ring of scrambled letters, engraved H.B.' }],
    actions: [{ label: "Use it on Wren's transcription", show: ['wren_cipher', '!solved:P10'], puzzle: 'P10', effects: [] }],
  },
  {
    id: 'slide',
    name: 'Lantern slide',
    icon: 'slide',
    description: [{ text: 'A glass lantern slide in a paper sleeve marked "Le Chemin". Too dark to read by torchlight alone.' }],
  },
  {
    id: 'tiny-key',
    name: 'Tiny wren key',
    icon: 'tinykey',
    description: [{ text: 'A brass key no bigger than a fingernail, its bow shaped like a wren. From the drawer of the singing bird.' }],
  },
  {
    id: 'planisphere',
    name: 'Star wheel',
    icon: 'star',
    description: [{ text: "Professor Solberg's planisphere, with an azimuth arm, set for latitude 61° N." }],
    actions: [{ label: 'Use the star wheel', show: ['stars_ready', '!solved:P21'], puzzle: 'P21', effects: [] }],
  },
];
