
import { PLOT_WIDTH } from '../ghosts-spike/ghosts.js';
import { LW, DESI_CURVES } from '../program.js';

export const SAFE = { left: 0.04, right: 0.96, top: 0.175, bottom: 0.885 };
export const SAFE_FADE = 0.175, SAFE_INK = 0.18;
export const FAN_TOP = 0.19;
export const HERO_FRAME = { width: PLOT_WIDTH, y: 0.5 };
export function heroLine(qf, W, H, out = {}) {
  out.x0 = (1 - HERO_FRAME.width) / 2 * W; out.xq = (1 + HERO_FRAME.width) / 2 * W;
  out.x1 = out.x0 + (out.xq - out.x0) / qf; out.y = HERO_FRAME.y * H;
  return out;
}
export const PATCH_BOX = { x0: 0.04, x1: 0.485, y0: 0.235, y1: 0.85 };
export const LYA_BOX = DESI_CURVES ? PATCH_BOX : { x0: 0.2775, x1: 0.7225, y0: 0.235, y1: 0.85 };

export function newFrame() { return { k: 1, cx: 0, cy: 0, ox: 0, oy: 0, phi: 0 }; }

export function baseFrame(geo, W, H, out) {
  const [x0, y0, x1, y1] = geo.bbox;
  const aw = (SAFE.right - SAFE.left) * W, ah = (SAFE.bottom - FAN_TOP) * H;
  out.k = Math.min(aw / (x1 - x0), ah / (y1 - y0));
  out.cx = (x0 + x1) / 2; out.cy = (y0 + y1) / 2;
  out.ox = (SAFE.left + SAFE.right) / 2 * W; out.oy = (FAN_TOP + SAFE.bottom) / 2 * H;
  out.phi = 0;
  return out;
}

export function heroFrame(hero, W, H, out) {
  const rq = hero.rq > hero.rEnd ? hero.rq : hero.rEnd, rm = (hero.rStart + rq) / 2;
  out.k = HERO_FRAME.width * W / (rq - hero.rStart);
  out.cx = rm * Math.sin(hero.theta); out.cy = rm * Math.cos(hero.theta);
  out.ox = W / 2; out.oy = HERO_FRAME.y * H;
  out.phi = hero.theta + (LW ? Math.PI / 2 : -Math.PI / 2);
  return out;
}

export const FOLD = { angle: -12 * Math.PI / 180, box: { x0: 0.30, x1: 0.93, y0: 0.19, y1: 0.885 } };
export function foldFrame(geo, W, H, out) {
  const c = Math.cos(FOLD.angle), s = Math.sin(FOLD.angle);
  let bx0 = 0, bx1 = 0, by0 = 0, by1 = 0;
  for (let k = 0; k <= 64; k++) {
    const t = geo.theta0 + geo.span * k / 64, px = geo.rMax * Math.sin(t), py = geo.rMax * Math.cos(t);
    const qx = c * px - s * py, qy = s * px + c * py;
    if (qx < bx0) bx0 = qx; if (qx > bx1) bx1 = qx; if (qy < by0) by0 = qy; if (qy > by1) by1 = qy;
  }
  const B = FOLD.box;
  out.k = Math.min((B.x1 - B.x0) * W / (bx1 - bx0), (B.y1 - B.y0) * H / (by1 - by0));
  out.cx = 0; out.cy = 0;
  out.ox = B.x1 * W - out.k * bx1; out.oy = B.y1 * H + out.k * by0;
  out.phi = FOLD.angle;
  return out;
}

export function patchFrame(patch, W, H, out, box = PATCH_BOX) {
  const sh = Math.sin(patch.half), ch = Math.cos(patch.half);
  const w = 2 * patch.r1 * sh, h = patch.r1 - patch.r0 * ch, rho = (patch.r1 + patch.r0 * ch) / 2;
  const bw = (box.x1 - box.x0) * W, bh = (box.y1 - box.y0) * H;
  out.k = Math.min(bw / w, bh / h);
  out.cx = rho * Math.sin(patch.tc); out.cy = rho * Math.cos(patch.tc);
  out.ox = (box.x0 + box.x1) / 2 * W; out.oy = (box.y0 + box.y1) / 2 * H;
  out.phi = patch.tc;
  return out;
}

export function bothFrame(p1, p2, W, H, out, box = PATCH_BOX) {
  const tc = (p1.tc + p2.tc) / 2;
  let a0 = Infinity, a1 = -Infinity, c1 = 0;
  for (const p of [p1, p2]) for (const t of [p.ta, p.tb, p.tc]) for (const r of [p.r0, p.r1]) {
    a0 = Math.min(a0, r * Math.cos(t - tc)); a1 = Math.max(a1, r * Math.cos(t - tc)); c1 = Math.max(c1, Math.abs(r * Math.sin(t - tc)));
  }
  const bw = (box.x1 - box.x0) * W, bh = (box.y1 - box.y0) * H, rho = (a0 + a1) / 2;
  out.k = Math.min(bw / (2 * c1), bh / (a1 - a0));
  out.cx = rho * Math.sin(tc); out.cy = rho * Math.cos(tc);
  out.ox = (box.x0 + box.x1) / 2 * W; out.oy = (box.y0 + box.y1) / 2 * H;
  out.phi = tc;
  return out;
}
const MX = [0, 0], MY = [0, 0];
function mixFrame(F0, F1, t, ax, ay, out) {
  if (t <= 0) return Object.assign(out, F0);
  if (t >= 1) return Object.assign(out, F1);
  project(F0, ax, ay, MX); project(F1, ax, ay, MY);
  out.k = F0.k * Math.pow(F1.k / F0.k, t);
  out.cx = ax; out.cy = ay;
  out.ox = MX[0] + (MY[0] - MX[0]) * t; out.oy = MX[1] + (MY[1] - MX[1]) * t;
  out.phi = F0.phi + (F1.phi - F0.phi) * t;
  return out;
}
const smoother01 = x => { const t = x < 0 ? 0 : x > 1 ? 1 : x; return t * t * t * (t * (t * 6 - 15) + 10); };

function towards(A, B, u, out) {
  const sx0 = A.ox + A.k * (B.cx - A.cx), sy0 = A.oy - A.k * (B.cy - A.cy);
  out.k = A.k * Math.pow(B.k / A.k, u);
  out.cx = B.cx; out.cy = B.cy;
  out.ox = sx0 + (B.ox - sx0) * u; out.oy = sy0 + (B.oy - sy0) * u;
  out.phi = B.phi * u;
  return out;
}

const A = newFrame(), B = newFrame(), LB = newFrame(), BB = newFrame();
export function frameAt(data, st, W, H, out) {
  baseFrame(data.geo, W, H, A);
  const hero = data.skewers.hero;
  if (hero && st.cam > 0) return towards(A, heroFrame(hero, W, H, B), Math.min(1, st.cam), out);
  const lz = data.lya ? st.lz || 0 : 0, pz = data.pairs ? st.pz || 0 : 0;
  if (pz > 0 && lz > 0) {
    patchFrame(data.pairs.patch, W, H, B); patchFrame(data.lya.patch, W, H, LB, LYA_BOX); bothFrame(data.pairs.patch, data.lya.patch, W, H, BB, LYA_BOX);
    const w = lz / (pz + lz);
    return w < 0.5 ? mixFrame(B, BB, smoother01(2 * w), B.cx, B.cy, out) : mixFrame(BB, LB, smoother01(2 * w - 1), LB.cx, LB.cy, out);
  }
  if (lz > 0) return towards(A, patchFrame(data.lya.patch, W, H, B, LYA_BOX), Math.min(1, lz), out);
  if (data.pairs && st.pz > 0) return towards(A, patchFrame(data.pairs.patch, W, H, B), Math.min(1, st.pz), out);
  if (st.fold > 0) return towards(A, foldFrame(data.geo, W, H, B), Math.min(1, st.fold), out);
  Object.assign(out, A);
  return out;
}

const Z = newFrame();
export function zoomOf(data, F, W, H) { return F.k / baseFrame(data.geo, W, H, Z).k; }

export function toNDC(f, W, H, out) {
  const c = Math.cos(f.phi), s = Math.sin(f.phi);
  const m11 = 2 * f.k * c / W, m12 = -2 * f.k * s / W, m21 = 2 * f.k * s / H, m22 = 2 * f.k * c / H;
  out[0] = m11; out[1] = m12; out[2] = m21; out[3] = m22;
  out[4] = 2 * f.ox / W - 1 - m11 * f.cx - m12 * f.cy;
  out[5] = 1 - 2 * f.oy / H - m21 * f.cx - m22 * f.cy;
  return out;
}

export function project(f, px, py, out) {
  const c = Math.cos(f.phi), s = Math.sin(f.phi), dx = px - f.cx, dy = py - f.cy;
  out[0] = f.ox + f.k * (c * dx - s * dy);
  out[1] = f.oy - f.k * (s * dx + c * dy);
  return out;
}

export function sepAngle(geo, g, theta, sep) {
  const t2 = geo.secA[g] + (theta - geo.theta0) * geo.secS;
  return theta + (t2 - theta) * sep;
}

const AP = newFrame();
export function apexAt(data, st, W, H, out) { frameAt(data, st, W, H, AP); return project(AP, 0, 0, out); }

const IP = [0, 0];
export function irisDisc(data, st, W, H, out) {
  const P = apexAt(data, st, W, H, IP);
  const on = st.iris !== undefined && st.iris < 1;
  const dx0 = Math.max(0, -P[0], P[0] - W), dy0 = Math.max(0, -P[1], P[1] - H);
  const d0 = Math.hypot(dx0, dy0), d1 = Math.max(Math.hypot(P[0], P[1]), Math.hypot(W - P[0], P[1]), Math.hypot(P[0], H - P[1]), Math.hypot(W - P[0], H - P[1]));
  const u = on ? Math.max(0, st.iris) : 1;
  out.x = P[0]; out.y = P[1]; out.r = d0 + (d1 - d0) * u; out.on = on;
  return out;
}
