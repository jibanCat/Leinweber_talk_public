
const R0 = { logN: 12, profileOp: 0, swap: 0, captionOp: 1, release: 0, drain: 0, resolve: 0, atom: 0, motion: 0 };
export const REST = [R0];
REST.push({ ...REST[0], logN: 18.0, profileOp: 1 });
REST.push({ ...REST[1], logN: 19.7 });
REST.push({ ...REST[2], logN: 20.67 });
REST.push({ ...REST[3], atom: 1 });
REST.push({ ...REST[3], atom: 1, motion: 1 });
REST.push({ ...REST[3], swap: 1, profileOp: 0 });
REST.push({ ...REST[6], captionOp: 0, release: 1 });
REST.push({ ...REST[7], drain: 1 });
REST.push({ ...REST[8], resolve: 1 });

export const STEPS = [
  null,
  { dur: 2.6 },
  { dur: 2.4 },
  { dur: 2.6 },
  { dur: 3.6 },
  { dur: 7.0 },
  { dur: 3.4, curves: { atom: [[0, 0], [0.45, 1]], motion: [[0.45, 0], [0.46, 1]], swap: [[0.45, 0], [1, 1]], profileOp: [[0.45, 0], [1, 1]] } },
  { dur: 1.4 },
  { dur: 3.2, linear: ['drain'] },
  { dur: 1.8 },
];
export const LAST = REST.length - 1;

export function absorberClass(logN) {
  if (logN < 14.5) return 'the forest';
  if (logN < 17.2) return 'a forest line';
  if (logN < 19.0) return 'Lyman-limit system';
  if (logN < 20.3) return 'sub-DLA';
  return 'damped Lyα absorber';
}
export function plainClass(logN) {
  if (logN < 14.5) return 'the forest';
  if (logN < 20.3) return 'one cloud, drawn in by hand';
  return 'one dense cloud, drawn in by hand';
}

const smootherstep = x => x * x * x * (x * (x * 6 - 15) + 10);
const lerp = (a, b, u) => (u === 0 ? a : u === 1 ? b : a + (b - a) * u);
function fraction(knots, s) {
  if (s <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    const [s1, u1] = knots[i];
    if (s <= s1) { const [s0, u0] = knots[i - 1], e = smootherstep((s - s0) / (s1 - s0)); return e === 1 ? u1 : u0 + (u1 - u0) * e; }
  }
  return knots[knots.length - 1][1];
}

export function pose(k, s) {
  if (k <= 0) return { ...REST[0] };
  const a = REST[k - 1], b = REST[k], step = STEPS[k], out = {};
  for (const key of Object.keys(b)) {
    const c = step.curves && step.curves[key];
    const u = c ? fraction(c, s) : step.linear && step.linear.includes(key) ? s : smootherstep(s);
    out[key] = lerp(a[key], b[key], u);
  }
  return out;
}
