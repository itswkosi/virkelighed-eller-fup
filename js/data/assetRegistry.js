import { a1s2Cues } from './voice/act1_scene2.generated.js';
import { a1s4Cues } from './voice/act1_scene4.generated.js';
import { a1s5Cues } from './voice/act1_scene5.generated.js';

// Single source of truth for every asset path. Scenes reference IDs only.
// Existing files stay where they are; change BASE or an entry's file to relocate.
// Entries: 'File Name.ext'  or  todo('expected/path.ext') for assets not yet supplied.

export const BASE = {
  backgrounds: '',
  sprites: '',
  voice: '',
  music: '',
  ambient: '',
  sfx: '',
  props: '',
};

// Placeholder: nothing is loaded; `expected` is the filename to drop in and register.
const todo = (expected, extra = {}) => ({ file: null, expected, ...extra });

const artSet = (name, expressions) =>
  Object.fromEntries(expressions.map((e) => [`${name}_${e}`, `characters/${name}/${name}_${e}.png`]));

const spriteSet = (name, expressions) =>
  Object.fromEntries(expressions.map((e) => [`${name}_${e}`, todo(`characters/${name}/${name}_${e}.png`)]));

export const registry = {
  backgrounds: {
    act1_scene2_court: { file: 'Act 1 Scene 2.png', alt: 'act1_scene2_pt2_court' },
    act1_scene2_pt2_court: {
      file: 'Act 1 Scene 2 Pt 2.png',
      candles: [{ x: 14, y: 55 }, { x: 28, y: 64 }, { x: 46.5, y: 58 }, { x: 67, y: 58 }, { x: 97, y: 55 }],
    },
    act1_scene4_battlements: 'Act 1 Scene 4.png',
    act1_scene5_battlements: 'Act 1 Scene 5.png',
    act2_scene2_hall: 'Act 2 Scene 2.png',
    act3_scene1_hall: 'Act 3 Scene 1.png',
    // Example of a placeholder background:
    act2_scene2_lobby: todo('backgrounds/act2_scene2_lobby.png'),
  },

  sprites: {
    // Cut-out art in characters/hamlet/ (originals remain in "character sprites/hamlet/").
    ...Object.fromEntries(['neutral', 'sad', 'thoughtful', 'angry', 'determined', 'surprised'].map((e) => [`hamlet_${e}`, `characters/hamlet/hamlet_${e}.png`])),
    ...artSet('claudius', ['neutral', 'sad', 'thoughtful', 'angry', 'determined', 'surprised']),
    ...artSet('gertrude', ['neutral', 'sad', 'thoughtful', 'angry', 'determined', 'surprised']),
    ...spriteSet('rosencrantz', ['neutral', 'wary', 'uncanny']),
    ...spriteSet('guildenstern', ['neutral', 'wary', 'uncanny']),
    ...artSet('horatio', ['neutral', 'sad', 'thoughtful', 'angry', 'determined', 'surprised']),
    ...artSet('laertes', ['neutral', 'sad', 'thoughtful', 'angry', 'determined', 'surprised']),
    ...artSet('marcellus', ['neutral', 'sad']),
    ...artSet('bernardo', ['neutral', 'surprised']),
    ghost_neutral: 'characters/ghost/ghost_neutral.png',
    ghost_haunted: 'characters/ghost/ghost_haunted.png',
  },

  voice: {
    act1s2_pt1_full: 'Act 1 Scene 2 Pt 1.mp3',
    act1s2_pt2_full: 'Act 1 Scene 2 Pt 2.mp3',
    // Full take is available; add per-line cue cuts before synchronizing it to dialogue.
    act1s4_full: 'Act 1 Scene 4.mp3',
    act1s5_pt1_full: 'Act 1 Scene 5 Pt 1.mp3',
    act1s5_pt2_full: 'Act 1 Scene 5 Pt 2.mp3',
    act1s5_pt3_full: 'Act 1 Scene 5 Pt 3.mp3',
    // One clip per dialogue box, cut from the recordings by tools/build_voice.py.
    ...Object.fromEntries([...a1s2Cues, ...a1s4Cues, ...a1s5Cues].map((c) => [c.id, { file: c.file, duration: c.duration }])),
  },

  music: {
    music_court_theme: todo('music/music_court_theme.mp3'),
    music_ghost_theme: 'music/music_ghost_theme.wav',
    music_unrest: todo('music/music_unrest.mp3'),
  },

  ambient: {
    ambient_castle_hall: todo('ambient/ambient_castle_hall.mp3'),
    // Synthesized stand-in from tools/build_ambience.py; overwrite with a real recording of the same name.
    ambient_wind_battlements: 'ambient/ambient_wind_battlements.wav',
  },

  sfx: {
    // Synthesized stand-ins from tools/build_ambience.py; overwrite with real recordings of the same name.
    sfx_candle_gutter: 'sfx/sfx_candle_gutter.wav',
    sfx_heartbeat: 'sfx/sfx_heartbeat.wav',
    sfx_vow_rumble: 'sfx/sfx_vow_rumble.wav',
    sfx_door_distant: todo('sfx/sfx_door_distant.mp3'),
  },

  props: {
    prop_dagger: todo('props/prop_dagger.png'),
    prop_skull: todo('props/prop_skull.png'),
  },
};

const entryFile = (e) => (typeof e === 'string' ? e : e?.file ?? null);

export function assetInfo(category, id) {
  const e = registry[category]?.[id];
  if (e === undefined) return { id, category, known: false, file: null, expected: null };
  return { id, category, known: true, file: entryFile(e), expected: e.expected ?? entryFile(e), ...(typeof e === 'object' ? e : {}) };
}

export function assetUrl(category, id) {
  const file = entryFile(registry[category]?.[id]);
  return file ? encodeURI((BASE[category] ?? '') + file) : null;
}

export const listAssets = (category) => Object.keys(registry[category] ?? {});

export function listMissing() {
  const out = [];
  for (const [cat, items] of Object.entries(registry))
    for (const [id, e] of Object.entries(items)) if (!entryFile(e)) out.push({ category: cat, id, expected: e.expected });
  return out;
}
