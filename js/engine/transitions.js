// Transitions cover the whole stage (not the UI). `swap` applies the change while hidden.
// swap receives {layered, ms, dissolve}; layered=true means the swap should cross-fade itself.

const anim = (el, kf, o) => el.animate(kf, { fill: 'forwards', easing: 'ease-in-out', ...o }).finished;

export const TRANSITION_TYPES = ['fade', 'crossfade', 'dissolve', 'flash', 'glitch', 'blackout', 'slowBlur', 'dream'];

export class Transitions {
  constructor(stageEl, overlayEl, settings) {
    this.stage = stageEl;
    this.overlay = overlayEl;
    this.settings = settings;
    this.busy = false;
  }

  _reset() {
    [this.stage, this.overlay].forEach((e) => e.getAnimations().forEach((a) => a.cancel()));
    this.stage.style.filter = '';
    this.overlay.style.opacity = 0;
  }

  async cover(type = 'fade', ms = 1000, swap = async () => {}) {
    if (this.settings.get('reducedEffects') && ['glitch', 'flash', 'dream', 'slowBlur'].includes(type)) type = 'fade';
    const o = this.overlay;
    const S = this.stage;
    const half = ms / 2;
    try {
      switch (type) {
        case 'crossfade':
        case 'dissolve':
          await swap({ layered: true, ms, dissolve: type === 'dissolve' });
          return;
        case 'flash':
          o.style.background = '#f4ecd8';
          await anim(o, [{ opacity: 0 }, { opacity: 1 }], { duration: 90 });
          await swap({});
          await anim(o, [{ opacity: 1 }, { opacity: 0 }], { duration: ms });
          break;
        case 'blackout':
          o.style.background = '#000';
          await anim(o, [{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
          await swap({});
          await new Promise((r) => setTimeout(r, ms * 0.5));
          await anim(o, [{ opacity: 1 }, { opacity: 0 }], { duration: ms * 0.8 });
          break;
        case 'glitch': {
          const jitter = (n) => Array.from({ length: n }, (_, i) => ({
            transform: i % 2 ? `translate(${(Math.random() - 0.5) * 24}px, ${(Math.random() - 0.5) * 6}px) skewX(${(Math.random() - 0.5) * 6}deg)` : 'none',
            filter: i % 3 === 0 ? `hue-rotate(${Math.random() * 90 - 45}deg) saturate(1.8)` : 'none',
          }));
          await anim(S, jitter(10), { duration: Math.min(380, half), easing: 'steps(10)' });
          await swap({});
          await anim(S, jitter(8), { duration: Math.min(300, half), easing: 'steps(8)' });
          S.getAnimations().forEach((a) => a.cancel());
          break;
        }
        case 'slowBlur':
          await anim(S, [{ filter: 'blur(0px) brightness(1)' }, { filter: 'blur(18px) brightness(.6)' }], { duration: half });
          await swap({});
          await anim(S, [{ filter: 'blur(18px) brightness(.6)' }, { filter: 'blur(0px) brightness(1)' }], { duration: half });
          break;
        case 'dream':
          o.style.background = 'radial-gradient(circle at 50% 45%, rgba(220,210,235,.75), rgba(40,30,70,.85))';
          await Promise.all([
            anim(S, [{ filter: 'blur(0px) saturate(1) hue-rotate(0deg)', transform: 'scale(1)' }, { filter: 'blur(10px) saturate(1.7) hue-rotate(35deg) brightness(1.3)', transform: 'scale(1.04)' }], { duration: half }),
            anim(o, [{ opacity: 0 }, { opacity: 0.8 }], { duration: half }),
          ]);
          await swap({});
          await Promise.all([
            anim(S, [{ filter: 'blur(10px) saturate(1.7) hue-rotate(35deg) brightness(1.3)', transform: 'scale(1.04)' }, { filter: 'blur(0px) saturate(1) hue-rotate(0deg)', transform: 'scale(1)' }], { duration: half }),
            anim(o, [{ opacity: 0.8 }, { opacity: 0 }], { duration: half }),
          ]);
          break;
        case 'fade':
        default:
          o.style.background = '#000';
          await anim(o, [{ opacity: 0 }, { opacity: 1 }], { duration: half });
          await swap({});
          await anim(o, [{ opacity: 1 }, { opacity: 0 }], { duration: half });
      }
    } finally {
      this._reset();
    }
  }
}
