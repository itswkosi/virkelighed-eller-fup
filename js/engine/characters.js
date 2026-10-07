import { characters } from '../data/characters.js';
import { assetUrl } from '../data/assetRegistry.js';

export const POS_X = { farLeft: 10, left: 22, center: 50, right: 78, farRight: 90 };

const placeholderSvg = (def, expression) => {
  const c = def?.color ?? '#888';
  return `<svg class="ph" viewBox="0 0 200 420" aria-hidden="true">
    <path d="M24 420 C24 330 66 300 100 294 C134 300 176 330 176 420Z" fill="${c}" fill-opacity=".55" stroke="${c}" stroke-opacity=".8"/>
    <rect x="88" y="236" width="24" height="60" fill="${c}" fill-opacity=".5"/>
    <ellipse cx="100" cy="190" rx="42" ry="54" fill="${c}" fill-opacity=".6" stroke="${c}" stroke-opacity=".8"/>
    <text x="100" y="372" text-anchor="middle" fill="#efe6d0" font-size="15">${def?.name ?? '?'}</text>
    <text x="100" y="392" text-anchor="middle" fill="#efe6d0" fill-opacity=".6" font-size="11">${expression} (placeholder)</text>
  </svg>`;
};

const ENTER = {
  fade: () => [{ opacity: 0 }, { opacity: 1 }],
  slideLeft: () => [{ opacity: 0, transform: 'translateX(-90px)' }, { opacity: 1, transform: 'none' }],
  slideRight: () => [{ opacity: 0, transform: 'translateX(90px)' }, { opacity: 1, transform: 'none' }],
  slideUp: () => [{ opacity: 0, transform: 'translateY(60px)' }, { opacity: 1, transform: 'none' }],
};
const reverse = (kf) => [...kf].reverse();

export class CharacterManager {
  constructor(layer) {
    this.layer = layer;
    this.map = new Map();
  }

  has(id) { return this.map.has(id); }
  ids() { return [...this.map.keys()]; }

  _art(rec) {
    const def = characters[rec.id];
    const sid = def?.sprites?.[rec.expression] ?? def?.sprites?.[def?.defaultExpression];
    const url = sid && assetUrl('sprites', sid);
    const art = rec.el.querySelector('.char-art');
    if (url) {
      const img = new Image();
      img.src = url;
      img.alt = '';
      img.draggable = false;
      art.replaceChildren(img);
    } else art.innerHTML = placeholderSvg(def, rec.expression);
  }

  _style(rec) {
    const { el } = rec;
    el.style.setProperty('--op', rec.opacity);
    el.style.setProperty('--dist', rec.distortion);
    el.classList.toggle('silhouette', rec.silhouette);
    el.dataset.motion = rec.motion;
    el.dataset.pos = rec.pos;
    el.style.left = `${POS_X[rec.pos] ?? 50}%`;
  }

  show(id, o = {}) {
    const def = characters[id];
    if (!def) { console.warn(`[characters] unknown character "${id}"`); return; }
    const existing = this.map.get(id);
    if (existing) {
      if (o.pos) this.move(id, o.pos);
      if (o.expression) this.setExpression(id, o.expression);
      this.modify(id, o);
      return;
    }
    const el = document.createElement('div');
    el.className = 'char';
    el.dataset.char = id;
    el.innerHTML = '<div class="char-inner"><div class="char-art"></div></div>';
    const rec = {
      id, el,
      pos: o.pos || 'center',
      expression: o.expression || def.defaultExpression,
      opacity: o.opacity ?? 1,
      distortion: o.distortion ?? 0,
      silhouette: !!o.silhouette,
      motion: o.motion || 'breathe',
    };
    this.map.set(id, rec);
    this.layer.append(el);
    this._art(rec);
    this._style(rec);
    const enter = o.enter ?? 'fade';
    if (enter !== 'none' && ENTER[enter]) {
      el.querySelector('.char-inner').animate(ENTER[enter](), { duration: o.duration ?? 600, easing: 'ease-out' });
    }
  }

  hide(id, { exit = 'fade', duration = 500 } = {}) {
    const rec = this.map.get(id);
    if (!rec) return;
    this.map.delete(id);
    const inner = rec.el.querySelector('.char-inner');
    if (exit === 'none' || !ENTER[exit]) return rec.el.remove();
    inner.animate(reverse(ENTER[exit]()), { duration, easing: 'ease-in', fill: 'forwards' }).finished
      .then(() => rec.el.remove(), () => rec.el.remove());
  }

  setExpression(id, expression, ms = 140) {
    const rec = this.map.get(id);
    if (!rec || rec.expression === expression) return;
    rec.expression = expression;
    const art = rec.el.querySelector('.char-art');
    art.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, fill: 'forwards' }).finished.then(() => {
      this._art(rec);
      art.getAnimations().forEach((a) => a.cancel());
      art.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms });
    }, () => {});
  }

  move(id, pos) {
    const rec = this.map.get(id);
    if (!rec) return;
    rec.pos = pos;
    this._style(rec);
  }

  modify(id, o = {}) {
    const rec = this.map.get(id);
    if (!rec) return;
    for (const k of ['opacity', 'distortion', 'silhouette', 'motion']) if (o[k] !== undefined) rec[k] = o[k];
    this._style(rec);
    if (o.gaze !== undefined) rec.el.classList.toggle('gaze', !!o.gaze);
  }

  // Brief wrong-expression flicker.
  flicker(id, ms = 380) {
    const rec = this.map.get(id);
    const def = characters[id];
    if (!rec || !def?.uncanny || rec.expression === def.uncanny) return;
    const prev = rec.expression;
    this.setExpression(id, def.uncanny, 60);
    setTimeout(() => this.map.get(id) === rec && this.setExpression(id, prev, 60), ms);
  }

  // Faint duplicate of a character at a position they do not occupy.
  misplace(id, pos, ms = 700) {
    const rec = this.map.get(id);
    if (!rec) return;
    const ghost = rec.el.cloneNode(true);
    ghost.classList.add('misplaced');
    ghost.style.left = `${POS_X[pos] ?? 50}%`;
    this.layer.append(ghost);
    ghost.animate([{ opacity: 0 }, { opacity: 0.35, offset: 0.3 }, { opacity: 0 }], { duration: ms }).finished
      .then(() => ghost.remove(), () => ghost.remove());
  }

  freePositions(id) {
    const rec = this.map.get(id);
    const used = new Set([...this.map.values()].map((r) => r.pos));
    return Object.keys(POS_X).filter((p) => !used.has(p) && p !== rec?.pos);
  }

  clear() {
    this.map.forEach((r) => r.el.remove());
    this.map.clear();
    this.layer.querySelectorAll('.misplaced').forEach((n) => n.remove());
  }

  snapshot() {
    return [...this.map.values()].map(({ id, pos, expression, opacity, distortion, silhouette, motion }) => ({ id, pos, expression, opacity, distortion, silhouette, motion }));
  }

  restore(snap = []) {
    this.clear();
    snap.forEach((s) => this.show(s.id, { ...s, enter: 'none' }));
  }
}
