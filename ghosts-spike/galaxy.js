import { PLOT_WIDTH, PLOT_H } from './ghosts.js';

export const GALAXY_LABEL = 'a galaxy (schematic)';
const GAS = [2.1, 1.25];
const TILT = -0.32;
const R_U = 3.4;
const CY = 0.22;
const INK = '#1F2732', MUTED = '#4A5566', SLATE = '#4A5464';

const ellipsePts = (cx, cy, rx, ry, rot, n = 64) => Array.from({ length: n + 1 }, (_, i) => {
  const t = (2 * Math.PI * i) / n, x = rx * Math.cos(t), y = ry * Math.sin(t);
  return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)];
});
const HALF_H = Math.hypot(GAS[0] * Math.sin(TILT), GAS[1] * Math.cos(TILT));
const HALF_W = Math.hypot(GAS[0] * Math.cos(TILT), GAS[1] * Math.sin(TILT));

export function galaxyGeom(W, H) {
  const u = Math.min(H / 100, 0.5625 * W / 100);
  const rw = PLOT_WIDTH * W, rh = PLOT_H * rw, x0 = (W - rw) / 2, y0 = (H - rh) / 2;
  const r = R_U * u, cx = x0 + 0.5 * rw, cy = y0 + Math.max(CY * rh, 1.2 * u + HALF_H * r);
  const px = Math.max(0.03 * H, 16);
  const baseline = cy + HALF_H * r + px / 3 + 0.76 * px;
  return { u, r, cx, cy, px, baseline, box: { x0: cx - HALF_W * r, x1: cx + HALF_W * r, y0: cy - HALF_H * r, y1: cy + HALF_H * r },
    plot: { x0, y0, rw, rh } };
}

export function drawGalaxy(g, G, a, la, serif) {
  if (!(a > 0) && !(la > 0)) return;
  const { u, r, cx, cy } = G;
  const path = (pts, close) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); if (close) g.closePath(); };
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  if (a > 0) {
    const gas = ellipsePts(cx, cy, GAS[0] * r, GAS[1] * r, TILT, 72);
    g.globalAlpha = 0.12 * a; g.fillStyle = SLATE; path(gas, true); g.fill();
    g.globalAlpha = 0.7 * a; g.strokeStyle = MUTED; g.lineWidth = Math.max(1, 0.12 * u); g.setLineDash([0.5 * u, 0.45 * u]);
    path(gas, true); g.stroke(); g.setLineDash([]);
    g.globalAlpha = 0.32 * a; g.fillStyle = SLATE; path(ellipsePts(cx, cy, r, 0.4 * r, TILT), true); g.fill();
    const proj = (x, y) => [cx + x * Math.cos(TILT) - 0.4 * y * Math.sin(TILT), cy + x * Math.sin(TILT) + 0.4 * y * Math.cos(TILT)];
    g.globalAlpha = 0.75 * a; g.strokeStyle = INK; g.lineWidth = Math.max(1, 0.16 * u);
    for (const ph of [0, Math.PI]) {
      path(Array.from({ length: 40 }, (_, i) => {
        const t = (i / 39) * 1.7 * Math.PI, rr = Math.min(0.2 * r * Math.exp(0.3 * t), r);
        return proj(rr * Math.cos(t + ph), rr * Math.sin(t + ph));
      }));
      g.stroke();
    }
    g.globalAlpha = a; g.fillStyle = INK; path(ellipsePts(cx, cy, 0.24 * r, 0.16 * r, TILT), true); g.fill();
  }
  if (la > 0) {
    g.globalAlpha = la; g.fillStyle = MUTED; g.font = `italic 400 ${G.px.toFixed(2)}px ${serif}`; g.textAlign = 'center';
    g.fillText(GALAXY_LABEL, cx, G.baseline);
  }
  g.restore();
}

export function galaxyAmount(s) {
  const st = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const L = (s && s.logN) || 0, keep = 1 - Math.min(1, Math.max(0, (s && s.settle) || 0));
  return { a: st(20.3, 20.55, L) * keep, la: st(20.4, 20.62, L) * keep };
}
