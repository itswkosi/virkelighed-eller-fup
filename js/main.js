import { Settings } from './engine/settings.js';
import { GameState } from './engine/state.js';
import { AudioManager } from './engine/audio.js';
import { Stage } from './engine/stage.js';
import { Transitions } from './engine/transitions.js';
import { Dialogue } from './engine/dialogue.js';
import { Perception } from './engine/perception.js';
import { SaveManager } from './engine/save.js';
import { Game } from './engine/game.js';
import { UI } from './engine/ui.js';

const root = document.getElementById('app');
const settings = new Settings();
const state = new GameState();
const audio = new AudioManager(settings);
const stage = new Stage(root);
const transitions = new Transitions(root.querySelector('#stage'), root.querySelector('#transition-overlay'), settings);
const dialogue = new Dialogue(root, settings);
const perception = new Perception({ state, stage, audio, settings, dialogue, root });
const saves = new SaveManager();
const game = new Game({ settings, state, audio, stage, transitions, dialogue, perception, saves });
game.ui = new UI({ game, settings, saves, root });

// Debug tools load only on request: ?debug=1 or localStorage hamlet.debug = "1".
if (new URLSearchParams(location.search).has('debug') || localStorage.getItem('hamlet.debug') === '1') {
  import('./debug.js').then((m) => m.initDebug({ game, settings, state, audio, stage, transitions, perception, dialogue }));
}

window.hamlet = { game }; // console access
