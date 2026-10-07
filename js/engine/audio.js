import { assetUrl, assetInfo } from '../data/assetRegistry.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export class AudioManager {
  constructor(settings) {
    this.settings = settings;
    this.tracks = new Set();
    this.channels = { music: null, ambient: null };
    this.voice = null;
    this.sfxRecent = new Map();
    this.prefetched = new Map();
    this.warned = new Set();
    this.ctx = null;
    this.filters = {};
    this.muffle = 0;
    this.paused = false;
    this.onVoiceEnd = null;
    settings.onChange(() => this.refresh());
  }

  // WebAudio is only used for the "distant/muffled" filter and needs http(s); otherwise volume ducking is used.
  _ensureCtx() {
    if (this.ctx !== null) return this.ctx;
    if (location.protocol === 'file:' || !window.AudioContext) return (this.ctx = false);
    try {
      this.ctx = new AudioContext();
      for (const bus of ['music', 'ambient', 'voice', 'sfx']) {
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 20000;
        f.connect(this.ctx.destination);
        this.filters[bus] = f;
      }
    } catch { this.ctx = false; }
    return this.ctx;
  }

  unlock() {
    const c = this._ensureCtx();
    if (c && c.state === 'suspended') c.resume();
  }

  // Start loading a clip now so it plays with no gap when its dialogue box appears.
  prefetch(cat, id) {
    const key = `${cat}:${id}`;
    const url = assetUrl(cat, id);
    if (!url || this.prefetched.has(key)) return;
    const el = new Audio();
    el.preload = 'auto';
    el.src = url;
    this.prefetched.set(key, el);
  }

  _busVolume(bus) {
    const s = this.settings;
    const v = bus === 'music' ? s.get('music') : bus === 'voice' ? s.get('voice') : s.get('sfx');
    return v * s.get('master');
  }

  _apply(t) {
    const duck = 1 - 0.35 * this.muffle * (t.bus === 'voice' ? 0.4 : 1);
    t.el.volume = clamp(t.level * t.gain * this._busVolume(t.bus) * duck);
  }

  refresh() { this.tracks.forEach((t) => this._apply(t)); }

  _warn(cat, id) {
    const key = `${cat}:${id}`;
    if (this.warned.has(key)) return;
    this.warned.add(key);
    const info = assetInfo(cat, id);
    console.warn(`[audio] ${cat} "${id}" has no file${info.known ? ` (placeholder: ${info.expected})` : ' (not in registry)'}.`);
  }

  _make(cat, id, { loop = false, bus = cat, gain = 1 } = {}) {
    const url = assetUrl(cat, id);
    if (!url) { this._warn(cat, id); return null; }
    const el = this.prefetched.get(`${cat}:${id}`) ?? new Audio();
    this.prefetched.delete(`${cat}:${id}`);
    el.preload = 'auto';
    el.loop = loop;
    if (el.getAttribute('src') !== url) el.src = url;
    const t = { id, cat, bus, el, level: 0, gain, raf: 0, resolveFade: null, stopping: false };
    const ctx = this._ensureCtx();
    if (ctx) { try { ctx.createMediaElementSource(el).connect(this.filters[bus]); } catch { /* already routed */ } }
    this.tracks.add(t);
    this._apply(t);
    return t;
  }

  _fade(t, to, ms) {
    return new Promise((res) => {
      cancelAnimationFrame(t.raf);
      t.resolveFade?.();
      t.resolveFade = res;
      const from = t.level;
      const t0 = performance.now();
      if (ms <= 0 || from === to) { t.level = to; this._apply(t); t.resolveFade = null; return res(); }
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        t.level = from + (to - from) * k;
        this._apply(t);
        if (k < 1) t.raf = requestAnimationFrame(tick);
        else { t.resolveFade = null; res(); }
      };
      t.raf = requestAnimationFrame(tick);
    });
  }

  _play(t) { if (!this.paused) t.el.play().catch(() => {}); }

  _release(t) {
    cancelAnimationFrame(t.raf);
    t.el.pause();
    t.el.removeAttribute('src');
    this.tracks.delete(t);
  }

  async _stop(t, ms) {
    if (!t) return;
    t.stopping = true;
    await this._fade(t, 0, ms);
    this._release(t);
    for (const k of Object.keys(this.channels)) if (this.channels[k] === t) this.channels[k] = null;
    if (this.voice === t) this.voice = null;
  }

  // Music/ambient: starting a new id crossfades from the old one; the same id is ignored.
  _loop(channel, id, { fade = 1500, loop = true, gain = 1 } = {}) {
    const cur = this.channels[channel];
    if (cur && cur.id === id && !cur.stopping) return cur;
    if (cur) this._stop(cur, fade);
    const t = this._make(channel, id, { loop, bus: channel, gain });
    this.channels[channel] = t;
    if (t) { this._play(t); this._fade(t, 1, fade); }
    return t;
  }

  playMusic(id, o) { return this._loop('music', id, o); }
  stopMusic(fade = 1500) { return this._stop(this.channels.music, fade); }
  playAmbient(id, o) { return this._loop('ambient', id, o); }
  stopAmbient(fade = 1500) { return this._stop(this.channels.ambient, fade); }
  get musicId() { return this.channels.music && !this.channels.music.stopping ? this.channels.music.id : null; }
  get ambientId() { return this.channels.ambient && !this.channels.ambient.stopping ? this.channels.ambient.id : null; }

  // A clip already playing as voice is not restarted unless `force` (replay).
  playVoice(id, { force = false } = {}) {
    if (this.voice && this.voice.id === id && !this.voice.el.ended) {
      if (!force) return this.voice;
      this.voice.el.currentTime = 0;
      this._play(this.voice);
      return this.voice;
    }
    if (this.voice) this._stop(this.voice, 80);
    const t = this._make('voice', id, { bus: 'voice' });
    this.voice = t;
    if (!t) return null;
    t.level = 1;
    this._apply(t);
    t.el.onended = () => { this._release(t); if (this.voice === t) this.voice = null; this.onVoiceEnd?.(id); };
    this._play(t);
    return t;
  }

  stopVoice(fade = 120) { return this._stop(this.voice, fade); }
  isVoicePlaying() { return !!this.voice && !this.voice.stopping && !this.voice.el.ended && (!this.voice.el.paused || this.paused); }

  playSfx(id, { volume = 1, allowOverlap = false } = {}) {
    const now = performance.now();
    if (now - (this.sfxRecent.get(id) ?? -1e9) < 150) return null;
    if (!allowOverlap && [...this.tracks].some((t) => t.cat === 'sfx' && t.id === id && !t.el.ended)) return null;
    this.sfxRecent.set(id, now);
    const t = this._make('sfx', id, { bus: 'sfx', gain: volume });
    if (!t) return null;
    t.level = 1;
    this._apply(t);
    t.el.onended = () => this._release(t);
    this._play(t);
    return t;
  }

  pauseAll() { this.paused = true; this.tracks.forEach((t) => t.el.pause()); }
  resumeAll() {
    this.paused = false;
    this.unlock();
    this.tracks.forEach((t) => { if (!t.el.ended) t.el.play().catch(() => {}); });
  }

  stopAll(fade = 400) { [...this.tracks].forEach((t) => this._stop(t, fade)); }

  // 0 = clear, 1 = distant and dull. Applied to every bus.
  setMuffle(amount, ms = 800) {
    this.muffle = clamp(amount);
    this.refresh();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const [bus, f] of Object.entries(this.filters)) {
      const a = bus === 'voice' ? this.muffle * 0.5 : this.muffle;
      f.frequency.cancelScheduledValues(t);
      f.frequency.setTargetAtTime(20000 * Math.pow(0.02, a), t, Math.max(0.05, ms / 3000));
    }
  }
}
