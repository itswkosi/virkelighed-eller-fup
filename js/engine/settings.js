const KEY = 'hamlet.settings.v1';

export const DEFAULTS = {
  textSpeed: 3, // 1..5
  master: 0.8,
  music: 0.6,
  voice: 1,
  sfx: 0.8,
  autoPlay: false,
  autoDelay: 1.2, // seconds after a line finishes
  skipUnread: false,
  reducedEffects: false,
  highContrast: false,
  largeText: false,
};

// Characters per second for each textSpeed level.
export const CPS = [14, 26, 42, 70, Infinity];

export class Settings {
  constructor() {
    this.listeners = [];
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* ignore corrupt data */ }
    this.values = { ...DEFAULTS, ...saved };
    if (matchMedia?.('(prefers-reduced-motion: reduce)').matches && saved.reducedEffects === undefined) this.values.reducedEffects = true;
  }
  get(k) { return this.values[k]; }
  set(k, v) {
    this.values[k] = v;
    localStorage.setItem(KEY, JSON.stringify(this.values));
    this.listeners.forEach((f) => f(k, v));
  }
  cps() { return CPS[this.values.textSpeed - 1] ?? CPS[2]; }
  onChange(f) { this.listeners.push(f); }
}
