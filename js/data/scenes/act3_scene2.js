// The Mousetrap. The play is a mirror held up to Claudius, and just as much to Hamlet:
// the players drift into their roles, the hall remembers other rooms, and a reaction that
// anyone might have becomes proof only because Hamlet needs it to. Nothing here confirms guilt.
// No recorded voice yet; every line is text-only.

const S = (speaker, text, extra = {}) => ({ speaker, kind: 'speech', text, ...extra });
const P = (who, text, extra = {}) => ({ speakerName: who, kind: 'speech', text, ...extra });
const T = (text, extra = {}) => ({ kind: 'thought', text, ...extra });
const N = (text, extra = {}) => ({ kind: 'narration', text, ...extra });

// A faint stand-in for a character the stage has no sprite for.
const echo = (char, pos, ms = 1800) => ({ type: 'misplace', char, pos, ms });
const kingShade = { show: { char: 'ghost', pos: 'center', expression: 'neutral', silhouette: true, opacity: 0.16, enter: 'fade', duration: 1400 } };
const kingGone = { hide: [{ char: 'ghost', exit: 'fade', duration: 1600 }] };

export const act3Scene2 = {
  id: 'act3_scene2',
  act: 3,
  scene: 2,
  title: 'Act III, Scene II: The Play',
  background: { id: 'act3_scene1_hall' },
  ambient: null,
  perception: null,
  grade: { sat: 0.82, bright: 0.85, iso: 0.3, focus: 'hamlet' },
  characters: [],
  steps: [
    N('The hall has been turned into a theater. Chairs in rows, a cloth hung for a stage, candles set too close to the edge of it.', {
      delay: 1800,
      show: [
        { char: 'hamlet', pos: 'left', expression: 'thoughtful', enter: 'fade', duration: 1400 },
        { char: 'horatio', pos: 'farLeft', expression: 'neutral', enter: 'fade', duration: 1400 },
        { char: 'claudius', pos: 'right', expression: 'neutral', enter: 'fade', duration: 1400 },
        { char: 'gertrude', pos: 'farRight', expression: 'neutral', enter: 'fade', duration: 1400 },
      ],
      music: { id: 'music_ghost_theme', fade: 8000, gain: 0.12 },
    }),

    S('hamlet', 'They are going to play something before the king. One scene I wrote myself, set into the middle of theirs. Horatio, I need your eyes tonight, and I need them honest.', { expr: { hamlet: 'determined' } }),
    S('horatio', 'My lord.'),
    S('hamlet', 'There is a scene that comes very near the circumstance I told you of my father’s death. When it begins, watch my uncle. If his hidden guilt does not come out at one speech, it is a damned ghost that we have seen, and my imaginations are as foul as Vulcan’s stithy.', { set: { suspicion: 0.03, certainty: 0.02 }, flags: { play_staged: true } }),
    S('horatio', 'Well, my lord. If he steal aught the whilst this play is playing, and scape detecting, I will pay the theft.'),
    N('Trumpets. The court comes in: the king, the queen, the courtiers. Hamlet takes the place he has chosen, where he can see one face and no other.', { sfx: [{ id: 'sfx_candle_gutter', volume: 0.4 }], move: [{ char: 'hamlet', pos: 'center' }], grade: { focus: 'hamlet', iso: 0.34, ms: 2500 } }),

    S('claudius', 'How fares our cousin Hamlet?'),
    S('hamlet', 'Excellent, i’ faith. Of the chameleon’s dish: I eat the air, promise-crammed. You cannot feed capons so.', { expr: { hamlet: 'neutral' } }),
    S('claudius', 'I have nothing with this answer, Hamlet. These words are not mine.', { expr: { claudius: 'thoughtful' } }),
    S('hamlet', 'No, nor mine now.', { set: { alienation: 0.02 } }),
    T('He is watching me the way you watch a man you have already decided about. Or he is only a king, being polite to his nephew.', { set: { suspicion: 0.02 } }),

    N('A dumb show first. A king and queen embrace. He lies down in an orchard. She leaves him, and a second man comes, takes the crown, and pours something into the sleeper’s ear.', {
      delay: 800,
      ...kingShade,
      fx: [echo('gertrude', 'center', 2400)],
      grade: { focus: 'claudius', iso: 0.4, ms: 3000 },
    }),
    N('Hamlet does not watch the poisoner. He watches the face in the audience that is watching the poisoner.', { expr: { hamlet: 'determined' }, set: { suspicion: 0.03, paranoia: 0.02 } }),
    N('Claudius watches the dumb show the way everyone does. Mildly puzzled. Politely.', { fx: [{ type: 'gaze', char: 'claudius', ms: 2000 }] }),
    S('gertrude', 'Why does he not tell us what this means?', { expr: { gertrude: 'thoughtful' } }),
    S('hamlet', 'They will tell all, they cannot keep counsel. They will tell all.', { expr: { hamlet: 'neutral' } }),

    // Within the play. The Player King and Queen speak; the hall remembers somewhere else.
    P('Player King', 'Full thirty times hath Phoebus’ cart gone round Neptune’s salt wash and Tellus’ orbed ground, since love our hearts and Hymen did our hands unite commutual in most sacred bands.', {
      delay: 600,
      bg: { id: 'act1_scene2_pt2_court', transition: 'crossfade', duration: 2200 },
      grade: { sat: 0.76, bright: 0.82, iso: 0.44, focus: 'claudius', ms: 2500 },
    }),
    P('Player Queen', 'So many journeys may the sun and moon make us again count o’er ere love be done. But woe is me, you are so sick of late, so far from cheer and from your former state, that I distrust you.', { fx: [echo('gertrude', 'center', 2600)] }),
    T('The painted court behind the players is the court from the day my father’s place was taken. It was not set that way. Was it?', { set: { realityDistortion: 0.03, paranoia: 0.02 } }),
    P('Player King', 'Faith, I must leave thee, love, and shortly too. My operant powers their functions leave to do. And thou shalt live in this fair world behind, honored, beloved.', { bg: { id: 'act3_scene1_hall', transition: 'crossfade', duration: 1800 } }),
    P('Player Queen', 'O, confound the rest! Such love must needs be treason in my breast. In second husband let me be accurst. None wed the second but who killed the first.', {
      expr: { gertrude: 'sad' },
      charFx: [{ char: 'gertrude', opacity: 0.85 }],
      set: { suspicion: 0.03, anger: 0.02 },
    }),
    S('hamlet', 'Wormwood, wormwood.', { expr: { hamlet: 'angry' }, fx: [{ type: 'gaze', char: 'claudius', ms: 2200 }] }),
    N('Beside the queen, Gertrude’s hands have gone still in her lap. It is a hard line for any widow to hear a stranger speak.', { expr: { gertrude: 'sad' } }),
    P('Player Queen', 'A second time I kill my husband dead, when second husband kisses me in bed.', { ...kingGone, set: { anger: 0.02 } }),

    {
      kind: 'thought',
      text: 'The play is under way and the whole court is turned toward it. Where do I look?',
      choices: [
        {
          id: 'watch_claudius',
          text: 'At him. Only at him.',
          set: { certainty: 0.05, suspicion: 0.04, paranoia: 0.03 },
          flags: { watched_claudius_only: true },
          then: [T('Everything else on the stage blurs. That is how you know it is working.')],
        },
        {
          id: 'watch_room',
          text: 'At the room. At all of them.',
          set: { rationality: 0.02, certainty: 0.02, suspicion: 0.02 },
          flags: { watched_the_room: true },
          then: [T('The whole court is watching a murder. They look as they should. And yet it is Claudius my eyes keep returning to.')],
        },
      ],
    },

    S('gertrude', 'The lady doth protest too much, methinks.', { expr: { gertrude: 'neutral' } }),
    S('hamlet', 'O, but she’ll keep her word.', { expr: { hamlet: 'neutral' }, set: { alienation: 0.02 } }),
    S('claudius', 'Have you heard the argument? Is there no offense in’t?', { expr: { claudius: 'thoughtful' } }),
    S('hamlet', 'No, no, they do but jest, poison in jest. No offense i’ the world.', { expr: { hamlet: 'determined' }, grade: { focus: 'claudius', iso: 0.55, bright: 0.78, ms: 3000 }, set: { paranoia: 0.03 } }),
    S('claudius', 'What do you call the play?', { fx: [{ type: 'gaze', char: 'claudius', ms: 1800 }] }),
    S('hamlet', 'The Mousetrap. Marry, how? Tropically. This play is the image of a murder done in Vienna. Gonzago is the duke’s name, his wife Baptista. You shall see anon. ’Tis a knavish piece of work, but what of that? Your majesty and we that have free souls, it touches us not.', {
      set: { certainty: 0.02, anger: 0.03 },
      sfx: [{ id: 'sfx_heartbeat', volume: 0.3 }],
    }),

    N('A new figure enters the playing space. The actor is dressed to look like a king’s nephew, and he moves as if he has done this before. Somewhere in the hall, someone could be mistaken for him.', {
      fx: [echo('hamlet', 'right', 2800)],
      grade: { sat: 0.66, bright: 0.74, iso: 0.62, focus: 'claudius', ms: 3500 },
      set: { realityDistortion: 0.04 },
    }),
    S('hamlet', 'This is one Lucianus, nephew to the king.', { expr: { hamlet: 'angry' }, set: { anger: 0.03 } }),
    S('gertrude', 'You are as good as a chorus, my lord.', { expr: { gertrude: 'thoughtful' } }),
    S('hamlet', 'Begin, murderer. Leave thy damnable faces and begin. Come: the croaking raven doth bellow for revenge.', {
      sfx: [{ id: 'sfx_heartbeat', volume: 0.45 }],
      fx: [{ type: 'pulse', ms: 2200 }],
      set: { certainty: 0.03, rationality: -0.02 },
    }),
    P('Lucianus', 'Thoughts black, hands apt, drugs fit, and time agreeing; confederate season, else no creature seeing. Thou mixture rank, of midnight weeds collected, with Hecate’s ban thrice blasted, thrice infected, thy natural magic and dire property on wholesome life usurp immediately.', {
      ...kingShade,
      bg: { id: 'act1_scene5_battlements', transition: 'dissolve', duration: 1100 },
      grade: { sat: 0.5, bright: 0.5, iso: 0.74, focus: 'claudius', ms: 1400 },
      fx: [{ type: 'muffle', amount: 0.35, ms: 3200 }, { type: 'tremor', ms: 1400, amount: 0.8 }],
    }),
    N('For a moment the stage is the battlements again, and the player lying in the orchard has a face Hamlet has seen before. Then the painted garden is only a painted garden.', {
      bg: { id: 'act3_scene1_hall', transition: 'crossfade', duration: 900 },
      grade: { sat: 0.72, bright: 0.72, iso: 0.7, focus: 'claudius', ms: 1500 },
      set: { realityDistortion: 0.04, paranoia: 0.03 },
    }),
    S('hamlet', 'He poisons him i’ the garden for his estate. His name’s Gonzago. The story is extant, and writ in choice Italian. You shall see anon how the murderer gets the love of Gonzago’s wife.', { expr: { hamlet: 'determined' }, set: { certainty: 0.03 } }),
    N('Claudius shifts in his chair. His hand goes to his collar. The room is warm, and the candles are too many, and the smoke has nowhere to go.', {
      expr: { claudius: 'surprised' },
      fx: [{ type: 'candles', ms: 3000 }, { type: 'gaze', char: 'claudius', ms: 2400 }],
      grade: { iso: 0.8, bright: 0.68, ms: 2000 },
    }),
    T('There. His color. His hand. The first thing he does is look for the door.', { set: { certainty: 0.06, suspicion: 0.05 } }),
    S('claudius', 'Give me some light. Away!', {
      expr: { claudius: 'angry' },
      sfx: [{ id: 'sfx_candle_gutter', volume: 0.6 }],
      fx: [{ type: 'redFlash', ms: 900, strength: 0.1 }],
    }),
    P('Polonius', 'Lights, lights, lights!'),
    N('Chairs scrape. Someone calls for torches. The players freeze mid-gesture, and the court breaks into a dozen voices.', {
      hide: [{ char: 'gertrude', exit: 'fade', duration: 1600 }],
      ...kingGone,
    }),

    // The certainty moment: the room does not change so much as Hamlet's reading of it does.
    N('Claudius stands, and he is white, and he is looking at nothing, at no one, at the dark above the stage. He is also a man whose wife has just been called a murderer’s prize in front of the court.', {
      transition: { type: 'flash', duration: 700 },
      bg: { id: 'act1_scene5_battlements' },
      grade: { sat: 0.28, bright: 0.34, iso: 0.9, focus: 'claudius', ms: 700 },
      show: { char: 'ghost', pos: 'right', expression: 'neutral', silhouette: true, opacity: 0.3, enter: 'none' },
      sfx: [{ id: 'sfx_vow_rumble', volume: 0.7 }, { id: 'sfx_heartbeat', volume: 0.7 }],
      fx: [{ type: 'warp', ms: 1800, amount: 9 }, { type: 'tremor', ms: 1400, amount: 1.4 }, { type: 'redFlash', ms: 1200, strength: 0.16 }],
      set: { certainty: 0.18, suspicion: 0.1, paranoia: 0.06, realityDistortion: 0.12, rationality: -0.05 },
      flags: { claudius_confirmed_guilty: true },
    }),
    S('hamlet', 'I know.', {
      expr: { hamlet: 'determined' },
      delay: 900,
      bg: { id: 'act3_scene1_hall', transition: 'crossfade', duration: 1600 },
      ...kingGone,
      grade: { sat: 0.82, bright: 0.85, iso: 0.5, focus: 'hamlet', ms: 2600 },
      fx: [{ type: 'muffle', amount: 0.2, ms: 2000 }],
    }),
    N('The hall is the hall again. The court has gone out in disorder, torches in the doorway, voices fading down the corridor. Horatio is the only one left.', {
      expr: { hamlet: 'neutral' },
      hide: [{ char: 'claudius', exit: 'fade', duration: 1800 }],
      move: [{ char: 'horatio', pos: 'right' }],
    }),

    S('hamlet', 'O good Horatio, I’ll take the ghost’s word for a thousand pound! Didst perceive?', { expr: { hamlet: 'determined' }, set: { certainty: 0.04 } }),
    S('horatio', 'Very well, my lord.', { expr: { horatio: 'thoughtful' } }),
    S('hamlet', 'Upon the talk of the poisoning?'),
    S('horatio', 'I did very well note him.', { expr: { horatio: 'neutral' } }),
    N('Horatio says it evenly, and he does not say what he noted. Hamlet takes the answer as he needs to, and does not ask a second time.', { set: { certainty: 0.04, trust: -0.02 } }),
    S('hamlet', 'Ah, ha! Come, some music! Come, the recorders!', { expr: { hamlet: 'surprised' }, grade: { bright: 0.92, ms: 2000 }, set: { rationality: -0.02 } }),
    T('For weeks I have only been afraid that I was wrong. Now I am not afraid of anything. He is guilty.', {
      expr: { hamlet: 'determined' },
      grade: { sat: 0.8, bright: 0.8, iso: 0.58, focus: 'hamlet', ms: 3500 },
      set: { certainty: 0.08, anger: 0.05 },
    }),
    T('He ran. Everyone saw it. Everyone will say so. And if some of them say it was only the heat, the smoke, the insult, they are the ones who have not seen what I have seen.', { set: { paranoia: 0.03, alienation: 0.04 } }),
    T('There is no more doubt in this room. There is no more doubt anywhere.', {
      flags: { act3_play_complete: true, hamlet_certain: true },
      end: true,
    }),
  ],
};
