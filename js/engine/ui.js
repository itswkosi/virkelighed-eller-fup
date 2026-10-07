const SETTINGS_FIELDS = [
  { key: 'textSpeed', label: 'Text speed', type: 'range', min: 1, max: 5, step: 1, fmt: (v) => ['Slow', 'Gentle', 'Normal', 'Fast', 'Instant'][v - 1] },
  { key: 'master', label: 'Master volume', type: 'range', min: 0, max: 1, step: 0.05 },
  { key: 'music', label: 'Music volume', type: 'range', min: 0, max: 1, step: 0.05 },
  { key: 'voice', label: 'Voice volume', type: 'range', min: 0, max: 1, step: 0.05 },
  { key: 'sfx', label: 'Sound effects volume', type: 'range', min: 0, max: 1, step: 0.05 },
  { key: 'autoPlay', label: 'Auto-play', type: 'check' },
  { key: 'autoDelay', label: 'Auto-play pause (seconds)', type: 'range', min: 0.3, max: 4, step: 0.1 },
  { key: 'skipUnread', label: 'Skip unread text', type: 'check' },
  { key: 'reducedEffects', label: 'Reduce visual effects', type: 'check' },
  { key: 'highContrast', label: 'High contrast text', type: 'check' },
  { key: 'largeText', label: 'Large text', type: 'check' },
];

const $ = (sel, root = document) => root.querySelector(sel);

export class UI {
  constructor({ game, settings, saves, root }) {
    Object.assign(this, { game, settings, saves, root });
    this.panels = ['pause-menu', 'settings-panel', 'saveload-panel', 'history-panel'];
    this.stackOpen = []; // open modal ids
    this.choicesOpen = false;
    this._choiceResolve = null;
    this.title = $('#title-screen', root);
    this.hud = $('#hud', root);
    this.choicesEl = $('#choices', root);
    this._bind();
    this._applySettings();
    settings.onChange(() => this._applySettings());
    game.on('modes', () => this._syncModes());
    this._syncModes();
    this.showTitle();
  }

  get modalOpen() { return this.stackOpen.length > 0 || !this.title.hidden; }

  _bind() {
    this.root.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-act]');
      if (btn) return this._action(btn.dataset.act);
      if (e.target.closest('#choices, .screen, #hud')) return;
      this.game.audio.unlock();
      this.game.advance();
    });
    document.addEventListener('keydown', (e) => this._key(e));
    document.addEventListener('keyup', (e) => { if (e.key === 'Control') { this.game.skipHeld = false; } });
    document.addEventListener('pointerdown', () => this.game.audio.unlock(), { once: true });
  }

  _action(a) {
    const g = this.game;
    switch (a) {
      case 'new': this.title.hidden = true; g.audio.unlock(); g.newGame(); break;
      case 'continue': g.audio.unlock(); if (!g.continueGame()) this.showTitle(); break;
      case 'load': this.openSaveLoad('load'); break;
      case 'save': this.openSaveLoad('save'); break;
      case 'settings': this.open('settings-panel'); break;
      case 'history': this.openHistory(); break;
      case 'menu': this.open('pause-menu'); break;
      case 'resume': this.closeAll(); break;
      case 'restart': this.closeAll(); g.restartScene(); break;
      case 'title': this.closeAll(); g.quitToTitle(); break;
      case 'back': this.back(); break;
      case 'auto': g.setAuto(!g.auto); break;
      case 'skip': g.setSkip(!g.skip); break;
      case 'voice': g.replayVoice(); break;
      default: break;
    }
  }

  _key(e) {
    if (e.target.matches('input, select, textarea') || e.ctrlKey && e.key !== 'Control') return;
    const g = this.game;
    const onButton = e.target.matches('button');
    if (e.key === 'Escape') {
      if (this.stackOpen.length) this.back();
      else if (g.active && this.title.hidden) this.open('pause-menu');
      return;
    }
    if (this.modalOpen) return;
    if (this.choicesOpen) {
      const btns = [...this.choicesEl.querySelectorAll('button')];
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= btns.length) btns[n - 1].click();
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const i = btns.indexOf(document.activeElement);
        btns[(i + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length].focus();
      }
      return;
    }
    switch (e.key) {
      case ' ': case 'Enter': case 'ArrowRight':
        if (onButton) return;
        e.preventDefault(); g.audio.unlock(); g.advance(); break;
      case 'Control': g.skipHeld = true; break;
      case 'a': case 'A': g.setAuto(!g.auto); break;
      case 's': case 'S': g.setSkip(!g.skip); break;
      case 'h': case 'H': this.openHistory(); break;
      case 'v': case 'V': g.replayVoice(); break;
      default: break;
    }
  }

  _syncModes() {
    this.hud.querySelector('[data-act=auto]').setAttribute('aria-pressed', this.game.auto);
    this.hud.querySelector('[data-act=skip]').setAttribute('aria-pressed', this.game.skip);
  }

  _applySettings() {
    document.body.classList.toggle('high-contrast', this.settings.get('highContrast'));
    document.body.classList.toggle('large-text', this.settings.get('largeText'));
    document.body.classList.toggle('reduced-effects', this.settings.get('reducedEffects'));
    if (this.game.auto !== this.settings.get('autoPlay')) { this.game.auto = this.settings.get('autoPlay'); this._syncModes(); }
  }

  // ---------- screens ----------
  showTitle() {
    this.closeAll(true);
    this.hud.hidden = true;
    this.title.hidden = false;
    $('[data-act=continue]', this.title).disabled = !this.saves.hasAny();
    $('[data-act=new]', this.title).focus();
  }

  hideAll() {
    this.title.hidden = true;
    this.closeAll(true);
    this.hud.hidden = false;
    this.game.audio.resumeAll();
  }

  open(id) {
    if (this.stackOpen.at(-1) === id) return;
    const prev = this.stackOpen.at(-1);
    if (prev) $(`#${prev}`, this.root).hidden = true;
    else if (this.game.active) this.game.pause();
    this.stackOpen.push(id);
    if (id === 'settings-panel') this._renderSettings();
    const el = $(`#${id}`, this.root);
    el.hidden = false;
    (el.querySelector('input, button') ?? el).focus();
  }

  back() {
    const id = this.stackOpen.pop();
    if (!id) return;
    $(`#${id}`, this.root).hidden = true;
    const prev = this.stackOpen.at(-1);
    if (prev) $(`#${prev}`, this.root).hidden = false;
    else {
      if (this.game.active) this.game.resume();
      if (!this.title.hidden) $('[data-act=new]', this.title).focus();
    }
  }

  closeAll(silent = false) {
    const had = this.stackOpen.length > 0;
    this.stackOpen = [];
    this.panels.forEach((p) => { $(`#${p}`, this.root).hidden = true; });
    if (had && !silent && this.game.active) this.game.resume();
  }

  _renderSettings() {
    const body = $('#settings-body', this.root);
    body.replaceChildren();
    for (const f of SETTINGS_FIELDS) {
      const row = document.createElement('label');
      row.className = 'setting';
      const name = document.createElement('span');
      name.textContent = f.label;
      const input = document.createElement('input');
      const out = document.createElement('output');
      if (f.type === 'range') {
        Object.assign(input, { type: 'range', min: f.min, max: f.max, step: f.step, value: this.settings.get(f.key) });
        const show = () => { out.textContent = f.fmt ? f.fmt(+input.value) : f.max <= 1 ? `${Math.round(input.value * 100)}%` : input.value; };
        input.addEventListener('input', () => { this.settings.set(f.key, +input.value); show(); });
        show();
      } else {
        Object.assign(input, { type: 'checkbox', checked: this.settings.get(f.key) });
        input.addEventListener('change', () => this.settings.set(f.key, input.checked));
      }
      row.append(name, input, out);
      body.append(row);
    }
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'Keys: Space/Enter advance, A auto, S skip (or hold Ctrl), H history, V replay voice, Esc menu, 1-9 choose.';
    body.append(hint);
  }

  openSaveLoad(mode) {
    $('#saveload-title', this.root).textContent = mode === 'save' ? 'Save' : 'Load';
    const body = $('#saveload-body', this.root);
    body.replaceChildren();
    for (const { slot, data } of this.saves.list()) {
      const b = document.createElement('button');
      b.className = 'slot';
      const label = slot === 'auto' ? 'Autosave' : `Slot ${slot}`;
      b.innerHTML = `<strong>${label}</strong><span>${data ? `${data.meta?.title ?? 'Unknown scene'} &middot; ${new Date(data.ts).toLocaleString()}` : 'Empty'}</span>`;
      b.disabled = (mode === 'save' && slot === 'auto') || (mode === 'load' && !data);
      b.addEventListener('click', () => {
        if (mode === 'save') { this.game.saveToSlot(slot); this.openSaveLoad('save'); }
        else { this.closeAll(true); this.title.hidden = true; this.game.loadFromSlot(slot); }
      });
      body.append(b);
    }
    this.open('saveload-panel');
    if (this.stackOpen.at(-1) === 'saveload-panel') $('#saveload-panel', this.root).hidden = false;
  }

  openHistory() {
    const body = $('#history-body', this.root);
    body.replaceChildren();
    const h = this.game.dialogue.history;
    if (!h.length) body.textContent = 'Nothing has been said yet.';
    for (const e of h) {
      const d = document.createElement('div');
      d.className = `hist kind-${e.kind}`;
      const name = e.kind === 'speech' && e.speaker ? `${e.speaker[0].toUpperCase()}${e.speaker.slice(1)}` : '';
      d.innerHTML = '<b></b><span></span>';
      d.firstChild.textContent = name;
      d.lastChild.textContent = e.text;
      if (e.voice) {
        const r = document.createElement('button');
        r.textContent = 'Replay';
        r.addEventListener('click', () => this.game.audio.playVoice(e.voice, { force: true }));
        d.append(r);
      }
      body.append(d);
    }
    this.open('history-panel');
    body.scrollTop = body.scrollHeight;
  }

  // ---------- choices ----------
  showChoices(options) {
    return new Promise((resolve) => {
      this.choicesOpen = true;
      this._choiceResolve = resolve;
      this.choicesEl.replaceChildren();
      options.forEach((o, i) => {
        const b = document.createElement('button');
        b.className = 'choice';
        b.innerHTML = '<i></i><span></span>';
        b.firstChild.textContent = String(i + 1);
        b.lastChild.textContent = o.text;
        b.addEventListener('click', () => {
          this.cancelChoices(i);
        });
        this.choicesEl.append(b);
      });
      this.choicesEl.hidden = false;
      this.choicesEl.firstChild?.focus();
    });
  }

  cancelChoices(value = null) {
    if (!this._choiceResolve) return;
    const r = this._choiceResolve;
    this._choiceResolve = null;
    this.choicesOpen = false;
    this.choicesEl.hidden = true;
    this.choicesEl.replaceChildren();
    r(value);
  }
}
