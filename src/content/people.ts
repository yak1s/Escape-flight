import type { PersonDef } from '../engine/types';

export const PEOPLE: PersonDef[] = [
  {
    id: 'gran',
    name: 'Gran — Mrs Winifred Strand',
    role: 'Your grandmother (1916–1988)',
    initials: 'WS',
    bio: [
      { when: 'solved:P17', text: 'Born Winifred Ashdown in Hull. Junior wireless operator aboard the Albatross. Survived. Married Ola Strand. Kept her secret for fifty-one years and sent you up the mountain anyway.' },
      { text: 'She called you Sparks, sang you a lullaby you always got wrong, and never talked about her youth except to say she had been "in wireless". She left you a tin box and a letter.' },
    ],
  },
  {
    id: 'wren',
    name: 'Wren — Winifred Ashdown',
    role: 'Junior wireless operator, NC-3 Albatross',
    initials: 'WA',
    bio: [
      { when: 'solved:P17', text: 'Twenty-one. Brave, quick, rude when frightened. Daughter of a Hull clockmaker. Your grandmother.' },
      { when: 'chapter>=c2', text: 'Twenty-one, from Hull, on watch alone because the senior operator has flu. She is talking to you from the night of 25–26 January 1938.' },
      { text: 'A voice on 1330 kc/s: "Albatross wireless, Ashdown speaking."' },
    ],
  },
  {
    id: 'solberg',
    name: 'Prof. Ingrid Solberg',
    role: 'Aurora physicist · Cabin 7 (and Cabin 9)',
    initials: 'IS',
    bio: [
      { when: 'solved:P14', text: '"E. Sorrel" was her own invention — her mother\'s maiden name — to smuggle a forbidden electrical apparatus aboard. Her resonance receiver links the two nights.' },
      { text: 'Asked the wireless room to stand by on 1330 kc/s for "an experiment". Wren has never seen her face.' },
    ],
  },
  {
    id: 'sorrel',
    name: '"E. Sorrel"',
    role: 'Passenger, Cabin 9 · never identified',
    initials: 'ES',
    bio: [
      { when: 'solved:P14', text: 'Never existed. A name on a booking, to hide a machine.' },
      { text: 'Booked by telegram from Tromsø, paid in cash, never came to supper. The 1938 Inquiry blamed this missing passenger for sabotage.' },
    ],
  },
  {
    id: 'ola',
    name: 'Ola Strand',
    role: 'Rigger · survived (in the record)',
    initials: 'OS',
    bio: [{ text: 'Twenty-four, large hands, few words. Climbs into the keel to drop ballast without orders. His surname is your grandmother\'s married name.' }],
  },
  {
    id: 'pell',
    name: 'Augustus Pell',
    role: 'Director, Northern Crown Airship Co. · Cabin 10',
    initials: 'AP',
    bio: [
      { when: 'said:c4-control', text: 'Had the de-icing heaters deleted from the Albatross to save £4,100.' },
      { text: 'Pompous, anxious about the company\'s name. Travelling with his daughter Pip.' },
    ],
  },
  {
    id: 'pip',
    name: 'Philippa "Pip" Pell',
    role: 'Passenger, aged 9 · Cabin 11 · survived (in the record)',
    initials: 'PP',
    bio: [{ text: 'Draws everything, sleeps never. Overwound the singing bird on the first night.' }],
  },
  {
    id: 'vasseur',
    name: 'Madame Odile Vasseur',
    role: 'Illusionist · Cabin 8 · survived (in the record)',
    initials: 'OV',
    bio: [{ text: '"I have spent my life making people see what they expect to see."' }],
  },
  {
    id: 'dahl',
    name: 'Rolf Dahl',
    role: 'First Officer — in command',
    initials: 'RD',
    bio: [{ text: 'Took command when the captain was injured at 00:20. Believes the ship is off the coast heading home.' }],
  },
  {
    id: 'brekke',
    name: 'Capt. Halvard Brekke',
    role: 'Captain',
    initials: 'HB',
    bio: [{ text: 'Thrown against the chart table in the 00:20 turbulence; unconscious in his cabin. Begins every log entry with the word ALBATROSS.' }],
  },
  {
    id: 'finch',
    name: 'Percival Finch',
    role: 'Chief Steward · survived (in the record)',
    initials: 'PF',
    bio: [{ text: 'Keeps the master keys, the cloakroom book and the bar chits, and notices everything.' }],
  },
  {
    id: 'moen',
    name: 'Ivar Moen',
    role: 'Navigator',
    initials: 'IM',
    bio: [{ text: 'Keeps the chart. Trusts stars over officers.' }],
  },
  {
    id: 'haugen',
    name: 'Nils Haugen',
    role: 'Chief Engineer',
    initials: 'NH',
    bio: [{ text: 'Four engine cars, one of them dead since 01:07.' }],
  },
];
