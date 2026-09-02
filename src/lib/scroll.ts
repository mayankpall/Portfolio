/**
 * One scroll timeline, one rAF loop, many subscribers.
 *
 * The page is divided into "acts" — elements carrying `data-act`. The timeline
 * value `t` is a float where the integer part is the act index and the
 * fraction is progress through it, so `t = 2.4` means "40% through act 2".
 *
 * Act boundaries are measured from real element offsets rather than assumed
 * viewport multiples, so changing the length of any section cannot desync the
 * animation from the copy. Boundaries are re-measured on resize.
 *
 * Everything scroll-driven on this site reads from here. Two scroll listeners
 * competing to write transforms is how pages start dropping frames.
 */

export interface Timeline {
  /** Act index + progress within it. */
  t: number;
  /** Whole-page progress, 0 to 1. */
  g: number;
  /** Viewport height, cached. */
  vh: number;
}

type Subscriber = (tl: Timeline) => void;

const subscribers = new Set<Subscriber>();
let acts: HTMLElement[] = [];
let bounds: { top: number; height: number }[] = [];
let vh = 0;
let docHeight = 0;
let running = false;

/** Smooth, damped value so the scene never snaps on a scroll jump. */
let smoothT = 0;
let targetT = 0;
let started = false;

function measure() {
  vh = window.innerHeight;
  docHeight = document.documentElement.scrollHeight;
  acts = Array.from(document.querySelectorAll<HTMLElement>('[data-act]'));
  bounds = acts.map((el) => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top + window.scrollY, height: el.offsetHeight };
  });
}

/**
 * Maps scroll position to the act timeline. The viewport centre decides which
 * act is current — using the top edge makes short sections flicker between
 * acts as they enter.
 */
function computeT(scrollY: number): number {
  if (bounds.length === 0) return 0;
  const probe = scrollY + vh * 0.5;

  for (let i = 0; i < bounds.length; i++) {
    const { top, height } = bounds[i];
    if (probe >= top && probe < top + height) {
      return i + Math.min(1, Math.max(0, (probe - top) / height));
    }
  }

  // Above the first act or past the last one — clamp rather than wrap.
  return probe < bounds[0].top ? 0 : bounds.length - 1 + 1;
}

function loop() {
  const scrollY = window.scrollY;
  targetT = computeT(scrollY);

  // On the first frame, jump rather than easing in from zero — otherwise a
  // deep link or a restored scroll position animates the whole story at once.
  if (!started) {
    smoothT = targetT;
    started = true;
  } else {
    smoothT += (targetT - smoothT) * 0.09;
  }

  const g = docHeight > vh ? Math.min(1, Math.max(0, scrollY / (docHeight - vh))) : 0;
  const tl: Timeline = { t: smoothT, g, vh };

  subscribers.forEach((fn) => fn(tl));
  requestAnimationFrame(loop);
}

export function onScroll(fn: Subscriber): () => void {
  subscribers.add(fn);

  if (!running) {
    running = true;
    measure();

    // Re-measure on resize, and once more after fonts land — web fonts change
    // text height, which moves every act boundary below them.
    let resizeTimer: number;
    window.addEventListener(
      'resize',
      () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(measure, 150);
      },
      { passive: true },
    );
    document.fonts?.ready.then(() => measure());
    window.addEventListener('load', measure, { once: true });

    requestAnimationFrame(loop);
  }

  return () => subscribers.delete(fn);
}

/* ---------- Small maths helpers, shared by every subscriber ---------- */

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** Progress of `v` across [a, b], clamped. */
export const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a));

/** Ease-in-out. Used everywhere so nothing on the page moves linearly. */
export const smooth = (x: number) => {
  const c = clamp(x);
  return c * c * (3 - 2 * c);
};

/** Ramps up across [a,b] then back down across [c,d] — for fading panels. */
export const band = (v: number, a: number, b: number, c: number, d: number) =>
  Math.min(smooth(range(v, a, b)), 1 - smooth(range(v, c, d)));

export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
