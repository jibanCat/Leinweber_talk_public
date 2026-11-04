import { PLOT_WIDTH, PLOT_H, RECORD_HALFW } from '../ghosts-spike/ghosts.js';

export const RECORD = { fitW: 1, frameW: PLOT_WIDTH, traceAmp: PLOT_H, lineW: RECORD_HALFW / 1.1 };
export const RECORD_H = PLOT_H * PLOT_WIDTH;
export const ASPECT = 16 / 9;

const smootherstep = x => x * x * x * (x * (x * 6 - 15) + 10);
const lerp = (a, b, u) => a + (b - a) * u;
const effFrame = (s, aspect) => (s.fitW ? s.frame + (s.frameW * aspect - s.frame) * s.fitW : s.frame);
export const screenH = (s, aspect = ASPECT) => s.traceAmp * effFrame(s, aspect);

export function steadyAmpKnots(from, to, s0, s1, A, B, n = 24) {
  const h0 = screenH(from), h1 = screenH(to), out = [];
  for (let i = 0; i <= n; i++) {
    const e = smootherstep(i / n);
    const st = { fitW: lerp(from.fitW || 0, to.fitW || 0, e), frame: lerp(from.frame, to.frame, e), frameW: lerp(from.frameW, to.frameW, e) };
    out.push([s0 + (s1 - s0) * i / n, (lerp(h0, h1, e) / effFrame(st, ASPECT) - A) / (B - A)]);
  }
  return out;
}
