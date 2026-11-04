import { createClip } from './clip.js';
import { BEAM_TIME, FLASH_S, wallOf, viewAt } from './beamtime.js';
import { spectrumOf, C_KMS } from './beamspec.js';

const VIEW = [870, 1720];
const VIEW_WIDE = [720, 1900];
const ANCHOR_E = (VIEW_WIDE[0] * (VIEW[1] - VIEW[0]) - VIEW[0] * (VIEW_WIDE[1] - VIEW_WIDE[0])) / ((VIEW[1] - VIEW[0]) - (VIEW_WIDE[1] - VIEW_WIDE[0]));
const WIN = [1175, 1455];
const ANCHOR = (VIEW[0] * (WIN[1] - WIN[0]) - WIN[0] * (VIEW[1] - VIEW[0])) / ((WIN[1] - WIN[0]) - (VIEW[1] - VIEW[0]));
const MAG = BEAM_TIME.mag;
const YMAX = 6.4;
const INK = '#EDEAE2', MUTED = '#9AA3B0', HAIR = 'rgba(200,204,210,0.28)', HYDROGEN = '#E8704F', METAL = '#D9B26A';
const SHADE = 'rgba(120,170,235,0.42)';
import { SCENE, INK_GAS, INKVIEW, IMG, imgSrc } from './look.js';
const PANEL = SCENE.paper ? { ink: SCENE.ink, muted: SCENE.muted, hair: SCENE.hair, hydrogen: SCENE.accent, metal: SCENE.metal, shade: SCENE.shade }
  : { ink: INK, muted: MUTED, hair: HAIR, hydrogen: HYDROGEN, metal: METAL, shade: SHADE };
const BAND = INK_GAS ? INKVIEW.band
  : { ground: '#05080F', ink: INK, muted: MUTED, halo: 'rgba(12,18,27,0.92)', seam: 'rgba(220,226,235,0.9)', path: 'rgba(255,248,232,0.9)',
    trail: 'rgba(255,236,205,0.22)', glow: 'rgba(255,232,190,0.95)', core: 'rgba(255,252,244,0.98)', comp: 'lighter',
    quasar: ['rgba(255,255,255,1)', 'rgba(200,225,255,0.85)', 'rgba(120,170,255,0)'], galaxy: ['rgba(255,246,220,1)', 'rgba(255,214,140,0.7)', 'rgba(255,190,110,0)'] };
const SERIF = '"LyaAlpha", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const clamp01 = x => Math.max(0, Math.min(1, x));
const smooth = x => x * x * (3 - 2 * x);
const ramp = (x, a, b) => smooth(clamp01((x - a) / (b - a)));
const lerp = (a, b, f) => a + (b - a) * f;
function specView(e, z) {
  if (e < 1) {
    const w0 = VIEW_WIDE[1] - VIEW_WIDE[0], w = w0 * ((VIEW[1] - VIEW[0]) / w0) ** e, lo = ANCHOR_E - ((ANCHOR_E - VIEW_WIDE[0]) / w0) * w;
    return [lo, lo + w];
  }
  if (z <= 0) return VIEW;
  const w0 = VIEW[1] - VIEW[0], w = w0 * ((WIN[1] - WIN[0]) / w0) ** z, lo = ANCHOR - ((ANCHOR - VIEW[0]) / w0) * w;
  return [lo, lo + w];
}
const TREES_V = [1075, 2346, 3906];
const LZ = [1195, 1258], LPK = [1080, 1560];
function zoomTo(A, B, f) {
  if (!(f > 0)) return A;
  const wA = A[1] - A[0], wB = B[1] - B[0], c = (A[0] * wB - B[0] * wA) / (wB - wA), w = wA * (wB / wA) ** f, lo = c - ((c - A[0]) / wA) * w;
  return [lo, lo + w];
}
const NAMED = [
  { key: 'LL', label: 'Lyman limit', lam: 911.753, kind: 'H' },
  { key: 'Lyb', label: 'H I Lyβ', lam: 1025.7223, kind: 'H' },
  { key: 'Lya', label: 'H I Lyα', lam: 1215.670, kind: 'H' },
  { key: 'C II', label: 'C II', lam: 1334.5323, kind: 'M' },
  { key: 'Si IV', label: 'Si IV', lam: 1393.7602, kind: 'M', also: [1402.7729] },
  { key: 'Si II', label: 'Si II', lam: 1526.7070, kind: 'M' },
  { key: 'C IV', label: 'C IV', lam: 1548.204, kind: 'M', also: [1550.781] },
  { key: 'Fe II', label: 'Fe II', lam: 1608.4511, kind: 'M' },
];
let PLAIN = null;
export function plainBeam(p) { PLAIN = p && { right: [], ...p, keep: w => p.credits.includes(w) || (p.right || []).includes(w) || p.keep(w) }; }
const M_SLIDE = [0.04, 0.58], M_RIBBON = [0.6, 0.96], M_AXIS = [0.62, 1];
const BASE = [0.02, 0.03, 0.07], TAU = [120 / 255, 170 / 255, 235 / 255];
const TSTOPS = [[3.9, [0.10, 0.30, 0.95]], [4.3, [0.25, 0.62, 1.00]], [4.8, [0.55, 0.80, 1.00]], [5.4, [0.85, 0.55, 0.95]],
  [6.0, [1.00, 0.55, 0.35]], [6.6, [1.00, 0.80, 0.40]], [7.2, [1.00, 0.97, 0.85]]];
const D_LO = -0.6, D_HI = 1.7;
const DENS = [0.80, 0.86, 0.96], DENS_INK = [0.30, 0.34, 0.41];
const PAPER = INKVIEW.paper, TAU_INK = INKVIEW.tauInk, PD_LO = INKVIEW.pdLo, PTSTOPS = INKVIEW.stops;
function rampOf(TSTOPS, lT) {
  if (lT <= TSTOPS[0][0]) return TSTOPS[0][1];
  for (let i = 1; i < TSTOPS.length; i++) if (lT <= TSTOPS[i][0]) {
    const [x0, c0] = TSTOPS[i - 1], [x1, c1] = TSTOPS[i], f = (lT - x0) / (x1 - x0);
    return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
  }
  return TSTOPS[TSTOPS.length - 1][1];
}
const tempRGB = lT => rampOf(TSTOPS, lT);

export function createBeam(gasCanvas, zoomVideo, canvas) {
  const zclip = zoomVideo ? createClip(zoomVideo) : null, bandEl = gasCanvas.parentElement;
  let D = null, lastM = 1, lastT = 0, lastZ = 0, ribbons = [], ready = [];
  let lastF = 1, lastHy = 0, lastA = 1, lastO = 1, lastL = 0, lastH = 0, lastGB = 1, lastSZ = 0;
  let lastSC = 0, lastTR = 0, lastHS = 0, lastHSW = 0, lastFC = 0, lastWD = 0, lastPZ = 0, lastGH = 0, lastBP = 0, lastSP = 0, lastFA = 0;
  let hydPic = null, starPic = null, hsRatio = null;
  let densRibbons = [], starRibbons = [];
  const panelHS = () => !!(D && D.gas.hs_window && D.gas.hs_window.complete && D.gas.hs_window.segments.every(i => densRibbons[i] && starRibbons[i]));
  const loadPic = (src, set) => { const im = new Image(); im.decoding = 'async';
    im.onload = () => (im.decode ? im.decode() : Promise.resolve()).then(() => (typeof createImageBitmap === 'function' ? createImageBitmap(im) : im)).then(b => { set(b); redraw(); }, () => { set(im); redraw(); });
    im.src = imgSrc(src); };
  loadPic('media/lyman_hydrogen.jpg', b => { hydPic = b; }); loadPic('media/lyman_stars.jpg', b => { starPic = b; });
  fetch('../volume-spike/data/lw10/lyman.json').then(r => (r.ok ? r.json() : null)).then(L => { if (L) { hsRatio = L.hydrogen_to_stars; redraw(); } }).catch(() => {});
  const g = canvas.getContext('2d'), gg = gasCanvas.getContext('2d');
  let SP = null;
  let ST = null, stripPic = null, stripCtx = null, stripImg = null, acc = null, stripAt = -1, stripF = -1;
  function setStrip(buf, S) {
    const R = S.rows, n = S.n, sz = R * n, lo = (k, q) => S.scales[k][0] + ((S.scales[k][1] - S.scales[k][0]) * q) / 255;
    const F = new Uint8Array(buf, 0, sz), v = new Int16Array(buf, sz, sz), lT = new Uint8Array(buf, 3 * sz, sz), lD = new Uint8Array(buf, 4 * sz, sz);
    const tauC = new Float32Array(3 * sz), tC = new Float32Array(3 * sz), dC = new Float32Array(3 * sz), d = new Float32Array(sz);
    for (let i = 0; i < sz; i++) {
      const a = (1 - lo('F', F[i])) ** 0.9, c = tempRGB(lo('lT', lT[i])), b = clamp01((lo('lD', lD[i]) - D_LO) / (D_HI - D_LO)) ** 1.1;
      if (INK_GAS) {
        const pc = rampOf(PTSTOPS, lo('lT', lT[i])), bp = clamp01((lo('lD', lD[i]) - PD_LO) / (D_HI - PD_LO)) ** 0.85;
        const ap = 0.92 * (1 - lo('F', F[i])) ** 1.3;
        for (let k = 0; k < 3; k++) { tauC[3 * i + k] = PAPER[k] + (TAU_INK[k] - PAPER[k]) * ap; tC[3 * i + k] = PAPER[k] + (pc[k] - PAPER[k]) * bp; dC[3 * i + k] = PAPER[k] + (DENS_INK[k] - PAPER[k]) * bp; }
      } else for (let k = 0; k < 3; k++) { tauC[3 * i + k] = BASE[k] + TAU[k] * a; tC[3 * i + k] = BASE[k] + c[k] * b; dC[3 * i + k] = BASE[k] + DENS[k] * b; }
      d[i] = v[i] / S.du;
    }
    ST = { R, n, tauC, tC, dC, d };
    stripPic = document.createElement('canvas'); stripPic.width = n; stripPic.height = R;
    stripCtx = stripPic.getContext('2d'); stripImg = stripCtx.createImageData(n, R); acc = new Float32Array(4 * sz); stripAt = -1;
  }
  function stripTo(s, fld = 1) {
    if (!ST || (s === stripAt && fld === stripF)) return;
    const { R, n, tauC, tC, dC, d } = ST, q = 1 - s, px = stripImg.data, e = 1 - fld;
    acc.fill(0);
    for (let r = 0; r < R; r++) {
      const o = r * n;
      for (let j = 0; j < n; j++) {
        const j1 = j + 1 === n ? 0 : j + 1, da = d[o + j], db = d[o + j1];
        const ua = j + 0.5 + da, ub = j + 1.5 + db, a = j + 0.5 + q * da, b = j + 1.5 + q * db;
        if (a === b) continue;
        const inv = 1 / (b - a), lo = Math.min(a, b), hi = Math.max(a, b);
        for (let p = Math.ceil(lo - 0.5), p1 = Math.ceil(hi - 0.5); p < p1; p++) {
          const f = (p + 0.5 - a) * inv, u = ua + f * (ub - ua) - 0.5;
          let ui = Math.floor(u); const uf = u - ui; ui = ((ui % n) + n) % n; const ui1 = ui + 1 === n ? 0 : ui + 1;
          const k = 4 * (o + (((p % n) + n) % n)), ta = 3 * (o + ui), tb = 3 * (o + ui1), ga = 3 * (o + j), gb = 3 * (o + j1);
          for (let c = 0; c < 3; c++) acc[k + c] += q * (tauC[ta + c] * (1 - uf) + tauC[tb + c] * uf) + s * (fld * (tC[ga + c] * (1 - f) + tC[gb + c] * f) + e * (dC[ga + c] * (1 - f) + dC[gb + c] * f));
          acc[k + 3] += 1;
        }
      }
    }
    for (let r = 0; r < R; r++) for (let i = 0; i < n; i++) {
      const k = 4 * (r * n + i), w = acc[k + 3] || 1, o = 4 * ((R - 1 - r) * n + i);
      px[o] = 255 * acc[k] / w; px[o + 1] = 255 * acc[k + 1] / w; px[o + 2] = 255 * acc[k + 2] / w; px[o + 3] = 255;
    }
    stripCtx.putImageData(stripImg, 0, 0); stripAt = s; stripF = fld;
  }
  const slideOf = m => ramp(m, M_SLIDE[0], M_SLIDE[1]);
  function glowOf(N, t, vt) {
    let forest = 0, flash = 0;
    if (N.kind === 'H' && N.key !== 'LL') { const L = D.lyman.find(x => x.name === N.key); forest = 1 - Math.exp(-L.ratio * SP.forestAt(vt)); }
    const w = wallOf(t);
    for (const A of D.absorbers) {
      if (N.kind === 'M' && A.kind !== 'DLA') continue;
      const d = w - wallOf(A.imprint / D.path.V);
      flash = Math.max(flash, d >= 0 ? Math.exp(-d / FLASH_S) : Math.exp(d / 0.05));
    }
    return { forest, flash };
  }

  function drawGas(m, t, z) {
    const band = bandEl.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    const W = Math.round(band.width * dpr), H = Math.round(band.height * dpr);
    if (!(W > 0 && H > 0)) return;
    if (gasCanvas.width !== W || gasCanvas.height !== H) { gasCanvas.width = W; gasCanvas.height = H; }
    gg.globalAlpha = 1; gg.fillStyle = BAND.ground; gg.fillRect(0, 0, W, H);
    bandEl.style.opacity = lastGB >= 1 ? '' : lastGB.toFixed(3);
    const Z = D && D.gas.zoom;
    if (zoomVideo) zoomVideo.style.opacity = Z && z > 0 ? ramp(MAG ** z, Z.mag[0], Z.mag[1]).toFixed(3) : '0';
    if (!D) return;
    const G = D.gas, v = viewAt(t, z, G), hv = (v.w * H) / W, x0 = v.cx - v.w / 2, x1 = v.cx + v.w / 2;
    const sx = x => ((x - x0) / v.w) * W, sy = zz => ((v.cz + hv / 2 - zz) / hv) * H;
    gg.imageSmoothingEnabled = true; gg.imageSmoothingQuality = 'high';
    const th = 0.5 * Math.PI * ramp(m, M_RIBBON[0], M_RIBBON[1]), cs = Math.cos(th), sn = Math.sin(th), yL = sy(G.z);
    const card = f => gg.setTransform(1, 0, 0, f, 0, yL * (1 - f));
    if (sn > 0.002 && lastSC < 1) {
      card(sn); gg.globalAlpha = 1 - lastSC;
      G.segments.forEach((S, i) => {
        const im = ribbons[i], a = Math.max(x0, S.x0), b = Math.min(x1, S.x0 + G.L);
        if (!im || !(im.width > 0) || !(b > a)) return;
        gg.drawImage(im, (a - S.x0) / G.px, (G.z1 - (v.cz + hv / 2)) / G.px, (b - a) / G.px, hv / G.px, sx(a), 0, sx(b) - sx(a), H);
      });
      if (lastHS > 0 && panelHS()) {
        const eS = smooth(clamp01(lastSP));
        for (const [set, al] of [[densRibbons, lastHS], [starRibbons, lastHS * eS]]) {
          if (!(al > 0)) continue;
          gg.globalAlpha = al * (1 - lastSC);
          G.segments.forEach((S, i) => {
            const im = set[i], a = Math.max(x0, S.x0), b = Math.min(x1, S.x0 + G.L);
            if (!im || !(im.width > 0) || !(b > a)) return;
            gg.drawImage(im, (a - S.x0) / G.px, (G.z1 - (v.cz + hv / 2)) / G.px, (b - a) / G.px, hv / G.px, sx(a), 0, sx(b) - sx(a), H);
          });
        }
      }
      gg.globalAlpha = 1;
    }
    if (cs > 0.002 && ST) {
      stripTo(slideOf(m), lastF);
      const S = D.strip, top = G.z + (S.rows / 2) * S.dy_mpch, bot = G.z - (S.rows / 2) * S.dy_mpch;
      card(cs); gg.globalAlpha = cs; gg.drawImage(stripPic, 0, 0, ST.n, ST.R, sx(0), sy(top), sx(G.L) - sx(0), sy(bot) - sy(top)); gg.globalAlpha = 1;
    }
    gg.setTransform(1, 0, 0, 1, 0, 0);
  }

  function draw(m, t, z) {
    const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    g.clearRect(0, 0, W, H);
    if (!D || !SP) return;
    const vh = H / 100, vw = W / 100, u = Math.min(vh, 0.5625 * vw);
    const P = { x0: 8 * vw, x1: 95 * vw, y0: 59 * vh, y1: 88 * vh };
    const DL = PLAIN && PLAIN.dla ? PLAIN.dla(clamp01(t) * D.path.V - D.dla.imprint) : null;
    const lamDL = 1215.670 * Math.exp((clamp01(t) * D.path.V - D.dla.v) / C_KMS), dlaWin = DL ? [lamDL * Math.exp(-DL.hw / C_KMS), lamDL * Math.exp(DL.hw / C_KMS)] : null;
    const V = zoomTo(zoomTo(zoomTo(zoomTo(specView(ramp(m, M_AXIS[0], M_AXIS[1]), z), VIEW_WIDE, lastWD), LPK, lastPZ), LZ, lastSZ), dlaWin, DL ? DL.k : 0), mag = (VIEW[1] - VIEW[0]) / (V[1] - V[0]);
    const X = lam => P.x0 + ((lam - V[0]) / (V[1] - V[0])) * (P.x1 - P.x0);
    const inside = x => x >= P.x0 - 1 && x <= P.x1 + 1;
    const Y = f => P.y1 - (f / YMAX) * (P.y1 - P.y0);
    const LYA = 1215.670, vt = clamp01(t) * D.path.V, stretch = Math.exp(vt / C_KMS);
    const font = (px, it) => `${it ? 'italic ' : ''}${Math.round(px)}px ${SERIF}`;
    let haloInk = BAND.halo;
    const text = (s, x, y, o = {}) => { if (PLAIN) { const r = PLAIN.keep(s); if (!r) return; if (typeof r === 'string') s = r; }
      g.save(); g.font = font(o.px || 2.6 * u, o.italic); g.fillStyle = o.color || INK; g.globalAlpha = o.alpha ?? 1;
      g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic';
      if (o.rotate) { g.translate(x, y); g.rotate(o.rotate); x = 0; y = 0; }
      if (o.box) { const w = g.measureText(s).width, x0 = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x, px = o.px || 2.6 * u;
        g.save(); g.globalAlpha = 0.85 * (o.alpha ?? 1); g.fillStyle = o.box; g.fillRect(x0 - 0.4 * u, y - 0.85 * px, w + 0.8 * u, 1.15 * px); g.restore(); }
      if (o.halo) { g.lineJoin = 'round'; g.strokeStyle = o.haloColor || haloInk; g.lineWidth = 0.55 * u; g.strokeText(s, x, y); }
      g.fillText(s, x, y); g.restore(); };

    const band = bandEl.getBoundingClientRect(), G = D.gas;
    if (band.width > 0 && lastGB > 0.5) {
      const v = viewAt(t, z, G), hv = (v.w * band.height) / band.width, mz = MAG ** z, aP = z > 0 ? ramp(mz, 1.15, 2.0) : 0;
      const at = (x, zz) => [(band.left + ((x - (v.cx - v.w / 2)) / v.w) * band.width) * dpr, (band.top + ((v.cz + hv / 2 - zz) / hv) * band.height) * dpr];
      const k = band.height * dpr, bx0 = band.left * dpr, bx1 = band.right * dpr, by0 = band.top * dpr, by1 = band.bottom * dpr;
      const aR = ramp(m, M_RIBBON[0], M_RIBBON[1]);
      g.save(); g.beginPath(); g.rect(bx0, by0, bx1 - bx0, by1 - by0); g.clip();
      const bl = lastBP > 0 && lastBP < 1 ? Math.sin(Math.PI * lastBP) : 0, metV = TREES_V.filter(v => v <= vt).pop();
      if (lastSC > 0) TREES_V.forEach((vc, i) => {
        const [cx, cy] = at(G.path * (vc / D.path.V), G.z), fl = vc === metV ? bl : 0, r = 0.22 * k * (1 + 0.5 * fl), q = g.createRadialGradient(cx, cy, 0, cx, cy, r);
        q.addColorStop(0, INK_GAS ? 'rgba(80,106,136,0.5)' : 'rgba(140,180,255,0.5)'); q.addColorStop(1, INK_GAS ? 'rgba(80,106,136,0)' : 'rgba(140,180,255,0)');
        g.save(); g.globalAlpha = lastSC; g.fillStyle = q; g.beginPath(); g.arc(cx, cy, r, 0, 2 * Math.PI); g.fill();
        g.strokeStyle = BAND.muted; g.setLineDash([0.3 * u, 0.3 * u]); g.lineWidth = Math.max(1, 0.1 * u); g.beginPath(); g.arc(cx, cy, 1.6 * u, 0, 2 * Math.PI); g.stroke();
        g.setLineDash([]); g.fillStyle = INK_GAS ? BAND.core : '#E8704F'; g.beginPath(); g.arc(cx, cy, 0.5 * u, 0, 2 * Math.PI); g.fill();
        if (fl > 0) { g.globalAlpha = lastSC * fl; g.strokeStyle = INK_GAS ? BAND.core : '#E8704F'; g.lineWidth = Math.max(2, 0.3 * u); g.shadowColor = g.strokeStyle; g.shadowBlur = 2 * u; g.beginPath(); g.arc(cx, cy, 1.6 * u + 2.4 * u * lastBP, 0, 2 * Math.PI); g.stroke(); }
        g.restore();
        if (i === 0) text('a hydrogen cloud', cx + 0.1 * k, cy + 0.17 * k, { px: 2.2 * u, color: BAND.ink, alpha: lastSC, halo: true });
      });
      if (lastFA > 0) text('hydrogen is everywhere, so the light meets it everywhere', (bx0 + bx1) / 2, by1 - 2.4 * u, { px: 3.4 * u, color: BAND.ink, align: 'center', alpha: lastFA * (1 - lastFC), halo: true });
      if (lastFC > 0) text('not a few trees: hundreds of dips, the Lyman-alpha forest', (bx0 + bx1) / 2, by1 - 2.4 * u, { px: 3.4 * u, color: BAND.ink, align: 'center', alpha: lastFC, halo: true });
      for (let i = 1; i < G.segments.length; i++) {
        const [sx] = at(G.segments[i].x0, G.z), a = PLAIN ? 0 : aR * (1 - aP) * (1 - lastSC) * Math.min(ramp(sx, bx0, bx0 + 0.04 * k), 1 - ramp(sx, bx1 - 0.04 * k, bx1));
        if (!(a > 0)) continue;
        g.save(); g.globalAlpha = 0.5 * a; g.strokeStyle = BAND.seam; g.lineWidth = Math.max(1, 0.004 * k); g.setLineDash([0.012 * k, 0.016 * k]);
        g.beginPath(); g.moveTo(sx, by0); g.lineTo(sx, by1); g.stroke(); g.restore();
        text('another sightline →', sx + 0.6 * u, by0 + 2.6 * u, { px: 1.9 * u, color: BAND.muted, italic: true, alpha: a, halo: true });
      }
      const [qx, qy] = at(0, G.z), [tx, ty] = at(G.path * t, G.z);
      const aD = 1 - ramp(t, 0, 0.02);
      if (aD > 0) {
        g.save(); g.globalAlpha = 0.55 * aD; g.strokeStyle = BAND.path; g.lineWidth = Math.max(1, 0.006 * k); g.setLineDash([0.02 * k, 0.018 * k]);
        g.beginPath(); g.moveTo(qx, qy); g.lineTo(bx1, qy); g.stroke(); g.restore();
      }
      if (t > 0) {
        g.save(); g.lineCap = 'round'; g.strokeStyle = BAND.trail; g.lineWidth = 0.05 * k; g.beginPath(); g.moveTo(qx, qy); g.lineTo(tx, ty); g.stroke();
        g.shadowColor = BAND.glow; g.shadowBlur = 0.04 * k; g.strokeStyle = BAND.core; g.lineWidth = Math.max(2, 0.016 * k);
        g.beginPath(); g.moveTo(qx, qy); g.lineTo(tx, ty); g.stroke();
        g.fillStyle = BAND.core; g.beginPath(); g.moveTo(tx + 0.03 * k, ty); g.lineTo(tx - 0.012 * k, ty - 0.024 * k); g.lineTo(tx - 0.012 * k, ty + 0.024 * k); g.closePath(); g.fill();
        g.restore();
      }
      {
        const r = 0.05 * k, q = g.createRadialGradient(qx, qy, 0, qx, qy, r);
        q.addColorStop(0, BAND.quasar[0]); q.addColorStop(0.25, BAND.quasar[1]); q.addColorStop(1, BAND.quasar[2]);
        g.save(); g.globalCompositeOperation = BAND.comp; g.fillStyle = q; g.beginPath(); g.arc(qx, qy, r, 0, 2 * Math.PI); g.fill(); g.restore();
      }
      if (aD > 0) text('a quasar', qx + 0.035 * k, qy - 0.05 * k, { px: 2.3 * u, color: BAND.ink, alpha: aD, halo: true });
      const cap = (s, a) => { if (a > 0) text(s, bx0 + 2 * u, by0 + 3.2 * u, { px: 2.2 * u, color: BAND.ink, alpha: a, halo: true }); };
      cap(`our simulation, as quasar spectra see it: ${INK_GAS ? 'dark' : 'bright'} where hydrogen absorbs`, 1 - ramp(m, 0.04, 0.16));
      const aF = 1 - ramp(m, 0.6, 0.66);
      cap('our simulation’s gas: brighter where it is denser', (1 - lastF) * aF);
      cap('the same gas, coloured by its temperature', lastF * aF * ramp(m, 0.5, 0.58));
      if (lastHy > 0) text('About three quarters of this gas is hydrogen', (bx0 + bx1) / 2, by1 - 2.4 * u, { px: 4.0 * u, color: BAND.ink, align: 'center', alpha: lastHy, halo: true });
      const aK = PLAIN ? 0 : ramp(m, 0.18, 0.36) * (1 - aP) * lastF * (1 - lastSC) * (panelHS() ? 1 - lastHS : 1);
      if (aK > 0) {
        g.save(); g.font = font(1.8 * u, false); const wHot = g.measureText('10 million K').width; g.restore();
        const kw = 14 * u, kh = 0.9 * u, kx = bx1 - 2.4 * u - wHot - 0.8 * u - kw, ky = by1 - 2.4 * u - kh, l0 = 4, l1 = 7;
        const grd = g.createLinearGradient(kx, 0, kx + kw, 0), rgb = c => `rgb(${c.map(x => Math.round(255 * x)).join(',')})`;
        const ST_ = INK_GAS ? PTSTOPS : TSTOPS;
        grd.addColorStop(0, rgb(rampOf(ST_, l0))); grd.addColorStop(1, rgb(rampOf(ST_, l1)));
        for (const [lT, c] of ST_) if (lT > l0 && lT < l1) grd.addColorStop((lT - l0) / (l1 - l0), rgb(c));
        g.save(); g.globalAlpha = aK; g.fillStyle = grd; g.fillRect(kx, ky, kw, kh); g.restore();
        const o = { px: 1.8 * u, color: BAND.ink, alpha: aK, halo: true };
        text('gas temperature', kx + kw / 2, ky - 0.8 * u, { ...o, align: 'center', italic: true });
        text('10,000 K', kx - 0.8 * u, ky + kh, { ...o, align: 'right' });
        text('10 million K', kx + kw + 0.8 * u, ky + kh, o);
      }
      if (lastHS > 0 && panelHS()) {
        const eS = smooth(clamp01(lastSP)), N = G.hs_window.hydrogen_to_stars, aH = lastHS * (1 - ramp(eS, 0, 0.45)), aS = lastHS * ramp(eS, 0.55, 1);
        cap('our simulation’s hydrogen: it fills the space', aH);
        cap('stars are rarer than hydrogen', aS);
        const big = { px: 7.0 * u, align: 'center', base: 'middle', halo: true, haloColor: BAND.halo }, mid = [(bx0 + bx1) / 2, (by0 + by1) / 2];
        text('hydrogen', ...mid, { ...big, color: INK_GAS ? '#4D5768' : '#8CB8FF', alpha: aH });
        text('stars', ...mid, { ...big, color: INK_GAS ? '#8F6300' : '#FFDB8C', alpha: aS });
        if (N) text(`the same slice: hydrogen outweighs the stars ${Math.round(N)} to 1`, (bx0 + bx1) / 2, by1 - 2.4 * u, { px: 3.4 * u, color: BAND.ink, align: 'center', alpha: lastHS * ramp(lastSP, 0.6, 1), halo: true });
      }
      const [hx, hy] = at(G.host[0], G.host[1]), aG = aR * (1 - aP);
      if (aG > 0 && hx > bx0 - 0.1 * k && hx < bx1 + 0.1 * k) {
        const r = 0.035 * k, q = g.createRadialGradient(hx, hy, 0, hx, hy, r);
        q.addColorStop(0, BAND.galaxy[0]); q.addColorStop(0.3, BAND.galaxy[1]); q.addColorStop(1, BAND.galaxy[2]);
        g.save(); g.globalAlpha = aG; g.globalCompositeOperation = BAND.comp; g.fillStyle = q; g.beginPath(); g.arc(hx, hy, r, 0, 2 * Math.PI); g.fill(); g.restore();
        text('a galaxy', hx, hy - 0.07 * k, { px: 2.3 * u, color: BAND.ink, align: 'center', halo: true, alpha: aG });
      }
      if (aP > 0) {
        const o = { px: 2.2 * u, color: BAND.ink, alpha: aP, halo: true, haloColor: BAND.halo };
        text(`zoomed ×${Math.round(mz)} into the simulation’s gas · time slowed ×${Math.round(mz)}`, bx0 + 2 * u, by0 + 3.2 * u, o);
        const aC = ramp(z, 0.85, 1);
        if (aC > 0) {
          const ring = (x, y, r, a) => { if (PLAIN) return; g.save(); g.globalAlpha = a; g.strokeStyle = INK_GAS ? SCENE.metal : METAL; g.lineWidth = Math.max(INK_GAS ? 1.5 : 1, 0.12 * u); g.setLineDash([0.5 * u, 0.4 * u]);
            g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.stroke(); g.restore(); };
          const r = Math.max(0.03 * k, (0.012 / v.w) * band.width * dpr);
          ring(hx, hy, r, 0.85 * aC);
          text('the galaxy the light crosses', hx + 0.7 * r, hy + r + 2.4 * u, { ...o, alpha: aC });
          if (G.neighbour) {
            const [nx, ny] = at(G.neighbour[0], G.neighbour[1]), rn = Math.max(0.04 * k, (0.03 / v.w) * band.width * dpr);
            ring(nx, ny, rn, 0.6 * aC);
            text('a bigger neighbour', nx - 0.7 * rn, ny - rn - 0.8 * u, { ...o, alpha: 0.85 * aC, align: 'right' });
          }
          text('the gas around a galaxy: no disc;', bx1 - 2 * u, by1 - 4.6 * u, { ...o, alpha: aC, align: 'right' });
          text('a galaxy is finer than this simulation can draw', bx1 - 2 * u, by1 - 1.8 * u, { ...o, alpha: aC, align: 'right' });
        }
      }
      g.restore();
    }

    {
    const INK = PANEL.ink, MUTED = PANEL.muted, HAIR = PANEL.hair, HYDROGEN = PANEL.hydrogen, METAL = PANEL.metal, SHADE = PANEL.shade;
    haloInk = SCENE.halo;
    const spo = { on: lastA, old: lastO, win: 200, tree: lastTR, trees: TREES_V, treeW: 120 };
    const Sd = DL && DL.k > 0 ? Float64Array.from(SP.sample(t, V[0], V[1], { ...spo, grow: DL, only: 'dla' }).S) : null, dim = Sd ? 1 - 0.7 * DL.k : 1;
    const sp = SP.sample(t, V[0], V[1], { ...spo, grow: DL || undefined }), N = sp.n - 1, lamD = sp.lam, Cs = sp.C, Ss = sp.S;
    g.save(); g.strokeStyle = HAIR; g.lineWidth = Math.max(1, 0.12 * u);
    const aFine = ramp(mag, 2.2, 3.4);
    for (let nm = 2 * Math.ceil(V[0] / 20); nm <= V[1] / 10; nm += 2) {
      const a = nm % 10 === 0 ? 1 : aFine, x = X(nm * 10);
      if (!(a > 0) || !inside(x)) continue;
      g.globalAlpha = a; g.beginPath(); g.moveTo(x, P.y1); g.lineTo(x, P.y1 + 0.8 * u); g.stroke();
      text(`${nm} nm`, x, P.y1 + 3.0 * u, { px: 2.0 * u, color: MUTED, align: 'center', alpha: a });
    }
    const aHalf = DL ? ramp(mag, 10, 16) : 0;
    for (let h = Math.ceil(V[0] / 5); aHalf > 0 && h <= V[1] / 5; h++) {
      const x = X(h * 5);
      if (h % 4 === 0 || !inside(x)) continue;
      g.globalAlpha = aHalf; g.beginPath(); g.moveTo(x, P.y1); g.lineTo(x, P.y1 + 0.8 * u); g.stroke();
      text(`${h / 2} nm`, x, P.y1 + 3.0 * u, { px: 2.0 * u, color: MUTED, align: 'center', alpha: aHalf });
    }
    g.globalAlpha = 1; g.setLineDash([0.5 * u, 0.6 * u]); g.beginPath(); g.moveTo(P.x0, P.y1); g.lineTo(P.x1, P.y1); g.stroke();
    g.restore();
    text('0 · no light', P.x0 - 0.8 * u, P.y1 + 0.7 * u, { px: 1.9 * u, color: MUTED, italic: true, align: 'right' });
    text('brightness', P.x0 - 2.0 * u, P.y0 + 0.5 * (P.y1 - P.y0), { px: 2.0 * u, color: MUTED, italic: true, align: 'center', rotate: -Math.PI / 2 });
    text('bluer', P.x0, P.y1 + 5.0 * u, { px: 2.1 * u, color: MUTED, italic: true });
    text('colour, as the gas the light is crossing sees it', 0.5 * (P.x0 + P.x1), P.y1 + 5.0 * u, { px: 2.1 * u, color: MUTED, italic: true, align: 'center' });
    text('redder', P.x1, P.y1 + 5.0 * u, { px: 2.1 * u, color: MUTED, italic: true, align: 'right' });

    for (const L of NAMED) {
      if (PLAIN && L.kind !== 'H') continue;
      const gl0 = t > 0 && t < 1 ? glowOf(L, t, vt) : { forest: 0, flash: 0 }, gl = { forest: gl0.forest * lastA * lastO, flash: gl0.flash * lastA }, now = Math.max(gl.forest, gl.flash), fl = gl.flash;
      const col = L.kind === 'H' ? HYDROGEN : METAL, base = L.kind === 'H' ? 0.7 : SCENE.paper ? 0.85 : 0.4, a = Math.min(1, base + 0.6 * now);
      for (const lam of [L.lam, ...(L.also || [])]) {
        const x = X(lam);
        if (!inside(x)) continue;
        g.save(); g.strokeStyle = col; g.globalAlpha = a; g.lineWidth = Math.max(SCENE.paper ? 1.5 : 1, (0.13 + 0.25 * now + 0.3 * fl) * u); g.setLineDash([0.7 * u, 0.6 * u]);
        if (fl > 0.02) { g.shadowColor = 'rgba(255,214,170,0.95)'; g.shadowBlur = 2.6 * u * fl; }
        g.beginPath(); g.moveTo(x, P.y0); g.lineTo(x, P.y1); g.stroke(); g.restore();
      }
      if (L.key === 'C II' && z > 0 && inside(X(L.lam))) text('metals: illustrative', X(L.lam) + 0.6 * u, P.y0 + 2.6 * u, { px: 1.8 * u, color: METAL, italic: true, alpha: ramp(z, 0.5, 1), halo: true });
      if (inside(X(L.lam))) text(L.label, X(L.lam) - 0.5 * u, P.y0 + 0.4 * u, { px: 2.0 * u, color: col, alpha: Math.min(1, a + 0.15), align: 'right', rotate: -Math.PI / 2 });
    }
    text('dashed: each atom’s colours', P.x0, P.y0 - 0.8 * u, { px: 1.9 * u, color: MUTED, italic: true });

    g.save(); g.globalAlpha = dim; g.fillStyle = SHADE; g.beginPath();
    for (let i = 0; i <= N; i++) g.lineTo(X(lamD[i]), Y(Cs[i]));
    for (let i = N; i >= 0; i--) g.lineTo(X(lamD[i]), Y(Ss[i]));
    g.closePath(); g.fill(); g.restore();
    const line = (arr, colour, lw, dash, alpha = 1) => { g.save(); g.globalAlpha = alpha; g.strokeStyle = colour; g.lineWidth = lw; g.lineJoin = 'round'; if (dash) g.setLineDash(dash);
      g.beginPath(); for (let i = 0; i <= N; i++) { const x = X(lamD[i]), y = Y(arr[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.restore(); };
    line(Cs, MUTED, Math.max(1, 0.15 * u), [0.9 * u, 0.7 * u]);
    line(Ss, INK, Math.max(1, 0.13 * u), null, dim);
    if (Sd) {
      g.save(); g.globalAlpha = 0.45 * DL.k; g.fillStyle = HYDROGEN; g.beginPath();
      for (let i = 0; i <= N; i++) g.lineTo(X(lamD[i]), Y(Cs[i]));
      for (let i = N; i >= 0; i--) g.lineTo(X(lamD[i]), Y(Sd[i]));
      g.closePath(); g.fill(); g.restore();
      line(Sd, HYDROGEN, Math.max(2, 0.2 * u), null, DL.k);
    }
    if (lastGH > 0 && t > 0.01) {
      g.save(); g.globalAlpha = 0.55 * lastGH; g.strokeStyle = MUTED; g.lineWidth = Math.max(1, 0.14 * u); g.setLineDash([0.4 * u, 0.5 * u]); g.beginPath();
      for (let i = 0; i <= N; i++) { const x = X(lamD[i]), y = Y(SP.contAt(lamD[i])); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke(); g.restore();
      for (const [lam, lab] of [[LYA, 'Lyα glow'], [1549.06, 'C IV glow']]) {
        const xa = X(lam), xb = X(lam * stretch), y = Y(SP.contAt(lam)) - 2.2 * u;
        if (!inside(xa) || !inside(xb) || xb - xa < 1.5 * u) continue;
        g.save(); g.globalAlpha = lastGH; g.strokeStyle = HYDROGEN; g.fillStyle = HYDROGEN; g.lineWidth = Math.max(2, 0.28 * u);
        g.beginPath(); g.moveTo(xa, y); g.lineTo(xb - 1.0 * u, y); g.stroke(); g.beginPath(); g.moveTo(xb, y); g.lineTo(xb - 1.2 * u, y - 0.6 * u); g.lineTo(xb - 1.2 * u, y + 0.6 * u); g.closePath(); g.fill(); g.restore();
        text(lab, xa, y - 1.0 * u, { px: 1.9 * u, color: HYDROGEN, alpha: lastGH, halo: true });
      }
      text(`as the quasar sent it (dotted) · stretched ×${stretch.toFixed(2)}: every colour ${Math.round(100 * (stretch - 1))} % redder`, (P.x0 + P.x1) / 2, P.y0 - 6.0 * u, { px: 2.8 * u, color: INK, align: 'center', alpha: lastGH * (1 - lastGB), halo: true });
      const aW = lastGH * (1 - lastGB), yW = 33 * vh, Aw = 3.2 * u, L0 = 6.0 * u, f = clamp01((stretch - 1) / 0.196);
      if (aW > 0) {
        const wave = (Lw, col, a, lw, dash) => { g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = lw; if (dash) g.setLineDash(dash); g.beginPath();
          for (let x = P.x0; x <= P.x1; x += 2) { const y = yW + Aw * Math.sin((2 * Math.PI * (x - P.x0)) / Lw); x === P.x0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); g.restore(); };
        const c0 = [155, 124, 255], c1 = [255, 110, 70], col = `rgb(${c0.map((v, k) => Math.round(v + (c1[k] - v) * f)).join(',')})`;
        wave(L0, MUTED, 0.5 * aW, Math.max(1, 0.12 * u), [0.4 * u, 0.4 * u]);
        g.save(); g.shadowColor = col; g.shadowBlur = 1.2 * u; wave(L0 * stretch, col, aW, Math.max(2, 0.34 * u)); g.restore();
        text('one wave of the light: as sent (dotted), and stretched longer, so redder', (P.x0 + P.x1) / 2, yW - Aw - 2.2 * u, { px: 2.3 * u, color: SCENE.soft, italic: true, align: 'center', alpha: aW });
      }
    }

    const xPk = X(LYA * stretch), yPk = Y(SP.contAt(LYA));
    if (inside(xPk)) text('the quasar’s own glow', xPk + 1.2 * u, yPk - 0.6 * u, { px: 2.2 * u, color: INK, halo: true, box: SCENE.ground });
    const aS = ramp(t, 0.03, 0.12), msgS = 'stretched by the expanding Universe';
    g.save(); g.font = font(1.9 * u, true); const wS = g.measureText(msgS).width; g.restore();
    if (aS > 0 && !PLAIN) {
      g.save(); g.font = font(1.9 * u, true); const wC = g.measureText('dashed: the colours each kind of atom takes').width; g.restore();
      const y = P.y0 - 1.5 * u, x0 = Math.max(X(LYA) + 0.6 * u, P.x0 + wC + 1.2 * u);
      const x1 = Math.min(Math.max(x0 + 6 * u, xPk - 0.6 * u), P.x1 - wS - 1.2 * u);
      g.save(); g.globalAlpha = aS; g.strokeStyle = MUTED; g.fillStyle = MUTED; g.lineWidth = Math.max(1, 0.14 * u);
      g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
      g.beginPath(); g.moveTo(x1, y); g.lineTo(x1 - 1.0 * u, y - 0.6 * u); g.lineTo(x1 - 1.0 * u, y + 0.6 * u); g.closePath(); g.fill(); g.restore();
      text(msgS, x1 + 1.2 * u, y + 0.7 * u, { px: 1.9 * u, color: MUTED, italic: true, alpha: aS });
    }
    const S0 = D.absorbers.find(A => A.kind === 'LLS');
    if (S0 && vt >= S0.imprint) {
      const xE = X(D.ll.lam * Math.exp((vt - S0.v) / C_KMS)), aE = ramp(t, S0.t + 0.01, S0.t + 0.05);
      const msg = 'no light below the Lyman limit';
      g.save(); g.font = font(2.0 * u, false); const wE = g.measureText(msg).width; g.restore();
      const xL0 = Math.max(P.x0 + 0.6 * u, xE - 0.8 * u - wE);
      if (xE > P.x0 + 2 * u) text(msg, xL0, Y(2.7), { px: 2.0 * u, color: INK, alpha: aE * (1 - z) * lastA * lastO, halo: true });
    }
    if (z > 0) {
      const o = { px: 2.2 * u, color: INK, alpha: ramp(z, 0.6, 1), halo: true };
      text('so much hydrogen, it takes nearby colours too', X(LYA) + 1.0 * u, Y(5.7), o);
    }
    if (DL && DL.k > 0 && DL.f > 0) {
      const NH = DL.N ?? DL.f * 10 ** D.dla.logN; let e = Math.floor(Math.log10(NH)), mN = (NH / 10 ** e).toFixed(1);
      if (mN === '10.0') { mN = '1.0'; e += 1; }
      text(`the galaxy’s hydrogen crossed so far: ${mN} × 10${[...String(e)].map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('')} atoms per cm²`, X(lamDL), Y(SP.contAt(lamDL / stretch)) - 4.0 * u,
        { px: 2.2 * u, color: HYDROGEN, alpha: DL.k * lastA * lastO, align: 'center', box: SCENE.ground });
    }
    if (vt >= D.dla.imprint) {
      const lamT = LYA * Math.exp((vt - D.dla.v) / C_KMS), aT = ramp(t, D.dla.t + 0.01, D.dla.t + 0.06);
      text('the galaxy’s hydrogen: a DLA', X(lamT), Y(SP.contAt(lamT / stretch)) - 4.0 * u, { px: 2.2 * u, color: INK, alpha: aT * lastA * lastO, align: 'center', halo: true });
    }
    text('PRIYA (Bird et al. 2023), fake_spectra (S. Bird) · gas view after an idea by Yueying Ni · design after Andrew Pontzen’s DLA animation · quasar light synthetic, metals illustrative',
      P.x0, 97.0 * vh, { px: 1.7 * u, color: MUTED, italic: true });
    if (PLAIN) [[PLAIN.credits, P.x0, 'left'], [PLAIN.right, P.x1, 'right']].forEach(([ls, x, align]) => ls.forEach((l, i, a) =>
      text(l, x, 97.6 * vh - 2.2 * u * (a.length - 1 - i), { px: 1.6 * u, color: MUTED, italic: true, align })));
    const aLv = lastL;
    if (aLv > 0) {
      const bb = bandEl.getBoundingClientRect(), dp = W / innerWidth, ACC = INK_GAS ? BAND.core : '#E8704F', PHOT = INK_GAS ? '#5B4FA8' : '#B9A6FF', k = 1.6 * u;
      const cw = 38 * k, ch = 19 * k, cx0 = bb.right * dp - cw - 2 * u, cy0 = bb.top * dp + 2 * u;
      const bp = lastBP > 0 && lastBP < 1 ? lastBP : 0, cbl = bp ? Math.sin(Math.PI * bp) : 0;
      const run = ramp(bp, 0, 0.32), up = ramp(bp, 0.3, 0.62) * (1 - ramp(bp, 0.84, 1)), hold = ramp(bp, 0.55, 0.65) * (1 - ramp(bp, 0.8, 0.9));
      g.save(); g.globalAlpha = 0.94 * aLv; g.fillStyle = BAND.halo; g.shadowColor = ACC; g.shadowBlur = 3 * u * cbl;
      g.beginPath(); if (g.roundRect) g.roundRect(cx0, cy0, cw, ch, 1.0 * k); else g.rect(cx0, cy0, cw, ch); g.fill();
      g.shadowBlur = 0; g.globalAlpha = (0.3 + 0.5 * cbl) * aLv; g.strokeStyle = cbl > 0.05 ? ACC : BAND.muted; g.lineWidth = Math.max(1, 0.08 * k); g.stroke(); g.restore();
      text('hydrogen’s energy levels', cx0 + 1.6 * k, cy0 + 2.5 * k, { px: 1.75 * k, color: BAND.muted, italic: true, alpha: aLv });
      const lx0 = cx0 + 1.6 * k, lx1 = cx0 + 24 * k, yt = cy0 + 4.8 * k, yb = cy0 + ch - 2.2 * k, yE = n => yt + (yb - yt) / (n * n);
      const lev = (y, a, w, c, dash) => { g.save(); g.globalAlpha = a * aLv; g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; if (dash) g.setLineDash(dash); g.beginPath(); g.moveTo(lx0, y); g.lineTo(lx1, y); g.stroke(); g.restore(); };
      lev(yt, 0.6, Math.max(1, 0.1 * k), BAND.muted, [0.45 * k, 0.35 * k]);
      for (const n of [6, 5, 4, 3]) lev(yE(n), 0.12 + 0.05 * (6 - n), Math.max(1, 0.09 * k), BAND.ink);
      lev(yE(2), 0.9, Math.max(1.5, 0.16 * k), BAND.ink); lev(yE(1), 0.9, Math.max(1.5, 0.16 * k), BAND.ink);
      if (hold > 0) { g.save(); g.shadowColor = ACC; g.shadowBlur = 2.4 * u * hold; lev(yE(2), hold, Math.max(2, 0.3 * k), ACC); g.restore(); }
      for (const [l, e, y] of [['free', '0 eV', yt], ['n = 2', '−3.4 eV', yE(2)], ['n = 1', '−13.6 eV', yE(1)]]) {
        text(l, lx1 + 1.0 * k, y + 0.55 * k, { px: 1.65 * k, color: BAND.ink, alpha: aLv * (l === 'free' ? 0.7 : 1) });
        text(e, cx0 + cw - 1.2 * k, y + 0.55 * k, { px: 1.5 * k, color: BAND.muted, align: 'right', alpha: aLv });
      }
      const ax = cx0 + 15.6 * k, wy = yE(1) - 1.5 * k, wx0 = lx0 + 0.4 * k, wx1 = ax - 0.9 * k, lam = 1.5 * k;
      g.save(); g.globalAlpha = (0.65 - 0.65 * ramp(bp, 0.3, 0.4) * (1 - ramp(bp, 0.9, 1))) * aLv; g.strokeStyle = PHOT; g.lineWidth = Math.max(1.5, 0.16 * k); g.lineCap = 'round'; g.beginPath();
      for (let i = 0; i <= 90; i++) { const x = wx0 + ((wx1 - wx0) * i) / 90, y = wy + 0.5 * k * Math.sin((2 * Math.PI * (x - wx1)) / lam); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke(); g.fillStyle = PHOT; g.beginPath(); g.moveTo(ax - 0.25 * k, wy); g.lineTo(wx1 - 0.2 * k, wy - 0.55 * k); g.lineTo(wx1 - 0.2 * k, wy + 0.55 * k); g.closePath(); g.fill(); g.restore();
      if (run > 0 && run < 1) {
        const xp = lerp(wx0, wx1, run);
        g.save(); g.globalAlpha = aLv * Math.sin(Math.PI * run); g.fillStyle = PHOT; g.shadowColor = PHOT; g.shadowBlur = 2.4 * u; g.beginPath(); g.arc(xp, wy + 0.5 * k * Math.sin((2 * Math.PI * (xp - wx1)) / lam), 0.45 * k, 0, 2 * Math.PI); g.fill(); g.restore();
      }
      text('a 121.6 nm photon', wx0, wy - 1.4 * k, { px: 1.6 * k, color: PHOT, italic: true, alpha: aLv });
      const ya = yE(1), yh = yE(2), lit = Math.max(cbl, 0);
      g.save(); g.globalAlpha = (0.85 + 0.15 * lit) * aLv; g.strokeStyle = ACC; g.fillStyle = ACC; g.lineWidth = Math.max(2, (0.22 + 0.14 * lit) * k); g.lineCap = 'round';
      g.shadowColor = ACC; g.shadowBlur = 2.2 * u * lit; g.beginPath(); g.moveTo(ax, ya - 0.5 * k); g.lineTo(ax, yh + 1.1 * k); g.stroke();
      g.beginPath(); g.moveTo(ax, yh + 0.15 * k); g.lineTo(ax - 0.6 * k, yh + 1.25 * k); g.lineTo(ax + 0.6 * k, yh + 1.25 * k); g.closePath(); g.fill(); g.restore();
      const ye = lerp(ya, yh, up);
      g.save(); g.globalAlpha = aLv; g.fillStyle = BAND.ink; g.shadowColor = ACC; g.shadowBlur = 2.4 * u * up; g.beginPath(); g.arc(ax, ye, (0.42 + 0.12 * up) * k, 0, 2 * Math.PI); g.fill(); g.restore();
      text('Lyman α', ax + 1.4 * k, lerp(ya, yh, 0.5) + 0.9 * k, { px: 2.6 * k, color: ACC, alpha: aLv });
      text('10.2 eV = 13.6 − 3.4', ax + 1.5 * k, lerp(ya, yh, 0.5) + 3.0 * k, { px: 1.6 * k, color: BAND.muted, italic: true, alpha: aLv });
    }
    const RING_V = 1075;
    if (lastH > 0 && vt >= RING_V) {
      const lamS = LYA * Math.exp((vt - RING_V) / C_KMS), xS = X(lamS), yS = Y(0.5 * SP.contAt(lamS / stretch));
      if (inside(xS)) {
        g.save(); g.globalAlpha = lastH; g.strokeStyle = INK_GAS ? BAND.core : '#E8704F'; g.lineWidth = Math.max(2, 0.3 * u); g.beginPath(); g.arc(xS, yS, 2.6 * u, 0, 2 * Math.PI); g.stroke(); g.restore();
        text('one cloud: one dip', xS + 3.2 * u, yS - 1.0 * u, { px: 2.4 * u, color: INK, alpha: lastH, halo: true });
      }
    }
    const aGx = ramp(z, 0.75, 1);
    if (aGx > 0) { const bb = bandEl.getBoundingClientRect(), dp = W / innerWidth;
      text('Sometimes you see a galaxy in the shadow', W / 2, bb.bottom * dp - 2.4 * u, { px: 4.2 * u, color: BAND.ink, align: 'center', alpha: aGx, halo: true, haloColor: BAND.halo }); }
    if (lastHS > 0 && !panelHS()) {
      const ih = (W * 9) / 16, iy = (H - ih) / 2, e = smooth(clamp01(lastSP));
      const sw = 46 * vw, sh = (sw * 9) / 16, sy = 52 * vh - sh / 2;
      const L = { x: lerp(0, 2.5 * vw, e), y: lerp(iy, sy, e), w: lerp(W, sw, e), h: lerp(ih, sh, e) }, Rr = { x: 51.5 * vw, y: sy, w: sw, h: sh };
      g.save(); g.globalAlpha = lastHS; g.fillStyle = SCENE.ground; g.fillRect(0, 0, W, H); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      if (hydPic) { g.globalAlpha = lastHS; g.drawImage(hydPic, L.x, L.y, L.w, L.h); }
      if (starPic && e > 0.5) { g.globalAlpha = lastHS * ramp(e, 0.5, 1); g.drawImage(starPic, Rr.x, Rr.y, Rr.w, Rr.h); }
      g.restore();
      const o = { px: 3.4 * u, color: IMG.ink, align: 'center', halo: true, haloColor: IMG.halo };
      text('our simulation’s hydrogen: it fills the space', W / 2, 84 * vh, { ...o, alpha: lastHS * (1 - ramp(e, 0, 0.3)) });
      text('about three quarters of all ordinary matter', W / 2, 89.5 * vh, { ...o, px: 2.4 * u, alpha: lastHS * (1 - ramp(e, 0, 0.3)) });
      text('hydrogen: it fills the space', L.x + L.w / 2, sy + sh + 4.2 * u, { ...o, px: 3.0 * u, alpha: lastHS * ramp(e, 0.8, 1) });
      text('stars are rarer than hydrogen', Rr.x + Rr.w / 2, sy + sh + 4.2 * u, { ...o, px: 3.0 * u, alpha: lastHS * ramp(e, 0.8, 1) });
      if (hsRatio) text(`the same patch: hydrogen outweighs the stars ${Math.round(hsRatio)} to 1`, W / 2, sy + sh + 9.4 * u, { ...o, px: 2.6 * u, alpha: lastHS * ramp(lastSP, 0.6, 1) });
      text('one patch of a PRIYA run (Bird et al. 2023), z = 3, 10.7 × 6 Mpc/h around the beam’s galaxy; hydrogen: 0.76 of the gas', 8 * vw, 97.6 * vh, { px: 1.6 * u, color: IMG.soft, italic: true, alpha: lastHS, halo: true, haloColor: IMG.halo });
    }
    }
  }

  const redraw = () => { drawGas(lastM, lastT, lastZ); draw(lastM, lastT, lastZ); };
  const warm = bm => { if (gasCanvas.width > 0) { gg.save(); gg.globalAlpha = 0.004; gg.drawImage(bm, 0, 0, gasCanvas.width, gasCanvas.height); gg.restore(); } };
  return {
    setData(d) {
      D = d && d.version === 3 ? d : null; SP = D ? spectrumOf(D) : null;
      if (d && !D) console.warn('the beam\'s data are of an older version (tools/make_beam_media.py)');
      ribbons = []; ready = []; densRibbons = []; starRibbons = [];
      if (D) {
        D.gas.segments.forEach((S, i) => {
          const im = new Image(); im.decoding = 'async';
          ready.push(new Promise(r => {
            im.onload = () => (im.decode ? im.decode() : Promise.resolve()).then(() => (typeof createImageBitmap === 'function' ? createImageBitmap(im) : im))
              .then(bm => { ribbons[i] = bm; warm(bm); redraw(); r(); }, () => { ribbons[i] = im; redraw(); r(); });
            im.onerror = () => { console.warn(`a gas picture is missing (tools/make_beam_media.py): ${S.src}`); r(); };
          }));
          im.src = INK_GAS ? S.src.replace('beam_gas_', 'beam_gas_paper_') : S.src;
          for (const [key, store] of [['dens', densRibbons], ['stars', starRibbons]]) {
            if (!S[key]) continue;
            const im2 = new Image(); im2.decoding = 'async';
            ready.push(new Promise(r => {
              im2.onload = () => (im2.decode ? im2.decode() : Promise.resolve()).then(() => (typeof createImageBitmap === 'function' ? createImageBitmap(im2) : im2))
                .then(bm => { store[i] = bm; warm(bm); redraw(); r(); }, () => { store[i] = im2; redraw(); r(); });
              im2.onerror = () => { console.warn(`a panel picture is missing (tools/make_beam_media.py): ${S[key]}`); r(); };
            }));
            im2.src = INK_GAS ? S[key].replace(/_(\d+)\.jpg$/, '_paper_$1.jpg') : S[key];
          }
        });
        ready.push(fetch(D.strip.src).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
          .then(buf => { setStrip(buf, D.strip); redraw(); }).catch(e => console.warn('the morph\'s strip is missing (tools/make_beam_media.py):', e)));
      }
      redraw();
    },
    render(s) {
      const st = s || {};
      lastM = st.m ?? 1; lastT = st.t || 0; lastZ = st.z || 0;
      lastF = st.f ?? 1; lastHy = st.hy || 0; lastA = st.a ?? 1; lastO = st.o ?? 1; lastL = st.L || 0; lastH = st.h || 0; lastGB = st.gb ?? 1; lastSZ = st.sz || 0;
      lastSC = st.sc || 0; lastTR = st.tr || 0; lastHS = st.hs || 0; lastHSW = st.hsw || 0; lastFC = st.fc || 0; lastWD = st.wd || 0; lastPZ = st.pz || 0; lastGH = st.gh || 0; lastBP = st.bp || 0; lastSP = st.sp || 0; lastFA = st.fa || 0;
      if (zclip) zclip.render({ t: st.u || 0 });
      redraw();
    },
    idle() { if (zclip) zclip.idle(); },
    settle() { return Promise.all([...ready, zclip && D && D.gas.zoom ? zclip.settle() : null]); },
    readRaw() { return new TextEncoder().encode(`beam:${lastM.toFixed(4)}|${lastT.toFixed(4)}|${lastZ.toFixed(4)}|${[lastF, lastHy, lastA, lastO, lastL, lastH, lastGB, lastSZ, lastSC, lastTR, lastHS, lastHSW, lastFC, lastWD, lastPZ, lastGH, lastBP, lastSP, lastFA].map(x => x.toFixed(3)).join(',')}|${zclip ? new TextDecoder().decode(zclip.readRaw()) : ''}|${D ? D.path.n : 0}`); },
    readPixel(x, y) {
      const d = g.getImageData(Math.round(x), Math.round(y), 1, 1).data;
      if (d[3] > 0) return Array.from(d);
      const r = gasCanvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), X = x / (devicePixelRatio || 1) - r.left, Y = y / (devicePixelRatio || 1) - r.top;
      if (X < 0 || Y < 0 || X >= r.width || Y >= r.height) return [12, 18, 27, 255];
      return Array.from(gg.getImageData(Math.round(X * dpr), Math.round(Y * dpr), 1, 1).data);
    },
  };
}
