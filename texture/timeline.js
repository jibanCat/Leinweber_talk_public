
const R0 = { rec: 1, zoom: 0, hot: 0, uv: 0, ghost: 0, wHot: 0, wUV: 0, plot: 0, draw: 0, band: 0, others: 1, wMock: 0 };
export const REST = [R0];
REST.push({ ...R0, zoom: 1, hot: 1, ghost: 1, wHot: 1 });
REST.push({ ...R0, zoom: 1, uv: 1, ghost: 1, wUV: 1 });
REST.push({ ...R0, rec: 0, plot: 1, draw: 1 });
REST.push({ ...REST[3], band: 1, others: 0, wMock: 1 });

export const STEPS = [
  null,
  { dur: 6.0, curves: { zoom: [[0, 0], [0.45, 1]], ghost: [[0.4, 0], [0.55, 1]], hot: [[0.5, 0], [1, 1]],
      wHot: [[0.55, 0], [0.8, 1]] } },
  { dur: 5.0, curves: { hot: [[0, 0], [0.4, 1]], wHot: [[0, 0], [0.25, 1]],
      uv: [[0.45, 0], [1, 1]], wUV: [[0.55, 0], [0.8, 1]] } },
  { dur: 7.0, linear: ['draw'], curves: { uv: [[0, 0], [0.2, 1]], wUV: [[0, 0], [0.15, 1]], ghost: [[0, 0], [0.2, 1]],
      zoom: [[0.05, 0], [0.3, 1]], rec: [[0.25, 0], [0.42, 1]], plot: [[0.35, 0], [0.55, 1]], draw: [[0.5, 0], [1, 1]] } },
  { dur: 4.5, curves: { band: [[0, 0], [0.4, 1]], wMock: [[0.25, 0], [0.55, 1]], others: [[0.5, 0], [0.9, 1]] } },
];
export const LAST = REST.length - 1;

const smootherstep = x => x * x * x * (x * (x * 6 - 15) + 10);
const lerp = (a, b, u) => (u === 0 ? a : u === 1 ? b : a + (b - a) * u);
function fraction(knots, s, linear) {
  if (s <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    const [s1, u1] = knots[i];
    if (s <= s1) {
      const [s0, u0] = knots[i - 1];
      const x = (s - s0) / (s1 - s0), e = linear ? x : smootherstep(x);
      return e === 1 ? u1 : u0 + (u1 - u0) * e;
    }
  }
  return knots[knots.length - 1][1];
}
const DEFAULT = [[0, 0], [1, 1]];

export function pose(k, s) {
  if (k <= 0) return { ...REST[0] };
  const a = REST[k - 1], b = REST[k], step = STEPS[k], out = {};
  for (const key of Object.keys(b)) {
    const linear = !!(step.linear && step.linear.includes(key));
    out[key] = lerp(a[key], b[key], fraction((step.curves && step.curves[key]) || DEFAULT, s, linear));
  }
  return out;
}
