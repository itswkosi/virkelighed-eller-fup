import { CharacterManager, POS_X } from './characters.js';
import { assetUrl, assetInfo } from '../data/assetRegistry.js';

const GRADE_DEFAULT = { sat: 1, bright: 1, iso: 0, focus: 'hamlet' };

for (const [name, init] of [['--sat', '1'], ['--bright', '1'], ['--iso', '0'], ['--iso-x', '50']]) {
  try { CSS.registerProperty({ name, syntax: '<number>', inherits: true, initialValue: init }); } catch { /* already registered or unsupported */ }
}

export class Stage {
  constructor(root) {
    this.root = root;
    this.bgLayer = root.querySelector('#bg-layer');
    this.fxLayer = root.querySelector('#fx-layer');
    this.chars = new CharacterManager(root.querySelector('#characters'));
    this.current = { bg: null };
    this.grade = { ...GRADE_DEFAULT };
  }

  // Eases scene lighting: sat/bright 0..1, iso = darkness pooled around the focus character.
  setGrade(g = {}, ms = 2500) {
    this.grade = { ...this.grade, ...g };
    const { sat, bright, iso, focus } = this.grade;
    const pos = typeof focus === 'number' ? focus : POS_X[this.chars.map.get(focus)?.pos] ?? POS_X.farLeft;
    const s = this.root.style;
    s.setProperty('--grade-ms', `${ms}ms`);
    s.setProperty('--sat', sat);
    s.setProperty('--bright', bright);
    s.setProperty('--iso', iso);
    s.setProperty('--iso-x', pos);
  }

  _bgEl(id) {
    const d = document.createElement('div');
    d.className = 'bg';
    const url = assetUrl('backgrounds', id);
    if (url) d.style.backgroundImage = `url("${url}")`;
    else {
      d.classList.add('placeholder');
      const span = document.createElement('span');
      span.textContent = `Background placeholder: ${assetInfo('backgrounds', id).expected ?? id}`;
      d.append(span);
    }
    return d;
  }

  // layered=true cross-fades over the old background; otherwise swaps instantly (a transition covers it).
  async setBackground(id, { layered = false, ms = 1200, dissolve = false } = {}) {
    if (id == null) { this.bgLayer.replaceChildren(); this.current.bg = null; return; }
    const old = [...this.bgLayer.children];
    const el = this._bgEl(id);
    this.current.bg = id;
    if (!layered || !old.length) { this.bgLayer.replaceChildren(el); return; }
    el.style.opacity = 0;
    this.bgLayer.append(el);
    const blur = dissolve ? 'blur(14px)' : 'blur(0px)';
    old.forEach((o) => o.animate([{ opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: blur }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' }));
    await el.animate([{ opacity: 0, filter: blur }, { opacity: 1, filter: 'blur(0px)' }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' }).finished;
    el.getAnimations().forEach((a) => a.cancel());
    el.style.opacity = 1;
    old.forEach((o) => o.remove());
  }

  // Briefly show another background over the current one (details changing between lines).
  peekBackground(id, ms = 300) {
    const el = this._bgEl(id);
    el.classList.add('peek');
    this.bgLayer.append(el);
    setTimeout(() => el.remove(), ms);
  }

  snapshot() { return { bg: this.current.bg, chars: this.chars.snapshot(), grade: { ...this.grade } }; }

  async restore(s) {
    await this.setBackground(s?.bg ?? null);
    this.chars.restore(s?.chars ?? []);
    this.setGrade({ ...GRADE_DEFAULT, ...s?.grade }, 0);
  }
}
