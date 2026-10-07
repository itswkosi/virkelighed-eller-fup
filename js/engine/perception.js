import { assetUrl, registry } from '../data/assetRegistry.js';

const clamp = (v) => Math.min(1, Math.max(0, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Modes are visual treatments only; nothing here ever labels an event as real or imagined.
export class Perception {
  constructor({ state, stage, audio, settings, dialogue, root }) {
    Object.assign(this, { state, stage, audio, settings, dialogue, root });
    this.override = null; // scene/step-authored mode (e.g. 'objective' for deliberately normal moments)
    this.forced = null; // debug
    this.sinceLast = 99;
    this.lastFx = null;
    this.activeFx = new Set();
    this.refresh();
  }

  intensity() {
    const v = this.state.vars;
    return clamp(v.realityDistortion * 0.6 + v.paranoia * 0.25 + (1 - v.rationality) * 0.15);
  }

  derivedMode() {
    const i = this.intensity();
    return i < 0.18 ? 'objective' : i < 0.45 ? 'subjective' : 'distorted';
  }

  get mode() { return this.forced ?? this.override ?? this.derivedMode(); }

  refresh() {
    const m = this.mode;
    this.state.perception = m;
    document.body.dataset.perception = m;
    document.body.style.setProperty('--distortion', this.intensity().toFixed(2));
    return m;
  }

  setOverride(mode) { this.override = mode ?? null; this.refresh(); }
  setForced(mode) { this.forced = mode ?? null; this.refresh(); }

  // Occasionally turn a plain transition into part of Hamlet's perception.
  transformTransition(type) {
    if (this.override || this.forced === 'objective' || this.settings.get('reducedEffects')) return type;
    if (!['fade', 'crossfade'].includes(type)) return type;
    const m = this.mode;
    if (m === 'distorted' && Math.random() < 0.3) return pick(['dream', 'glitch', 'slowBlur']);
    if (m === 'subjective' && Math.random() < 0.1) return 'slowBlur';
    return type;
  }

  // Called once per presented line. Rare by design, with a cooldown, and weighted toward repeating motifs.
  tick() {
    this.sinceLast++;
    const mode = this.mode;
    if (this.override || mode === 'objective' || this.settings.get('reducedEffects')) return;
    const i = this.intensity();
    const distorted = mode === 'distorted';
    if (this.sinceLast < (distorted ? 2 : 4)) return;
    if (Math.random() > (distorted ? 0.12 + i * 0.3 : 0.03 + i * 0.12)) return;
    const anger = this.state.vars.anger;
    const pool = [
      ['candles', 2], ['shadow', 1], ['gaze', 3], ['colorShift', 2], ['pulse', 2], ['textDrift', 1],
      ...(anger > 0.55 ? [['redFlash', 3]] : []),
      ...(distorted ? [['warp', 2], ['ghost', 1], ['detailShift', 2], ['expression', 2], ['misplace', 1], ['glitch', 1], ['muffle', 2], ['prop', 1]] : []),
    ];
    let name = this.lastFx && Math.random() < 0.3 ? this.lastFx : null;
    if (!name) {
      const total = pool.reduce((s, [, w]) => s + w, 0);
      let r = Math.random() * total;
      for (const [n, w] of pool) { if ((r -= w) <= 0) { name = n; break; } }
    }
    this.sinceLast = 0;
    this.lastFx = name;
    this.run({ type: name });
  }

  names() { return Object.keys(this.fx); }

  run(spec) {
    const { type, ...opts } = typeof spec === 'string' ? { type: spec } : spec;
    const f = this.fx[type];
    if (!f) { console.warn(`[perception] unknown effect "${type}"`); return Promise.resolve(); }
    if (this.settings.get('reducedEffects') && !opts.force) return Promise.resolve();
    return f.call(this, opts);
  }

  _layerEl(cls, html = '') {
    const d = document.createElement('div');
    d.className = cls;
    d.innerHTML = html;
    this.stage.fxLayer.append(d);
    return d;
  }

  _transient(el, kf, ms) {
    return el.animate(kf, { duration: ms, easing: 'ease-in-out' }).finished.then(() => el.remove(), () => el.remove());
  }

  _targetChar(id) {
    const ids = this.stage.chars.ids();
    if (id && ids.includes(id)) return id;
    const others = ids.filter((c) => c !== 'hamlet');
    const pool = others.length ? others : ids;
    return pool.length ? pick(pool) : null;
  }

  fx = {
    async warp({ ms = 1600, amount = 14 } = {}) {
      const disp = document.getElementById('warp-disp');
      const bg = this.stage.bgLayer;
      if (!disp || this.activeFx.has('warp')) return;
      this.activeFx.add('warp');
      bg.style.filter = 'url(#warp-filter)';
      const t0 = performance.now();
      await new Promise((res) => {
        const tick = (now) => {
          const k = Math.min(1, (now - t0) / ms);
          disp.setAttribute('scale', (Math.sin(k * Math.PI) * amount).toFixed(2));
          if (k < 1) requestAnimationFrame(tick); else res();
        };
        requestAnimationFrame(tick);
      });
      bg.style.filter = '';
      this.activeFx.delete('warp');
    },

    async candles({ ms = 3500 } = {}) {
      const bgId = this.stage.current.bg;
      const spots = registry.backgrounds[bgId]?.candles ?? [{ x: 6, y: 55 }, { x: 94, y: 55 }];
      const wrap = this._layerEl('candles');
      spots.forEach((s) => {
        const f = document.createElement('div');
        f.className = 'flame';
        f.style.left = `${s.x}%`;
        f.style.top = `${s.y}%`;
        f.style.animationDelay = `${rand(0, 0.6)}s`;
        wrap.append(f);
      });
      await this._transient(wrap, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], ms);
    },

    async shadow({ ms = 2600, x = rand(8, 92) } = {}) {
      const s = this._layerEl('shadow-figure');
      s.style.left = `${x}%`;
      await this._transient(s, [{ opacity: 0 }, { opacity: 0.55, offset: 0.4 }, { opacity: 0 }], ms);
    },

    async colorShift({ ms = 3000, hue = rand(-25, 25) } = {}) {
      const bg = this.stage.bgLayer;
      await bg.animate([{ filter: 'none' }, { filter: `hue-rotate(${hue}deg) saturate(1.25) brightness(.92)`, offset: 0.4 }, { filter: 'none' }], { duration: ms }).finished.catch(() => {});
    },

    async redFlash({ ms = 900, strength = 0.35 } = {}) {
      const r = this._layerEl('red-flash');
      await this._transient(r, [{ opacity: 0 }, { opacity: strength, offset: 0.15 }, { opacity: strength * 0.3, offset: 0.4 }, { opacity: strength * 0.7, offset: 0.55 }, { opacity: 0 }], ms);
    },

    async ghost({ ms = 2600 } = {}) {
      const url = assetUrl('backgrounds', this.stage.current.bg);
      const g = this._layerEl('ghost-overlay');
      if (url) g.style.backgroundImage = `url("${url}")`;
      g.style.transform = `translate(${rand(-10, 10)}px, ${rand(-6, 6)}px) scale(1.03)`;
      await this._transient(g, [{ opacity: 0 }, { opacity: 0.16, offset: 0.4 }, { opacity: 0 }], ms);
    },

    async glitch({ ms = 260 } = {}) {
      const S = this.stage.root.querySelector('#stage');
      const kf = Array.from({ length: 8 }, (_, i) => (i % 2
        ? { transform: `translate(${rand(-14, 14)}px, 0) skewX(${rand(-4, 4)}deg)`, filter: `hue-rotate(${rand(-40, 40)}deg)` }
        : { transform: 'none', filter: 'none' }));
      await S.animate(kf, { duration: ms, easing: 'steps(8)' }).finished.catch(() => {});
    },

    async textDrift({ ms = 1800 } = {}) {
      const box = this.dialogue.box;
      box.classList.add('drift');
      await sleep(ms);
      box.classList.remove('drift');
    },

    async expression({ char, ms = 380 } = {}) {
      const id = this._targetChar(char);
      if (id) this.stage.chars.flicker(id, ms);
    },

    async misplace({ char, pos, ms = 700 } = {}) {
      const id = this._targetChar(char);
      if (!id) return;
      const free = this.stage.chars.freePositions(id);
      if (free.length) this.stage.chars.misplace(id, pos ?? pick(free), ms);
    },

    // A character appears to look directly at Hamlet.
    async gaze({ char, ms = 2600 } = {}) {
      const id = this._targetChar(char);
      if (!id) return;
      this.stage.chars.modify(id, { gaze: true });
      await sleep(ms);
      this.stage.chars.modify(id, { gaze: false });
    },

    async detailShift({ ms = 300 } = {}) {
      const alt = registry.backgrounds[this.stage.current.bg]?.alt;
      if (alt && assetUrl('backgrounds', alt)) this.stage.peekBackground(alt, ms);
    },

    async prop({ prop = 'prop_dagger', x = rand(15, 85), y = rand(55, 80), ms = 1500 } = {}) {
      const url = assetUrl('props', prop);
      const p = this._layerEl('prop');
      p.style.left = `${x}%`;
      p.style.top = `${y}%`;
      if (url) p.innerHTML = `<img src="${url}" alt="">`;
      await this._transient(p, [{ opacity: 0 }, { opacity: 0.6, offset: 0.3 }, { opacity: 0 }], ms);
    },

    async muffle({ amount = 0.8, ms = 3000 } = {}) {
      this.audio.setMuffle(amount, 700);
      await sleep(ms);
      this.audio.setMuffle(0, 1200);
    },

    // A fine tremor in the room itself; paired with a trembling sprite it leaves its source unclear.
    async tremor({ ms = 2600, amount = 1.6 } = {}) {
      const S = this.stage.root.querySelector('#stage');
      const kf = Array.from({ length: 24 }, (_, i) => ({ transform: `translate(${rand(-amount, amount)}px, ${rand(-amount, amount) / 2}px)`, offset: i / 23 }));
      kf[0].transform = kf.at(-1).transform = 'none';
      await S.animate(kf, { duration: ms, easing: 'linear' }).finished.catch(() => {});
    },

    async pulse({ ms = 2200 } = {}) {
      const v = this._layerEl('pulse');
      await this._transient(v, [{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0.4, offset: 0.5 }, { opacity: 0.9, offset: 0.65 }, { opacity: 0 }], ms);
    },
  };
}
