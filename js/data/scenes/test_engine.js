// Engine test scene. Exercises dialogue, sprites, voice, choices, variants, perception and transitions.
// Step fields (all optional): text, speaker, speakerName, kind ('speech'|'thought'|'narration'), voice, textSpeed, delay,
// bg, transition, show, hide, expr, move, charFx, clear, music, ambient, sfx, muffle, fx, perception, set, flags,
// if, variants, choices, label, goto, end, next.
// `set` changes hidden 0..1 variables. `flags` hold world facts and interpretations alike; nothing labels either.

export const testEngine = {
  id: 'test_engine',
  act: 0,
  scene: 0,
  title: 'Engine Test: The Summoned Friends',
  background: { id: 'act1_scene2_court' },
  music: 'music_court_theme', // placeholder: silent until a file is registered
  ambient: 'ambient_castle_hall',
  textSpeed: 1,
  perception: 'objective', // opening is deliberately plain

  characters: [{ char: 'hamlet', pos: 'left', expression: 'neutral' }],

  steps: [
    // A fact about the world, hidden from Hamlet and from the player until a later scene chooses to reveal it.
    { flags: { world_summoned_by_king: true } },

    { text: 'The hall is warm, and full of people who are glad to see one another.', kind: 'narration', quiet: true },

    {
      speaker: 'claudius',
      text: 'Welcome, dear Rosencrantz and Guildenstern.',
      // Temporary: full Act 1 Scene 2 Pt 2 recording, used only to test voice playback and replay.
      voice: 'act1s2_pt2_full',
      show: [
        { char: 'claudius', pos: 'center', expression: 'neutral', enter: 'slideUp' },
        { char: 'rosencrantz', pos: 'right', expression: 'neutral', enter: 'slideLeft' },
      ],
    },
    {
      speaker: 'gertrude',
      text: 'Good gentlemen, he hath much talked of you.',
      show: { char: 'guildenstern', pos: 'farRight', expression: 'neutral', enter: 'fade' },
    },
    {
      speaker: 'rosencrantz',
      text: 'Both your Majesties might, by the sovereign power you have of us, put your dread pleasures more into command than to entreaty.',
      sfx: 'sfx_door_distant',
    },

    // From here the environment follows Hamlet's state.
    {
      perception: null,
      kind: 'thought',
      text: 'They answer too quickly. Or I listen too hard.',
      set: { suspicion: 0.08 },
      variants: [
        {
          when: { var: 'paranoia', gte: 0.3 },
          text: 'They answer too quickly. They have been taught the answers.',
        },
      ],
    },

    {
      kind: 'thought',
      text: 'What do I do with this unease?',
      choices: [
        {
          id: 'watch_glance',
          text: 'Watch how they look at one another.',
          set: { suspicion: 0.12, paranoia: 0.08, certainty: 0.06 },
          flags: { watched_glance: true },
          then: [
            {
              kind: 'thought',
              text: 'A glance passes between them. Short. Rehearsed? Or only the shared awkwardness of men who owe a courtesy.',
              fx: [{ type: 'candles' }, { type: 'gaze', char: 'rosencrantz' }],
              expr: { rosencrantz: 'thoughtful' },
            },
          ],
        },
        {
          id: 'greet_warmly',
          text: 'Take them by the hand, as old friends.',
          set: { trust: 0.1, suspicion: -0.02, rationality: -0.02 },
          then: [
            { speaker: 'hamlet', text: 'My excellent good friends! How dost thou, Guildenstern?', expr: { hamlet: 'neutral' } },
            { kind: 'thought', text: 'It is easy to be glad. It is easier when I do not look closely.', set: { grief: 0.04 } },
          ],
        },
        {
          id: 'say_nothing',
          text: 'Say nothing. Let the silence ask for me.',
          set: { anger: 0.06, grief: 0.04, certainty: 0.03 },
          flags: { held_silence: true },
          then: [
            { text: 'No one fills the pause, and no one seems to mind it.', kind: 'narration', fx: [{ type: 'pulse' }] },
          ],
        },
      ],
    },

    // The same line reads differently depending on what Hamlet has come to believe.
    {
      speaker: 'hamlet',
      text: 'Were you not sent for? Is it your own inclining? Is it a free visitation?',
      variants: [
        { when: { flag: 'watched_glance' }, text: 'Were you not sent for? Is it your own inclining? Come, deal justly with me.', expr: { hamlet: 'thoughtful' } },
        { when: { flag: 'held_silence' }, text: 'You are very quiet. Were you not sent for?', expr: { hamlet: 'thoughtful' } },
      ],
    },
    {
      speaker: 'rosencrantz',
      text: 'What say you?',
      expr: { rosencrantz: 'thoughtful' },
    },
    {
      kind: 'thought',
      text: 'There is a pause before he answers, and I cannot say what it holds.',
      variants: [
        {
          when: { all: [{ var: 'suspicion', gte: 0.3 }, { flag: 'watched_glance' }] },
          text: 'There is a pause before he answers. I have heard that pause before.',
        },
      ],
    },

    // Dream transition into another place, then back.
    {
      bg: { id: 'act1_scene4_battlements', transition: 'dream', duration: 2400 },
      ambient: 'ambient_wind_battlements',
      hide: ['claudius', 'rosencrantz', 'guildenstern'],
      kind: 'narration',
      text: 'Cold stone. I was not here a moment ago. I do not remember leaving.',
      set: { realityDistortion: 0.12 },
    },
    {
      show: { char: 'ghost', pos: 'right', expression: 'neutral', silhouette: true, opacity: 0.8, enter: 'fade', duration: 1600 },
      kind: 'thought',
      text: 'Someone stands where I am looking.',
      fx: [{ type: 'shadow', x: 80 }],
    },
    {
      bg: { id: 'act1_scene2_court', transition: 'crossfade', duration: 1800 },
      ambient: 'ambient_castle_hall',
      hide: ['ghost'],
      show: [
        { char: 'gertrude', pos: 'center', expression: 'neutral', enter: 'fade' },
        { char: 'rosencrantz', pos: 'right', expression: 'neutral', enter: 'fade' },
      ],
      speaker: 'gertrude',
      text: 'Hamlet, you are not listening.',
      fx: [{ type: 'detailShift', force: true }],
    },
    { kind: 'thought', text: 'Gertrude is speaking. I did not hear when she began.', set: { rationality: -0.04 }, fx: [{ type: 'muffle', amount: 0.6, ms: 2500 }] },

    // A hard cut with a glitch that Hamlet may or may not have caused.
    { transition: { type: 'glitch', duration: 600 }, clear: true, show: { char: 'hamlet', pos: 'left', expression: 'sad', enter: 'none' }, kind: 'narration', text: 'When the room settles it looks exactly as it did.' },

    {
      kind: 'narration',
      perception: 'objective',
      text: 'Whether they were sent, I will learn. Whether I will believe it is another matter.',
      variants: [
        { when: { var: 'suspicion', gte: 0.25 }, text: 'They were sent. Or I have already decided so. I will learn which.' },
      ],
    },
    { transition: { type: 'fade', duration: 1600 }, clear: true, kind: 'narration', text: 'End of engine test.' },
    { end: true },
  ],
};
