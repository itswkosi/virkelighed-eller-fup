import { testEngine } from './test_engine.js';
import { act1Scene2 } from './act1_scene2.js';
import { act1Scene4 } from './act1_scene4.js';
import { act1Scene5 } from './act1_scene5.js';
import { act2Scene1 } from './act2_scene1.js';
import { act3Scene2 } from './act3_scene2.js';

// Register scenes here. Adding a scene = one data file + one line below.
export const scenes = {
  [act1Scene2.id]: act1Scene2,
  [act1Scene4.id]: act1Scene4,
  [act1Scene5.id]: act1Scene5,
  [act2Scene1.id]: act2Scene1,
  [act3Scene2.id]: act3Scene2,
  [testEngine.id]: testEngine,
};

export const START_SCENE = 'act1_scene2';
