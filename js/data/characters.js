// Character definitions. `sprites` maps expression -> id in assetRegistry.sprites.
// `uncanny` is the expression used for brief perception glitches.

const def = (id, name, color, expressions = ['neutral', 'wary', 'uncanny']) => ({
  id,
  name,
  color,
  defaultExpression: 'neutral',
  uncanny: 'uncanny',
  sprites: Object.fromEntries(expressions.map((e) => [e, `${id}_${e}`])),
});

const FULL = ['neutral', 'sad', 'thoughtful', 'angry', 'determined', 'surprised'];

export const characters = {
  hamlet: { ...def('hamlet', 'Hamlet', '#8fa6d6', FULL), uncanny: 'surprised' },
  claudius: { ...def('claudius', 'Claudius', '#b8975a', FULL), uncanny: 'surprised' },
  gertrude: { ...def('gertrude', 'Gertrude', '#a8557a', FULL), uncanny: 'surprised' },
  rosencrantz: def('rosencrantz', 'Rosencrantz', '#7d9a86'),
  guildenstern: def('guildenstern', 'Guildenstern', '#8a8aa8'),
  horatio: { ...def('horatio', 'Horatio', '#8aa68f', FULL), uncanny: 'surprised' },
  laertes: { ...def('laertes', 'Laertes', '#a07a6a', FULL), uncanny: 'surprised' },
  marcellus: { ...def('marcellus', 'Marcellus', '#9a9a82', ['neutral', 'sad']), uncanny: 'sad' },
  bernardo: { ...def('bernardo', 'Bernardo', '#8f8fa0', ['neutral', 'surprised']), uncanny: 'surprised' },
  ghost: { ...def('ghost', 'Ghost', '#9fb4c9', ['neutral', 'haunted']), uncanny: 'haunted' },
};
