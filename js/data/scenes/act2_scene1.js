// Placeholder landing scene so Act I, Scene V has somewhere to transition to. Act II is not implemented yet.
export const act2Scene1 = {
  id: 'act2_scene1',
  act: 2,
  scene: 1,
  title: 'Act II',
  background: { id: 'act2_scene2_hall' },
  ambient: null,
  music: null,
  perception: null,
  grade: { sat: 0.6, bright: 0.5, iso: 0.3, focus: 'hamlet' },
  characters: [],
  steps: [
    { kind: 'narration', text: 'ACT II', delay: 1400 },
    { kind: 'narration', text: 'Elsinore does not change. Only the man walking through it does.', end: true },
  ],
};
