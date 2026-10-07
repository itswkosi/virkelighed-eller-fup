// Run: npm run check. Verifies scene data references known characters, assets, labels and scenes.
import { scenes } from '../js/data/scenes/index.js';
import { characters } from '../js/data/characters.js';
import { registry, listMissing } from '../js/data/assetRegistry.js';
import { existsSync } from 'node:fs';

const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const errors = [];
for (const [cat, items] of Object.entries(registry))
  for (const [id, e] of Object.entries(items)) { const f = typeof e === 'string' ? e : e.file; if (f && !existsSync(new URL(`../${f}`, import.meta.url))) errors.push(`registry ${cat}/${id}: file not found: ${f}`); }
const err = (scene, i, msg) => errors.push(`${scene.id}[${i}]: ${msg}`);
const asset = (scene, i, cat, id) => { if (id && !(id in registry[cat])) err(scene, i, `unknown ${cat} asset "${id}"`); };
const ident = (v) => (typeof v === 'string' ? v : v?.id);

function walk(scene, steps, labels, path) {
  steps.forEach((s, n) => {
    const i = `${path}${n}`;
    for (const v of [s, ...(s.variants ?? [])]) {
      asset(scene, i, 'voice', v.voice);
      arr(v.show).forEach((c) => { if (!characters[c.char]) err(scene, i, `unknown character "${c.char}"`); });
      arr(v.hide).forEach((c) => { if (!characters[ident(c) ?? c.char]) err(scene, i, `unknown hide "${ident(c)}"`); });
      if (v.speaker && !characters[v.speaker]) err(scene, i, `unknown speaker "${v.speaker}"`);
      if (v.bg) asset(scene, i, 'backgrounds', ident(v.bg));
      if ('music' in v && v.music) asset(scene, i, 'music', ident(v.music));
      if ('ambient' in v && v.ambient) asset(scene, i, 'ambient', ident(v.ambient));
      arr(v.sfx).forEach((x) => asset(scene, i, 'sfx', ident(x)));
    }
    const g = s.goto;
    if (g && typeof g === 'string' && !labels.has(g)) err(scene, i, `unknown label "${g}"`);
    if (g?.scene && !scenes[g.scene]) err(scene, i, `unknown scene "${g.scene}"`);
    (s.choices ?? []).forEach((c, k) => { if (c.then) walk(scene, c.then, labels, `${i}.${k}.`); });
  });
}

for (const scene of Object.values(scenes)) {
  asset(scene, 'scene', 'backgrounds', ident(scene.background));
  const labels = new Set(scene.steps.map((s) => s.label).filter(Boolean));
  walk(scene, scene.steps, labels, '');
  if (scene.next && !scenes[scene.next.scene]) err(scene, 'scene', `unknown next scene "${scene.next.scene}"`);
}

console.log(`${Object.keys(scenes).length} scene(s) checked.`);
console.log(`Placeholder assets awaiting files: ${listMissing().length}`);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('No data errors.');
