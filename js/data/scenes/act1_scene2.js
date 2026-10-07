// Act I, Scene II: the court at Elsinore. Linear and fully voiced; text, speaker and audio for every
// box come from tools/act1_scene2_cues.py (via the generated cue list) so they cannot drift apart.
// Hamlet's state moves toward grief, suspicion and alienation; nothing is ever shown as a number, and
// nothing says whether his reading of the court is right.
import { a1s2Cues } from '../voice/act1_scene2.generated.js';

const L = (n, extra = {}) => {
  const c = a1s2Cues[n - 1];
  return { ...(c.speaker ? { speaker: c.speaker } : {}), kind: c.kind, text: c.text, voice: c.id, ...extra };
};

const hamletAlone = [
  { char: 'claudius', exit: 'slideRight', duration: 1400 },
  { char: 'gertrude', exit: 'slideRight', duration: 1600 },
];

export const act1Scene2 = {
  id: 'act1_scene2',
  act: 1,
  scene: 2,
  title: 'Act I, Scene II: The Court at Elsinore',
  background: { id: 'act1_scene2_court' },
  music: 'music_court_theme',
  ambient: 'ambient_castle_hall',
  perception: 'objective', // the world is plain; only the lighting around Hamlet tightens
  grade: { sat: 0.88, bright: 0.96, iso: 0.3, focus: 'hamlet' },
  characters: [{ char: 'hamlet', pos: 'farLeft', expression: 'neutral', opacity: 0.92 }],
  next: { scene: 'act1_scene4', transition: { type: 'slowBlur', duration: 3200 } },

  steps: [
    L(1),
    L(2, { set: { grief: 0.03, alienation: 0.03 } }),
    L(3, {
      show: [
        { char: 'claudius', pos: 'center', expression: 'neutral', enter: 'fade', duration: 1400 },
        { char: 'gertrude', pos: 'right', expression: 'neutral', enter: 'fade', duration: 1600 },
      ],
    }),
    L(4, { set: { suspicion: 0.03, grief: 0.02 } }),
    L(5),
    L(6),
    L(7, { set: { suspicion: 0.04, alienation: 0.03 }, expr: { hamlet: 'thoughtful' } }),
    L(8, { expr: { hamlet: 'determined' }, grade: { iso: 0.38 } }),
    L(9, { set: { suspicion: 0.05 } }),
    L(10, { set: { anger: 0.03 } }),
    L(11, { set: { anger: 0.03, alienation: 0.03 } }),
    L(12, { expr: { hamlet: 'neutral' } }),
    L(13),
    L(14, { expr: { claudius: 'thoughtful' } }),
    L(15),
    L(16, { expr: { gertrude: 'sad' } }),
    L(17),
    L(18, { grade: { iso: 0.42 } }),
    L(19),
    L(20),
    L(21, { set: { grief: 0.04 } }),
    // The tremor is given to Hamlet and to the room at once, so its source stays unclear.
    L(22, { charFx: [{ char: 'hamlet', motion: 'tremble' }] }),
    L(23, { fx: [{ type: 'tremor' }] }),
    L(24, { expr: { claudius: 'neutral', gertrude: 'neutral' }, charFx: [{ char: 'hamlet', motion: 'breathe' }], grade: { sat: 0.84 } }),
    L(25),
    L(26, { expr: { claudius: 'determined' } }),
    L(27, { expr: { hamlet: 'angry' }, set: { anger: 0.04, alienation: 0.04 } }),
    L(28, { expr: { claudius: 'neutral' }, grade: { iso: 0.5, sat: 0.8 } }),
    L(29),
    L(30),
    L(31, { fx: [{ type: 'gaze', char: 'claudius', ms: 2400 }], set: { suspicion: 0.06 } }),
    L(32, { set: { suspicion: 0.05, alienation: 0.03 } }),
    L(33, { expr: { hamlet: 'determined' }, set: { suspicion: 0.03 } }),
    L(34, { expr: { gertrude: 'sad' } }),
    L(35, { expr: { hamlet: 'neutral' } }),
    L(36, { set: { suspicion: 0.04, alienation: 0.04 }, expr: { hamlet: 'thoughtful' } }),
    L(37, { expr: { gertrude: 'neutral' } }),
    L(38),
    L(39, { hide: hamletAlone }),

    // The court has gone. Same hall, emptier and darker.
    L(40, {
      bg: { id: 'act1_scene2_pt2_court', transition: 'crossfade', duration: 2600 },
      expr: { hamlet: 'sad' },
      move: [{ char: 'hamlet', pos: 'left' }],
      grade: { sat: 0.72, bright: 0.9, iso: 0.55, ms: 3000 },
      set: { alienation: 0.04 },
    }),
    L(41),
    {
      kind: 'thought',
      text: 'The hall has emptied itself of everyone but the candles. His eyes go somewhere without asking him.',
      choices: [
        {
          id: 'regard_throne',
          text: 'The throne, still warm from someone else.',
          set: { grief: 0.04, suspicion: 0.05 },
          flags: { eyes_on_throne: true },
          then: [{ kind: 'thought', text: 'It looks smaller than it did. Or he does.' }],
        },
        {
          id: 'regard_door',
          text: 'The doors they all left through so easily.',
          set: { anger: 0.05, alienation: 0.05 },
          flags: { eyes_on_door: true },
          then: [{ kind: 'thought', text: 'No one looked back. Not once.' }],
        },
        {
          id: 'regard_hands',
          text: 'His own hands, which have not quite stopped.',
          set: { grief: 0.03, rationality: -0.03, paranoia: 0.02 },
          flags: { eyes_on_hands: true },
          then: [{ kind: 'thought', text: 'Grief, or something colder. He cannot tell which.' }],
        },
      ],
    },

    L(42, { expr: { hamlet: 'sad' }, grade: { iso: 0.62, sat: 0.7 } }),
    L(43),
    L(44),
    L(45),
    L(46),
    L(47),
    L(48),
    L(49),
    L(50),
    L(51),
    L(52),
    L(53),
    L(54, { expr: { hamlet: 'angry' }, fx: [{ type: 'redFlash', strength: 0.14, ms: 1400 }], set: { anger: 0.06 } }),
    L(55, { expr: { hamlet: 'angry' }, set: { grief: 0.04, anger: 0.04 } }),
    L(56, { expr: { hamlet: 'thoughtful' }, grade: { iso: 0.7 }, set: { suspicion: 0.05, paranoia: 0.04 } }),
    L(57, { set: { suspicion: 0.03 } }),
    L(58, {
      show: { char: 'horatio', pos: 'center', expression: 'neutral', enter: 'slideRight', duration: 1200 },
      expr: { hamlet: 'neutral' },
      grade: { iso: 0.4, sat: 0.78, ms: 2500 },
      set: { alienation: -0.05 },
    }),

    // Horatio, the one face that is not the court's.
    L(59),
    L(60),
    L(61),
    L(62),
    L(63),
    L(64),
    L(65),
    L(66),
    L(67, { expr: { horatio: 'sad' } }),
    L(68),
    L(69, { expr: { horatio: 'sad' } }),
    L(70, { expr: { horatio: 'neutral' } }),
    L(71, { expr: { hamlet: 'sad' } }),

    // Silent, and reflecting only where his attention went earlier.
    { if: { flag: 'eyes_on_throne' }, kind: 'narration', text: 'He does not look at the throne again. He is aware of it the whole time.' },
    { if: { flag: 'eyes_on_door' }, kind: 'narration', text: 'The doors stand open behind him. He keeps feeling the draught.' },
    { if: { flag: 'eyes_on_hands' }, kind: 'narration', text: 'His hands have quieted. He has not quite trusted them since.' },

    L(72, {
      show: [
        { char: 'marcellus', pos: 'right', expression: 'neutral', enter: 'fade', duration: 1200 },
        { char: 'bernardo', pos: 'farRight', expression: 'neutral', enter: 'fade', duration: 1400 },
      ],
      expr: { hamlet: 'thoughtful' },
      grade: { iso: 0.55, sat: 0.72, ms: 2200 },
      set: { suspicion: 0.07, paranoia: 0.04, alienation: 0.04 },
    }),
    L(73, { expr: { hamlet: 'surprised' } }),
    L(74),
    L(75, { expr: { hamlet: 'thoughtful' } }),
    L(76, { expr: { hamlet: 'thoughtful' }, set: { suspicion: 0.08, paranoia: 0.05 } }),
    L(77, { expr: { horatio: 'thoughtful' } }),
    L(78, { expr: { hamlet: 'sad' } }),
    L(79, { expr: { horatio: 'thoughtful' } }),
    L(80, { expr: { hamlet: 'surprised' } }),
    L(81, { expr: { horatio: 'determined' }, set: { certainty: 0.05 } }),
    // Both readings stay open: he is shown a reason to doubt, and a reason to doubt himself.
    L(82, {
      perception: null,
      set: { paranoia: 0.05, rationality: -0.04, realityDistortion: 0.05, certainty: 0.03 },
      grade: { iso: 0.62, sat: 0.66, bright: 0.88 },
    }),
    L(83, { set: { suspicion: 0.04 } }),
    L(84, { expr: { hamlet: 'surprised' } }),
    L(85, { expr: { horatio: 'determined' } }),
    L(86),
    L(87),
    L(88, { expr: { hamlet: 'neutral' } }),
    L(89),
    L(90, { expr: { bernardo: 'surprised' } }),
    L(91, { expr: { bernardo: 'neutral', hamlet: 'thoughtful' } }),
    L(92, { expr: { marcellus: 'sad' }, speakerName: 'Marcellus and Bernardo' }),
    L(93, { expr: { marcellus: 'neutral', hamlet: 'determined' } }),
    L(94, { expr: { horatio: 'neutral' } }),
    L(95, { expr: { hamlet: 'determined' } }),
    L(96),
    L(97, { expr: { hamlet: 'determined' },
      hide: [
        { char: 'horatio', exit: 'fade', duration: 1600 },
        { char: 'marcellus', exit: 'fade', duration: 1400 },
        { char: 'bernardo', exit: 'fade', duration: 1400 },
      ],
      grade: { iso: 0.78, sat: 0.58, bright: 0.82, ms: 3000 },
      set: { alienation: 0.06 },
    }),
    L(98, { expr: { hamlet: 'sad' }, move: [{ char: 'hamlet', pos: 'center' }], grade: { iso: 0.88, sat: 0.5, bright: 0.76, ms: 3500 }, set: { suspicion: 0.04 } }),
    L(99, { expr: { hamlet: 'determined' }, grade: { iso: 1, sat: 0.42, bright: 0.7, ms: 5000 }, set: { suspicion: 0.06, certainty: 0.06, alienation: 0.08 } }),
    {
      kind: 'narration',
      text: 'Elsinore keeps its candles burning. None of them reach him.',
      delay: 600,
      expr: { hamlet: 'sad' },
      grade: { iso: 1, sat: 0.38, bright: 0.66, ms: 4000 },
    },
  ],
};
