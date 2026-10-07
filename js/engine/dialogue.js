import { characters } from '../data/characters.js';

const SLOW = /[.!?]/;
const MID = /[,;:—]/;

export class Dialogue {
  constructor(root, settings) {
    this.settings = settings;
    this.box = root.querySelector('#textbox');
    this.nameEl = root.querySelector('#speaker');
    this.textEl = root.querySelector('#dialogue-text');
    this.srEl = root.querySelector('#sr-text');
    this.cont = root.querySelector('#continue');
    this.history = [];
    this.typing = false;
    this.current = null;
    this._timer = null;
    this.spans = [];
    this.box.hidden = true;
  }

  show(line, { speedMul = 1, cps: cpsOverride } = {}) {
    clearTimeout(this._timer);
    const kind = line.kind || 'speech';
    this.current = line;
    this.box.hidden = false;
    this.box.className = `kind-${kind}`;
    const name = line.speakerName ?? characters[line.speaker]?.name ?? line.speaker ?? '';
    const showName = !!name && (kind === 'speech' || line.speakerName);
    this.nameEl.hidden = !showName;
    this.nameEl.textContent = showName ? name : '';
    this.nameEl.style.setProperty('--speaker', characters[line.speaker]?.color ?? '#b8975a');
    this.srEl.textContent = `${showName ? `${name}: ` : ''}${line.text}`;
    this.cont.hidden = true;

    this.textEl.replaceChildren();
    this.spans = [];
    const chars = [];
    for (const [i, part] of line.text.split(/(\*[^*]+\*)/).entries()) {
      const em = part.startsWith('*') && part.endsWith('*') && part.length > 2;
      const host = em ? document.createElement('em') : this.textEl;
      for (const ch of em ? part.slice(1, -1) : part) {
        const s = document.createElement('span');
        s.className = 'c h';
        s.textContent = ch;
        host.append(s);
        this.spans.push(s);
        chars.push(ch);
      }
      if (em) this.textEl.append(host);
      void i;
    }

    const cps = cpsOverride ?? this.settings.cps() * speedMul;
    this.typing = true;
    this.done = new Promise((res) => { this._resolve = res; });
    if (!Number.isFinite(cps) || !this.spans.length) { this._finish(true); return this.done; }
    let i = 0;
    const step = () => {
      if (i >= this.spans.length) return this._finish();
      this.spans[i].classList.remove('h');
      const ch = chars[i++];
      const d = (1000 / cps) * (SLOW.test(ch) ? 7 : MID.test(ch) ? 3.5 : 1);
      this._timer = setTimeout(step, d);
    };
    step();
    return this.done;
  }

  _finish(revealAll = false) {
    clearTimeout(this._timer);
    if (revealAll) this.spans.forEach((s) => s.classList.remove('h'));
    this.typing = false;
    this.cont.hidden = false;
    this._resolve?.();
  }

  completeTyping() {
    if (!this.typing) return;
    this._finish(true);
  }

  hide() {
    clearTimeout(this._timer);
    this.typing = false;
    this.box.hidden = true;
    this._resolve?.();
  }

  addHistory(entry) {
    this.history.push(entry);
    if (this.history.length > 300) this.history.shift();
  }
}
