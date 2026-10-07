import { scenes, START_SCENE } from '../data/scenes/index.js';
import { assetInfo } from '../data/assetRegistry.js';

// Typing speed relative to the voice clip's length, per text-speed setting 1..4 (5 = instant).
const VOICE_SYNC = [0.75, 0.9, 1, 1.4];

const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const norm = (v, base = {}) => (typeof v === 'string' ? { ...base, type: v } : { ...base, ...v });

// Fields a variant may not override.
const STRUCTURAL = new Set(['when', 'choices', 'goto', 'label']);

export class Game {
  constructor(deps) {
    Object.assign(this, deps); // settings, state, audio, stage, transitions, dialogue, perception, saves
    this.ui = null;
    this.runId = 0;
    this.scene = null;
    this.stack = [];
    this.labels = {};
    this.checkpoint = null;
    this.sceneEntry = null;
    this.auto = false;
    this.skip = false;
    this.skipHeld = false;
    this._advance = null;
    this._wakers = new Set();
    this._restoring = false;
    this._silent = false;
    this.active = false;
    this.listeners = {};
    try { this.seen = new Set(JSON.parse(localStorage.getItem('hamlet.seen') || '[]')); } catch { this.seen = new Set(); }
    this.auto = this.settings.get('autoPlay');
  }

  on(n, f) { (this.listeners[n] ??= []).push(f); }
  emit(n, p) { this.listeners[n]?.forEach((f) => f(p)); }

  // ---------- public controls ----------
  newGame() {
    this.state.reset();
    this.dialogue.history.length = 0;
    this.perception.setOverride(null);
    this.audio.setMuffle(0, 0);
    return this.loadScene(START_SCENE, { transition: { type: 'fade', duration: 1400 }, fresh: true });
  }

  setAuto(v) { this.auto = v; this.settings.set('autoPlay', v); this.emit('modes'); }
  setSkip(v) { this.skip = v; this.emit('modes'); }
  get skipping() { return this.skip || this.skipHeld; }

  advance() {
    if (!this.active || this.ui.modalOpen || this.ui.choicesOpen) return;
    if (this.skip) this.setSkip(false);
    if (this.dialogue.typing) return this.dialogue.completeTyping();
    this._advance?.();
  }

  replayVoice() {
    const v = this.dialogue.current?.voice;
    if (v) this.audio.playVoice(v, { force: true });
  }

  pause() { this.audio.pauseAll(); }
  resume() { this.audio.resumeAll(); }

  quitToTitle() {
    this._cancel();
    this.runId++;
    this.active = false;
    this.audio.stopAll(500);
    this.dialogue.hide();
    this.stage.chars.clear();
    this.stage.setBackground(null);
    this.ui.showTitle();
  }

  restartScene() {
    if (!this.scene || !this.sceneEntry) return;
    return this.loadScene(this.scene.id, { stateSnap: this.sceneEntry, transition: { type: 'fade', duration: 700 } });
  }

  jumpTo(sceneId, startAt = 0) {
    return this.loadScene(sceneId, { startAt, instant: true });
  }

  resetState() {
    this.state.reset();
    this.perception.refresh();
    this.emit('state');
  }

  saveToSlot(slot) {
    if (!this.checkpoint) return false;
    return this.saves.write(slot, this.checkpoint, { title: this.scene?.title, act: this.scene?.act, scene: this.scene?.scene });
  }

  loadFromSlot(slot) {
    const d = this.saves.read(slot);
    if (!d) return false;
    this.loadCheckpoint(d.checkpoint);
    return true;
  }

  continueGame() {
    const l = this.saves.latest();
    return l ? this.loadFromSlot(l.slot) : false;
  }

  // ---------- scene lifecycle ----------
  _cancel() {
    [...this._wakers].forEach((f) => f());
    this._advance?.();
    this.ui?.cancelChoices();
  }

  async loadScene(id, opts = {}) {
    const scene = scenes[id];
    if (!scene) { console.error(`[game] unknown scene "${id}"`); return; }
    this._cancel();
    const token = ++this.runId;
    this.active = true;
    this.ui.hideAll();
    this.scene = scene;
    this.sceneEntry = opts.stateSnap ?? { state: this.state.serialize(), history: this.dialogue.history.slice(-120) };
    if (opts.stateSnap) { this.state.restore(opts.stateSnap.state); this.dialogue.history.splice(0, Infinity, ...opts.stateSnap.history); }
    this.stack = [{ steps: scene.steps, i: 0, via: null }];
    this._buildLabels();
    this.dialogue.hide();
    this.perception.setOverride(scene.perception);

    const enter = (m) => this._enterScene(scene, m);
    if (opts.transition && !opts.instant) {
      const t = this._tr(opts.transition);
      await this.transitions.cover(t.type, t.duration, enter);
    } else await enter({});
    if (token !== this.runId) return;

    if (opts.startAt) {
      this._silent = true;
      for (let k = 0; k < opts.startAt; k++) await this._stageChanges(scene.steps[k], {});
      this._silent = false;
      this.stack[0].i = opts.startAt;
    }
    this.run(token);
  }

  async _enterScene(scene, m) {
    if (!scene.keepCharacters) this.stage.chars.clear();
    const bg = typeof scene.background === 'string' ? scene.background : scene.background?.id;
    await this.stage.setBackground(bg ?? null, m);
    arr(scene.characters).forEach((c) => this.stage.chars.show(c.char, { enter: 'none', ...c }));
    this.stage.setGrade({ sat: 1, bright: 1, iso: 0, focus: 'hamlet', ...scene.grade }, scene.grade ? 0 : 1500);
    const audio = {};
    if ('music' in scene) audio.music = scene.music;
    if ('ambient' in scene) audio.ambient = scene.ambient;
    this._audioOps(audio, true);
  }

  _buildLabels() {
    this.labels = {};
    this.scene.steps.forEach((s, i) => { if (s.label) this.labels[s.label] = i; });
  }

  async loadCheckpoint(cp) {
    const scene = scenes[cp.sceneId];
    if (!scene) { console.error(`[game] save references unknown scene "${cp.sceneId}"`); return; }
    this._cancel();
    const token = ++this.runId;
    this.active = true;
    this.ui.hideAll();
    this.scene = scene;
    this.state.restore(cp.state);
    this.dialogue.history.splice(0, Infinity, ...(cp.history || []));
    this.sceneEntry = cp.sceneEntry ?? { state: cp.state, history: cp.history || [] };
    this.dialogue.hide();
    this.perception.setOverride(cp.stage?.perceptionOverride);
    this.audio.setMuffle(0, 0);
    await this.stage.restore(cp.stage);
    this._audioOps({ music: cp.stage?.music ?? null, ambient: cp.stage?.ambient ?? null }, true);
    const frames = [{ steps: scene.steps, i: cp.stack[0].i, via: null }];
    for (let k = 1; k < cp.stack.length; k++) {
      const { via, i } = cp.stack[k];
      frames.push({ steps: frames[k - 1].steps[via.s].choices[via.c].then, i, via });
    }
    this.stack = frames;
    this._buildLabels();
    this._restoring = true;
    if (token === this.runId) this.run(token);
  }

  _makeCheckpoint() {
    this.checkpoint = {
      sceneId: this.scene.id,
      stack: this.stack.map((f) => ({ i: f.i, via: f.via })),
      state: this.state.serialize(),
      history: this.dialogue.history.slice(-120),
      sceneEntry: this.sceneEntry,
      stage: { ...this.stage.snapshot(), music: this.audio.musicId, ambient: this.audio.ambientId, perceptionOverride: this.perception.override },
    };
    this.saves.write('auto', this.checkpoint, { title: this.scene.title, act: this.scene.act, scene: this.scene.scene });
  }

  // ---------- run loop ----------
  async run(token) {
    while (token === this.runId) {
      while (this.stack.length && this.stack.at(-1).i >= this.stack.at(-1).steps.length) this.stack.pop();
      if (!this.stack.length) return this._endScene(token);
      const frame = this.stack.at(-1);
      const step = frame.steps[frame.i];
      this._makeCheckpoint();
      frame.i++;
      let result;
      try { result = await this._exec(step, token, frame); } catch (e) { console.error('[game] step failed', step, e); }
      this._restoring = false;
      if (token !== this.runId) return;
      if (result?.goto) this._goto(result.goto, token);
      if (result?.stop) return;
    }
  }

  _goto(g, token) {
    if (typeof g === 'string') g = { label: g };
    if (g.scene) {
      this.loadScene(g.scene, { transition: g.transition });
      return;
    }
    const idx = this.labels[g.label];
    if (idx === undefined) { console.error(`[game] unknown label "${g.label}"`); return; }
    this.stack = [{ steps: this.scene.steps, i: idx, via: null }];
    void token;
  }

  async _endScene(token) {
    const next = this.scene.next;
    if (next) return this.loadScene(next.scene, { transition: next.transition ?? { type: 'fade', duration: 1400 } });
    if (token === this.runId) this.quitToTitle();
  }

  _tr(t) {
    const o = norm(t, { duration: 1200 });
    o.type = this.perception.transformTransition(o.type ?? 'fade');
    return o;
  }

  _resolve(step) {
    let eff = step;
    for (const v of step.variants ?? []) {
      if (this.state.test(v.when)) {
        eff = { ...step };
        for (const [k, val] of Object.entries(v)) if (!STRUCTURAL.has(k)) eff[k] = val;
        break;
      }
    }
    return eff;
  }

  async _exec(step, token, frame) {
    if (step.if && !this.state.test(step.if)) return;
    const eff = this._resolve(step);
    if ('perception' in eff) this.perception.setOverride(eff.perception);

    await this._applyStage(eff);
    if (token !== this.runId) return;
    this._audioOps(eff);

    if (eff.set) this.state.apply(eff.set);
    if (eff.flags) this.state.setFlags(eff.flags);
    if (eff.grade) this.stage.setGrade(eff.grade, eff.grade.ms ?? 2500);
    this.perception.refresh();
    this.emit('state');
    arr(eff.fx).forEach((f) => this.perception.run(f));

    const hasChoices = !!step.choices?.length;
    if (eff.text != null) await this._presentLine(eff, token, hasChoices);
    if (token !== this.runId) return;
    this.emit('step', { scene: this.scene, step });

    if (hasChoices) {
      const r = await this._presentChoices(step, token, frame);
      if (token !== this.runId) return;
      if (r?.goto) return { goto: r.goto };
    }
    if (eff.goto) return { goto: eff.goto };
    if (eff.end) { this.quitToTitle(); return { stop: true }; }
    if (eff.next) return { goto: { scene: eff.next.scene ?? eff.next, transition: eff.next.transition } };
  }

  // ---------- stage ----------
  async _applyStage(step) {
    const bg = step.bg ? (typeof step.bg === 'string' ? { id: step.bg } : step.bg) : null;
    const instant = this._restoring || this._silent;
    if (step.transition && !instant) {
      const t = this._tr(step.transition);
      await this.transitions.cover(t.type, t.duration, (m) => this._stageChanges(step, m));
    } else if (bg?.transition && !instant) {
      const t = this._tr({ type: bg.transition, duration: bg.duration ?? 1200 });
      await this.transitions.cover(t.type, t.duration, (m) => this.stage.setBackground(bg.id, m));
      await this._stageChanges({ ...step, bg: null }, {});
    } else await this._stageChanges(step, {});
  }

  async _stageChanges(step, m) {
    if (!step) return;
    const c = this.stage.chars;
    if (step.bg) {
      const id = typeof step.bg === 'string' ? step.bg : step.bg.id;
      await this.stage.setBackground(id, m);
    }
    if (step.clear) c.clear();
    arr(step.hide).forEach((h) => (typeof h === 'string' ? c.hide(h) : c.hide(h.char, h)));
    arr(step.show).forEach((s) => c.show(s.char, this._silent ? { ...s, enter: 'none' } : s));
    for (const [id, ex] of Object.entries(step.expr ?? {})) c.setExpression(id, ex);
    arr(step.move).forEach((mv) => c.move(mv.char, mv.pos));
    arr(step.charFx).forEach((f) => c.modify(f.char, f));
  }

  _audioOps(s, quiet = false) {
    const a = this.audio;
    if ('music' in s) {
      if (s.music == null) a.stopMusic(s.musicFade ?? 1500);
      else { const o = norm(s.music, {}); a.playMusic(o.id ?? o.type, { fade: o.fade ?? 1500, gain: o.gain ?? 1 }); }
    }
    if ('ambient' in s) {
      if (s.ambient == null) a.stopAmbient(s.ambientFade ?? 1500);
      else { const o = norm(s.ambient, {}); a.playAmbient(o.id ?? o.type, { fade: o.fade ?? 2000 }); }
    }
    if (quiet) return;
    arr(s.sfx).forEach((x) => { const o = norm(x, {}); a.playSfx(o.id ?? o.type, o); });
    if (s.muffle !== undefined) a.setMuffle(s.muffle, 800);
  }

  // ---------- dialogue ----------
  _key() {
    return `${this.scene.id}:${this.stack.map((f) => (f.via ? `${f.via.s}.${f.via.c}.` : '') + (f.i - 1)).join('/')}`;
  }

  async _presentLine(eff, token, noWait) {
    const key = this._key();
    if (eff.delay && !this.skipping) { await this._pause(eff.delay); if (token !== this.runId) return; }
    const kind = eff.kind ?? (eff.speaker ? 'speech' : 'narration');
    const line = { speaker: eff.speaker ?? (kind === 'thought' ? 'hamlet' : undefined), speakerName: eff.speakerName, text: eff.text, kind, voice: eff.voice };
    this.dialogue.addHistory({ speaker: eff.speakerName ?? line.speaker, text: eff.text, kind, voice: eff.voice });
    const typed = this.dialogue.show(line, { speedMul: eff.textSpeed ?? this.scene.textSpeed ?? 1, cps: this._voiceCps(eff) });
    if (eff.voice && !this.skipping) this.audio.playVoice(eff.voice);
    else this.audio.stopVoice();
    this._prefetchUpcoming();
    this.perception.tick();
    await typed;
    if (token !== this.runId || noWait) return;
    await this._awaitAdvance(token, key, eff.text.length, !!eff.voice);
    if (token === this.runId) this._markSeen(key);
  }

  // Finish typing just as the voice clip ends, so text and audio stay together.
  _voiceCps(eff) {
    const d = eff.voice && assetInfo('voice', eff.voice).duration;
    const level = this.settings.get('textSpeed');
    if (!d || level > 4 || eff.textSpeed) return undefined;
    return Math.min(120, Math.max(8, (eff.text.length / Math.max(0.6, d - 0.4)) * VOICE_SYNC[level - 1]));
  }

  _prefetchUpcoming() {
    const f = this.stack.at(-1);
    if (!f) return;
    for (const s of f.steps.slice(f.i, f.i + 3)) if (s.voice) this.audio.prefetch('voice', s.voice);
  }

  _markSeen(key) {
    if (this.seen.has(key)) return;
    this.seen.add(key);
    clearTimeout(this._seenTimer);
    this._seenTimer = setTimeout(() => localStorage.setItem('hamlet.seen', JSON.stringify([...this.seen])), 800);
  }

  _awaitAdvance(token, key, len, hasVoice) {
    return new Promise((res) => {
      let since = 0;
      const finish = () => { clearInterval(iv); if (this._advance === finish) this._advance = null; res(); };
      this._advance = finish;
      const iv = setInterval(() => {
        if (token !== this.runId) return finish();
        if (this.ui.modalOpen) { since = 0; return; }
        if (this.dialogue.typing) { if (this.skipping) this.dialogue.completeTyping(); return; }
        if (this.skipping) {
          if (this.settings.get('skipUnread') || this.seen.has(key)) return finish();
          if (this.skip) this.setSkip(false);
          return;
        }
        if (this.auto) {
          if (this.audio.isVoicePlaying()) { since = 0; return; }
          since ||= performance.now();
          if (performance.now() - since >= (hasVoice ? 350 : this.settings.get('autoDelay') * 1000 + len * 18)) finish();
        }
      }, 50);
    });
  }

  _pause(ms) {
    return new Promise((res) => {
      let t;
      const done = () => { clearTimeout(t); this._wakers.delete(done); res(); };
      t = setTimeout(done, ms);
      this._wakers.add(done);
    });
  }

  // ---------- choices ----------
  async _presentChoices(step, token, frame) {
    this.skip && this.setSkip(false);
    const options = step.choices
      .map((c, index) => ({ c: this._resolve(c), index }))
      .filter(({ c }) => this.state.test(c.requires) && !(c.hideIf && this.state.test(c.hideIf)));
    const picked = await this.ui.showChoices(options.map(({ c }) => ({ text: c.text })));
    if (token !== this.runId || picked == null) return;
    const { c, index } = options[picked];
    const orig = step.choices[index];
    this.state.choices.push(orig.id ?? `${this.scene.id}:${frame.i - 1}:${index}`);
    if (c.set) this.state.apply(c.set);
    if (c.flags) this.state.setFlags(c.flags);
    this.perception.refresh();
    this.emit('state');
    arr(c.fx).forEach((f) => this.perception.run(f));
    this._audioOps({ sfx: c.sfx });
    if (orig.then?.length) this.stack.push({ steps: orig.then, i: 0, via: { s: frame.i - 1, c: index } });
    return { goto: c.goto };
  }
}
