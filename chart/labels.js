import { measure, segmentHitsBox } from './kit.js';

const memo = new WeakMap();

function inside(px, py, L) {
  let c = false;
  for (let i = 0, j = L.length - 1; i < L.length; j = i++) {
    const [xi, yi] = L[i], [xj, yj] = L[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const overlaps = (a, b, pad) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

export function placeContourLabels(g, owner, layoutKey, items, P, u, obstacles = []) {
  const cache = owner ? memo.get(owner) || new Map() : null;
  if (cache && cache.has(layoutKey)) return cache.get(layoutKey);
  const placed = obstacles.map(b => ({ ...b })), out = {};
  const margin = 0.6 * u, pad = 0.5 * u, span = Math.hypot(P.w, P.h);
  const thin = L => { const st = Math.max(1, Math.ceil(L.length / 160)); return L.filter((_, i) => i % st === 0); };
  const cover = items.flatMap(it => it.outer || []).filter(L => L.length > 2).map(L => {
    const pts = thin(L).map(q => q.p), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return { pts, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  });
  const lines = items.flatMap(it => [...(it.outer || []), ...(it.inner || [])]).filter(L => L.length > 1).map(L => {
    const st = Math.max(1, Math.ceil(L.length / 160));
    const P2 = L.filter((_, i) => i % st === 0).map(q => q.p), xs = P2.map(p => p[0]), ys = P2.map(p => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    return { P2, bb: { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 } };
  });
  const crossings = box => {
    let n = 0;
    for (const { P2, bb } of lines) {
      if (!overlaps(box, bb, 0.2 * u)) continue;
      for (let i = 0; i < P2.length; i++) {
        const a = P2[i], b = P2[(i + 1) % P2.length];
        if (segmentHitsBox(a[0], a[1], b[0], b[1], box, 0.2 * u)) { n++; break; }
      }
    }
    return n;
  };
  for (const it of items) {
    if (it.ghost) continue;
    const lines = String(it.text).split('\n');
    const w = Math.max(...lines.map(L => measure(g, L, it.px, it.italic))), h = 1.05 * it.px + (lines.length - 1) * 1.15 * it.px;
    const pts = [];
    for (const L of [...(it.outer || []), ...(it.inner || [])]) {
      const poly = L.map(q => q.p);
      const n = L.length, step = Math.max(1, Math.floor(n / 40));
      for (let j = 0; j < n; j += step) {
        const p = L[j].p;
        if (!(p[0] > margin && p[0] < P.w - margin && p[1] > margin && p[1] < P.h - margin)) continue;
        const a = L[(j - 1 + n) % n].p, b = L[(j + 1) % n].p;
        let nx = b[1] - a[1], ny = -(b[0] - a[0]);
        const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
        if (inside(p[0] + 2 * nx, p[1] + 2 * ny, poly)) { nx = -nx; ny = -ny; }
        pts.push({ p, d: L[j].d, nx, ny });
      }
    }
    if (!pts.length) continue;
    const cx = pts.reduce((s, q) => s + q.p[0], 0) / pts.length, cy = pts.reduce((s, q) => s + q.p[1], 0) / pts.length;
    const far0 = it.toward ? q => (q.p[0] - cx) * it.toward[0] + (q.p[1] - cy) * it.toward[1] : q => Math.hypot(q.p[0] - cx, q.p[1] - cy);
    const prefer = pts.reduce((b, q) => (far0(q) > far0(b) ? q : b), pts[0]).p;
    let best = null;
    for (const q of pts) {
      const a = q.p;
      for (const turn of [0, 0.6, -0.6]) {
        const c = Math.cos(turn), sn = Math.sin(turn);
        const dx = q.nx * c - q.ny * sn, dy = q.nx * sn + q.ny * c;
        for (const far of [0, 1, 2, 3, 4]) {
          const gap = [0.7, 1.5, 2.5, 3.5, 5.0][far] * u;
          const t = Math.min(Math.abs(dx) > 1e-6 ? (w / 2 + gap) / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-6 ? (h / 2 + gap) / Math.abs(dy) : Infinity);
          const bx = a[0] + dx * t - w / 2, by = a[1] + dy * t - h / 2;
          const box = { x: bx, y: by, w, h };
          if (bx < 0.5 * u || by < 0.5 * u || bx + w > P.w - 0.5 * u || by + h > P.h - 0.5 * u) continue;
          if (placed.some(b => overlaps(box, b, pad))) continue;
          let cov = 0;
          for (const fx of [0.03, 0.27, 0.5, 0.73, 0.97]) for (const fy of [0.1, 0.5, 0.9]) {
            const sx = bx + fx * w, sy = by + fy * h;
            for (const L of cover) if (sx >= L.x0 && sx <= L.x1 && sy >= L.y0 && sy <= L.y1 && inside(sx, sy, L.pts)) cov++;
          }
          const base = 4 * cov + 3 * Math.hypot(a[0] - prefer[0], a[1] - prefer[1]) / span + 0.2 * Math.abs(turn) + 0.4 * far;
          if (best && base >= best.score) continue;
          const score = base + 100 * crossings(box);
          if (!best || score < best.score) best = { score, box, a, data: q.d, far };
        }
      }
    }
    if (globalThis.__labelDebug) globalThis.__labelDebug.push({ key: it.key, best: best && { score: best.score, box: best.box, cross: crossings(best.box), far: best.far }, n: pts.length });
    if (!best) continue;
    placed.push(best.box);
    out[it.key] = { box: best.box, anchor: best.a, data: best.data, off: [best.box.x - best.a[0], best.box.y - best.a[1]], leader: false };
  }
  if (cache) {
    if (cache.size > 32) cache.clear();
    cache.set(layoutKey, out);
    memo.set(owner, cache);
  }
  return out;
}
