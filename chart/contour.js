
export function isoLoops(x, y, f, t) {
  const nx = x.length, ny = y.length;
  if (nx < 2 || ny < 2) return [];
  const NX = nx + 2, NY = ny + 2;
  const X = i => x[Math.min(nx - 1, Math.max(0, i - 1))], Y = j => y[Math.min(ny - 1, Math.max(0, j - 1))];
  const V = (i, j) => (i === 0 || j === 0 || i === NX - 1 || j === NY - 1 ? -Infinity : f[j - 1][i - 1]);
  const val = new Float64Array(NX * NY);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const v = V(i, j);
    val[j * NX + i] = Number.isFinite(v) ? v : -Infinity;
  }
  const inside = n => val[n] >= t;
  const cross = (n0, n1) => {
    const a = val[n0], b = val[n1];
    let u = a === -Infinity ? 1 : b === -Infinity ? 0 : (t - a) / (b - a);
    u = Math.max(0, Math.min(1, u));
    const i0 = n0 % NX, j0 = (n0 - i0) / NX, i1 = n1 % NX, j1 = (n1 - i1) / NX;
    return { key: n0 < n1 ? `${n0}_${n1}` : `${n1}_${n0}`, p: [X(i0) + (X(i1) - X(i0)) * u, Y(j0) + (Y(j1) - Y(j0)) * u] };
  };
  const next = new Map();
  for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) {
    const C = [j * NX + i, j * NX + i + 1, (j + 1) * NX + i + 1, (j + 1) * NX + i];
    const ins = C.map(inside);
    if (ins.every(Boolean) || !ins.some(Boolean)) continue;
    const xs = [];
    for (let e = 0; e < 4; e++) {
      const n0 = C[e], n1 = C[(e + 1) % 4];
      if (ins[e] !== ins[(e + 1) % 4]) xs.push({ ...cross(n0, n1), exit: ins[e] });
    }
    const link = (a, b) => next.set(a.key, { to: b.key, p: a.p });
    if (xs.length === 2) {
      const ex = xs[0].exit ? xs[0] : xs[1], en = xs[0].exit ? xs[1] : xs[0];
      link(ex, en);
    } else {
      const mean = C.map(n => val[n]).map(v => (v === -Infinity ? t - 1e300 : v)).reduce((p, q) => p + q, 0) / 4;
      const connected = mean >= t;
      for (let k = 0; k < 4; k++) {
        if (!xs[k].exit) continue;
        link(xs[k], connected ? xs[(k + 1) % 4] : xs[(k + 3) % 4]);
      }
    }
  }
  const loops = [], seen = new Set();
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let k = start, guard = 0;
    while (!seen.has(k) && next.has(k) && guard++ < 1e7) {
      seen.add(k);
      const s = next.get(k);
      loop.push(s.p);
      k = s.to;
    }
    if (loop.length >= 3) loops.push(dedupe(loop));
  }
  return loops;
}

function dedupe(L) {
  const out = [];
  for (const p of L) {
    const q = out[out.length - 1];
    if (!q || Math.abs(q[0] - p[0]) > 1e-12 || Math.abs(q[1] - p[1]) > 1e-12) out.push(p);
  }
  if (out.length > 1) {
    const a = out[0], b = out[out.length - 1];
    if (Math.abs(a[0] - b[0]) < 1e-12 && Math.abs(a[1] - b[1]) < 1e-12) out.pop();
  }
  return out;
}

export function area(L) {
  let s = 0;
  for (let i = 0; i < L.length; i++) { const p = L[i], q = L[(i + 1) % L.length]; s += p[0] * q[1] - q[0] * p[1]; }
  return s / 2;
}

export function hpdLevels(f, masses) {
  const v = [];
  for (const row of f) for (const z of row) if (Number.isFinite(z) && z > 0) v.push(z);
  v.sort((a, b) => b - a);
  const total = v.reduce((a, b) => a + b, 0);
  return masses.map(m => {
    let acc = 0;
    for (const z of v) { acc += z; if (acc >= m * total) return z; }
    return v[v.length - 1];
  });
}

export function closePieces(pieces, span = [1, 1]) {
  const same = (p, q) => Math.abs(p[0] - q[0]) < 1e-12 && Math.abs(p[1] - q[1]) < 1e-12;
  const d = (p, q) => Math.hypot((p[0] - q[0]) / span[0], (p[1] - q[1]) / span[1]);
  const loops = [], open = [];
  for (const P of pieces) {
    if (!Array.isArray(P) || P.length < 2) continue;
    const L = P.map(p => [p[0], p[1]]);
    if (same(L[0], L[L.length - 1])) { L.pop(); if (L.length >= 3) loops.push(L); } else open.push(L);
  }
  const used = new Array(open.length).fill(false);
  for (let i = 0; i < open.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const loop = open[i].slice(), start = open[i][0];
    for (;;) {
      const end = loop[loop.length - 1];
      let best = -1, bd = d(end, start);
      for (let j = 0; j < open.length; j++) if (!used[j] && d(end, open[j][0]) < bd) { bd = d(end, open[j][0]); best = j; }
      if (best < 0) break;
      used[best] = true;
      loop.push(...open[best]);
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}
