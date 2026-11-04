import { transmission, DV, CENTER } from '../ghosts-spike/ghosts.js';

export const LOGN = 20.67;
export function maskRange(cut = 0.2) {
  let lo = -1, hi = -1;
  for (let p = 0; p < 1389; p++) if (transmission(p * DV - CENTER, LOGN) < 1 - cut) { if (lo < 0) lo = p; hi = p; }
  return [lo, hi];
}

export const NEIGH3 = 1.4;
export const neighbourInk = (d, traceN, neighOp) =>
  Math.min(1, Math.min(1, Math.max(0, traceN - d + 1)) * neighOp * (1 - 0.75 * d / (traceN + 1)));

export const CUT_BAND = { tint: '#DDE5EE', rows: 3, fade: 0.45, tn: [1, 2.5] };
export function bandAmount(s) {
  const t = Math.min(1, Math.max(0, ((s.traceN || 0) - CUT_BAND.tn[0]) / (CUT_BAND.tn[1] - CUT_BAND.tn[0])));
  return t * t * (3 - 2 * t);
}
export function cutColumn(s, [lo, hi], hero, NX = 1389, NY = 480) {
  const x = p => (p + 0.5) / NX - 0.5, yHero = 0.5 - (hero + 0.5) / NY;
  const half = Math.min(CUT_BAND.rows, s.traceN || 0) * s.traceSpread + s.traceAmp / 2, fade = CUT_BAND.fade * s.traceSpread;
  return { x0: x(lo), x1: x(hi), top: yHero + half + fade, solidTop: yHero + half, solidBot: yHero - half, bot: yHero - half - fade,
    rowY: d => yHero - d * s.traceSpread, amp: s.traceAmp };
}
