export const BEAM_TIME = {"base": 16.0, "t_halo": 0.56026, "mag": 40, "in": 1.2, "hold": 2.4, "out": 1.2, "fps": 60, "morph": 4.5, "cam": {"w0": 120, "path": 480, "tip": [0, 1]}};
export const FLASH_S = 0.7;

const B = BEAM_TIME, ZDUR = B.in + B.hold + B.out;
const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
export function zoomOf(x) {
  if (x <= 0 || x >= ZDUR) return 0;
  if (x < B.in) return ease(x / B.in);
  if (x < B.in + B.hold) return 1;
  return 1 - ease((x - B.in - B.hold) / B.out);
}
const DX = 0.001, N = Math.round(ZDUR / DX);
const CUM = new Float64Array(N + 1);
for (let i = 1; i <= N; i++) CUM[i] = CUM[i - 1] + DX * 0.5 * (B.mag ** -zoomOf((i - 1) * DX) + B.mag ** -zoomOf(i * DX));
const cumAt = x => { const f = Math.min(N, Math.max(0, x / DX)), i = Math.min(N - 1, Math.floor(f)); return CUM[i] + (CUM[i + 1] - CUM[i]) * (f - i); };
const HALF = cumAt(B.in + 0.5 * B.hold);
export const ZOOM_AT = B.base * B.t_halo - HALF;
const T_OUT = (ZOOM_AT + CUM[N]) / B.base;
export const CLIP_DUR = ZOOM_AT + ZDUR + (1 - T_OUT) * B.base;
export const ZOOM_DUR = ZDUR, MORPH_DUR = B.morph;

export function beamAt(s) {
  const w = Math.min(1, Math.max(0, s)) * CLIP_DUR, x = w - ZOOM_AT;
  if (x <= 0) return { t: w / B.base, z: 0, u: 0 };
  if (x >= ZDUR) return { t: Math.min(1, T_OUT + (x - ZDUR) / B.base), z: 0, u: 1 };
  return { t: (ZOOM_AT + cumAt(x)) / B.base, z: zoomOf(x), u: x / ZDUR };
}
export function wallOf(t) {
  const w = t * B.base;
  if (w <= ZOOM_AT) return w;
  if (t >= T_OUT) return ZOOM_AT + ZDUR + (t - T_OUT) * B.base;
  const want = w - ZOOM_AT;
  let a = 0, b = N;
  while (b - a > 1) { const m = (a + b) >> 1; if (CUM[m] < want) a = m; else b = m; }
  const f = CUM[b] > CUM[a] ? (want - CUM[a]) / (CUM[b] - CUM[a]) : 0;
  return ZOOM_AT + (a + f) * DX;
}
export function viewAt(t, z, R) {
  const C = B.cam;
  let w = C.w0, cx = C.path * t - (C.tip[0] + C.tip[1] * t - 0.5) * C.w0, cz = R.z;
  if (z > 0) {
    const m = B.mag ** z, K = R.dla;
    cx = K[0] + (cx - K[0]) / m; cz = K[1] + (cz - K[1]) / m; w /= m;
  }
  return { cx, cz, w };
}
