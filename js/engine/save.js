const PREFIX = 'hamlet.save.';
export const SLOT_COUNT = 6;

export class SaveManager {
  keys() { return ['auto', ...Array.from({ length: SLOT_COUNT }, (_, i) => String(i + 1))]; }

  write(slot, checkpoint, meta) {
    const data = { version: 1, ts: Date.now(), meta, checkpoint };
    try {
      localStorage.setItem(PREFIX + slot, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[save] failed', e);
      return false;
    }
  }

  read(slot) {
    try { return JSON.parse(localStorage.getItem(PREFIX + slot) || 'null'); } catch { return null; }
  }

  list() { return this.keys().map((k) => ({ slot: k, data: this.read(k) })); }

  latest() {
    return this.list().filter((s) => s.data).sort((a, b) => b.data.ts - a.data.ts)[0] ?? null;
  }

  hasAny() { return !!this.latest(); }
}
