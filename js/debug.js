// Developer tools. Loaded only with ?debug=1; never part of the player experience.
import { scenes } from './data/scenes/index.js';
import { registry, listAssets, listMissing } from './data/assetRegistry.js';
import { TRANSITION_TYPES } from './engine/transitions.js';

const h = (tag, props = {}, ...kids) => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
};
const btn = (label, fn) => h('button', { textContent: label, onclick: fn });

export function initDebug({ game, state, audio, transitions, perception }) {
  const panel = h('aside', { id: 'debug-panel', hidden: true });
  document.body.append(panel);

  const sections = {};
  const section = (name) => {
    const d = h('details', { open: name !== 'Missing assets' }, h('summary', { textContent: name }));
    sections[name] = d;
    panel.append(d);
    return d;
  };

  // Scenes and lines
  const s1 = section('Scenes / lines');
  const sceneSel = h('select');
  Object.values(scenes).forEach((s) => sceneSel.append(h('option', { value: s.id, textContent: `${s.id} (${s.title})` })));
  const lineSel = h('select');
  const fillLines = () => {
    lineSel.replaceChildren();
    scenes[sceneSel.value].steps.forEach((st, i) => {
      lineSel.append(h('option', { value: i, textContent: `${i}: ${(st.text ?? (st.choices ? '[choices]' : '[no text]')).slice(0, 44)}` }));
    });
  };
  sceneSel.onchange = fillLines;
  fillLines();
  s1.append(sceneSel, lineSel, btn('Jump to line', () => { panel.hidden = true; game.ui.hideAll(); game.jumpTo(sceneSel.value, +lineSel.value); }), btn('Start scene', () => { game.ui.hideAll(); game.jumpTo(sceneSel.value, 0); }));

  // State
  const s2 = section('Hidden state');
  const stateBox = h('div');
  const flagsBox = h('pre');
  s2.append(stateBox, flagsBox, btn('Reset state', () => game.resetState()));
  const renderState = () => {
    stateBox.replaceChildren(...Object.keys(state.vars).map((k) => {
      const out = h('output', { textContent: state.vars[k].toFixed(2) });
      const r = h('input', { type: 'range', min: 0, max: 1, step: 0.01, value: state.vars[k], oninput: () => { state.vars[k] = +r.value; out.textContent = (+r.value).toFixed(2); perception.refresh(); } });
      return h('label', { className: 'dbg-row' }, h('span', { textContent: k }), r, out);
    }));
    flagsBox.textContent = `perception: ${state.perception} (intensity ${perception.intensity().toFixed(2)})\n${JSON.stringify(state.flags, null, 1)}`;
  };
  game.on('state', renderState);
  renderState();

  // Perception and effects
  const s3 = section('Perception / effects / transitions');
  s3.append(h('div', {}, 'Force mode: ', ...['auto', 'objective', 'subjective', 'distorted'].map((m) => btn(m, () => { perception.setForced(m === 'auto' ? null : m); renderState(); }))));
  s3.append(h('div', {}, 'Effects: ', ...perception.names().map((n) => btn(n, () => perception.run({ type: n, force: true })))));
  s3.append(h('div', {}, 'Transitions: ', ...TRANSITION_TYPES.map((t) => btn(t, () => transitions.cover(t, 1400, async () => {})))));

  // Audio
  const s4 = section('Audio');
  const catSel = h('select', {}, ...['music', 'ambient', 'voice', 'sfx'].map((c) => h('option', { value: c, textContent: c })));
  const idSel = h('select');
  const fillIds = () => { idSel.replaceChildren(...listAssets(catSel.value).map((i) => h('option', { value: i, textContent: `${i}${registry[catSel.value][i]?.file === null ? ' (placeholder)' : ''}` }))); };
  catSel.onchange = fillIds;
  fillIds();
  const play = () => {
    const c = catSel.value;
    const id = idSel.value;
    if (c === 'music') audio.playMusic(id); else if (c === 'ambient') audio.playAmbient(id);
    else if (c === 'voice') audio.playVoice(id, { force: true }); else audio.playSfx(id);
  };
  s4.append(catSel, idSel, btn('Play', play), btn('Stop', () => { const c = catSel.value; if (c === 'music') audio.stopMusic(); else if (c === 'ambient') audio.stopAmbient(); else if (c === 'voice') audio.stopVoice(); }),
    btn('Muffle on', () => audio.setMuffle(0.9)), btn('Muffle off', () => audio.setMuffle(0)), btn('Pause', () => audio.pauseAll()), btn('Resume', () => audio.resumeAll()));

  const s5 = section('Missing assets');
  s5.append(h('pre', { textContent: listMissing().map((m) => `${m.category}/${m.id} -> ${m.expected}`).join('\n') }));

  document.addEventListener('keydown', (e) => { if (e.key === '`') panel.hidden = !panel.hidden; });
  console.info('[debug] panel active. Press ` to toggle.');
}
