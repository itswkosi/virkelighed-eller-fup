// Hidden psychological state. Values are 0..1 and are never shown to the player.
export const DEFAULT_VARS = {
  suspicion: 0.1,
  grief: 0.5,
  anger: 0.1,
  certainty: 0.1,
  trust: 0.5,
  paranoia: 0.05,
  rationality: 0.8,
  realityDistortion: 0,
  alienation: 0.2,
};

const clamp = (v) => Math.min(1, Math.max(0, v));

export class GameState {
  constructor() { this.reset(); }

  reset() {
    this.vars = { ...DEFAULT_VARS };
    this.flags = {}; // world facts and interpretation flags alike; never labelled for the player
    this.choices = [];
    this.perception = 'objective';
  }

  get(name) { return this.vars[name]; }

  apply(deltas = {}) {
    for (const [k, d] of Object.entries(deltas)) if (k in this.vars) this.vars[k] = clamp(this.vars[k] + d);
  }

  setFlags(flags = {}) { Object.assign(this.flags, flags); }

  // Condition forms: {var,gte|gt|lte|lt|eq}, {flag,value?}, {choice}, {perception}, {all:[]}, {any:[]}, {not}, or an array (all).
  test(c) {
    if (c == null) return true;
    if (Array.isArray(c)) return c.every((x) => this.test(x));
    if (c.all) return c.all.every((x) => this.test(x));
    if (c.any) return c.any.some((x) => this.test(x));
    if (c.not) return !this.test(c.not);
    if (c.var) {
      const v = this.vars[c.var];
      return (c.gte === undefined || v >= c.gte) && (c.gt === undefined || v > c.gt) &&
        (c.lte === undefined || v <= c.lte) && (c.lt === undefined || v < c.lt) && (c.eq === undefined || v === c.eq);
    }
    if (c.flag) return c.value === undefined ? !!this.flags[c.flag] : this.flags[c.flag] === c.value;
    if (c.choice) return this.choices.includes(c.choice);
    if (c.perception) return this.perception === c.perception;
    return true;
  }

  serialize() { return JSON.parse(JSON.stringify({ vars: this.vars, flags: this.flags, choices: this.choices })); }

  restore(d) {
    this.vars = { ...DEFAULT_VARS, ...d.vars };
    this.flags = { ...d.flags };
    this.choices = [...(d.choices || [])];
  }
}
