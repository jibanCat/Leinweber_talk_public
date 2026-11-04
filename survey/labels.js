
import { frameAt, project, sepAngle, newFrame, irisDisc } from './camera.js';
import { mjdToDate, MONTHS, surveyTimes, readBarSpans, READ_BAR_OFF } from './data.js';
import { panelGeom, insetGeom, PANEL, XI_ROW, S_TICKS, shellRadius, insetPhase, lensGeom, lensBins, lensOpen, xiPhase, xiStage, LENS_X, XI_LO,
  formulaGeom, formulaOpen, patchKey, SCALE_H, labelPx, mustPx, axisTitleY, stackGap, INK_UP, INK_DOWN, desiPlotGeom, desiFrameA, desiFitA, patchPanelA, patchRowsA,
  yTitleX, SLICE } from './marks.js';
import { BAO_WORDS, R_D_WORDS, DESI_RES, GAL_SPACING, FEET, SECTION8 } from './provenance.js';
import { lyaGeom, LP, lyaX, glyphGeom, glyphAlpha, GLYPH_WORDS, CONN, CONN_WORDS, pairState, pairGeom, guideA } from './lyapairs.js';
import { plain } from '../chart/plain.js';
import { LW as LW_LEFT } from '../program.js';

export const TRACER_LABELS = ['bright galaxies', 'red galaxies', 'star-forming\ngalaxies', 'quasars', 'Lyα forest'];
export const LYA_LABEL = 'Lyα forest';
export const QUASAR_LABEL = 'quasar';
export const QUASAR_ANCHOR = LW_LEFT ? 'translate(0.3em, calc(-100% - 0.5em))' : 'translate(calc(-100% - 0.3em), calc(-100% - 0.5em))';
export const TOWARDS_US = LW_LEFT ? 'towards us →' : '← towards us';
export const APEX_WORD = 'us';
export const SLICE_WORDS = 'a thin slice, seen from above';
export const DR_NOTE = ['this map: DR1, public', 'DR2’s data: still private', 'my DESI work: mainly DR2'];
export const DR_NOTE_GAP = 1.9, DR_NOTE_PITCH = 1.2;
export const AXIS_S = plain('survey.s', 's [h⁻¹ Mpc]');
export const ARROW_WORDS = { blue: 'bluer', red: 'redder' };
export const PAIR_WORDS = {
  lrg: 'red galaxies', random: 'random points', dd: 'data DD/N_{DD}', rr: 'random RR/N_{RR}',
  est: { lead: 'ξ(s) =', num: 'DD/N_{DD}', den: 'RR/N_{RR}', tail: '− 1', excess: '= excess ÷ (RR/N_{RR})' },
  xi: 'ξ(s)',
  axis: AXIS_S,
  shell: ['comoving sound horizon', `r_{d} ${R_D_WORDS}`, '(published)'],
  desi: plain('survey.desi', 'DESI DR2, all data'),
  bao: plain('survey.baoName', null),
  yCounts: 'pair share', ySq: plain('survey.ySq', 's²ξ [h⁻² Mpc²]'),
  par: 's∥ along', perp: 's⊥ across', hyp: 's',
  zero: '0', lens: `excess, ×${LENS_X}`, lensRandom: 'random', lensData: 'data',
  scale: `${SCALE_H} h⁻¹ Mpc`, los: 'line of sight, to us',
};
export const CLOSE_WORDS = { ring: `BAO ${BAO_WORDS}`, bar: `BAO ${BAO_WORDS}`, res: `resolution ${DESI_RES.words}`,
  gal: `galaxies ${GAL_SPACING.words} apart` };
export const LYA_WORDS = {
  quasars: 'quasars', key: plain('survey.key', '{acc:δ < 0}: more absorption'),
  rowA: 'Lyα × Lyα', rowX: 'Lyα × quasar', y: plain('survey.lyaY', 'r²ξ [h⁻² Mpc²]'), bao: plain('survey.lyaBao', 'BAO'), dip: 'a dip: the forest\nabsorbs', axis: AXIS_S,
  prec: plain('survey.lyaPrec', null),
};
export const lyaCaption = desi => `DESI ${desi.release}, published`;
const LEGEND_EM = [6.6, 7.85];
export const ROT = 'translate(-50%, -50%) rotate(-90deg)';
const ROT_END = /\s*rotate\(-90deg\)\s*$/;
export const LABEL_VH = 3.2;
export const MUST_VH = 4;
export const FOOT_VH = 2.2;

const CSS = `
.svl { position: absolute; left: 0; top: 0; margin: 0; white-space: nowrap; pointer-events: none; opacity: 0;
       font: italic 400 max(${LABEL_VH}vh, 18px)/1 "LyaAlpha", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif; }
.svl.must { font-style: normal; font-size: max(${MUST_VH}vh, 22px); }
.svl.num { font-style: normal; }
.svl.foot { font-size: max(${FOOT_VH}vh, 13px); }
.svl.plate { padding: 0.12em 0.3em; border-radius: 0.2em; }
.svl.card { padding: 0.18em 0.4em; }
.svl.lines { white-space: pre; text-align: center; }
.svl.lines.left { text-align: left; }
.svl.lines.right { text-align: right; }
.svl .up { font-style: normal; }
.svl .bar { display: inline-block; line-height: 0.72em; padding-top: 0.06em; border-top: 0.07em solid currentColor; }
.svl sub { font-size: 0.94em; line-height: 0; vertical-align: -0.22em; }`;

let ACC = '#E8704F';
function setText(p, text) {
  if (!/[α-ωΣ]|_\{|\{acc:|\{bar:/.test(text)) { p.textContent = text; return; }
  p.replaceChildren(...text.split(/(\{acc:[^}]*\}|\{bar:[^}]*\}|[α-ωΣ]+|_\{[^}]*\})/).filter(Boolean).map(t => {
    if (t.startsWith('{acc:')) { const b = document.createElement('span'); b.textContent = t.slice(5, -1); b.style.color = ACC; return b; }
    if (t.startsWith('{bar:')) {
      const b = document.createElement('span'); b.textContent = t.slice(5, -1); b.className = 'bar';
      return b;
    }
    if (t.startsWith('_{')) { const b = document.createElement('sub'); b.textContent = t.slice(2, -1); return b; }
    if (!/^[α-ωΣ]+$/.test(t)) return document.createTextNode(t);
    const u = document.createElement('span'); u.className = 'up'; u.textContent = t; return u;
  }));
}

const c01 = x => Math.min(1, Math.max(0, x));

export const IRIS_BAND = 0.08, EM_NARROW = 0.6, EM_WIDE = 1, INK_PAD = 0.15;
const WIDE = /[A-Z%&+<=>@^~mwφψωΣΔΛΩ⊥∥≈÷−—–→←↑↓×…≤≥±√‰]/u;
export const textEm = s => [...s].reduce((w, c) => w + (WIDE.test(c) ? EM_WIDE : EM_NARROW), 0);
const smooth01 = x => { const t = c01(x); return t * t * (3 - 2 * t); };
const plainText = t => String(t).replace(/\{(?:acc|bar):([^}]*)\}/g, '$1').replace(/_\{([^}]*)\}/g, '$1');
const ANCHORS = new Map();
export function anchorTerms(a) {
  let t = ANCHORS.get(a);
  if (t) return t;
  const m = /^translate\((.*)\)$/.exec(a.trim()), parts = m ? m[1].split(/,(?![^(]*\))/) : ['0', '0'];
  t = [parts[0], parts[1] ?? '0'].map(p => {
    const v = [0, 0, 0];
    for (const term of p.replace(/calc\(|\)/g, '').replace(/([+-])\s+/g, '$1').match(/[+-]?[\d.]+(%|em|px)?/g) || []) {
      const n = parseFloat(term);
      if (term.endsWith('%')) v[0] += n / 100; else if (term.endsWith('em')) v[1] += n; else v[2] += n;
    }
    return v;
  });
  ANCHORS.set(a, t);
  return t;
}
export function labelBox(text, x, y, anchor, em, pad, out = [0, 0, 0, 0]) {
  const lines = plainText(text).split('\n');
  const w = (Math.max(...lines.map(textEm)) + 2 * pad[0]) * em, h = (lines.length + 2 * pad[1]) * em;
  if (ROT_END.test(anchor)) {
    const [bx, by] = anchorTerms(anchor.replace(ROT_END, ''));
    const cx = x + bx[0] * w + bx[1] * em + bx[2] + w / 2, cy = y + by[0] * h + by[1] * em + by[2] + h / 2;
    out[0] = cx - h / 2 - INK_PAD * em; out[2] = cx + h / 2 + INK_PAD * em;
    out[1] = cy - w / 2 - INK_PAD * em; out[3] = cy + w / 2 + INK_PAD * em;
    return out;
  }
  const [ax, ay] = anchorTerms(anchor);
  out[0] = x + ax[0] * w + ax[1] * em + ax[2] - INK_PAD * em; out[2] = out[0] + w + 2 * INK_PAD * em;
  out[1] = y + ay[0] * h + ay[1] * em + ay[2] - INK_PAD * em; out[3] = out[1] + h + 2 * INK_PAD * em;
  return out;
}
const BX = [0, 0, 0, 0];
export function irisGate(IR, box, H) {
  if (!IR.on) return 1;
  const dx = Math.max(Math.abs(box[0] - IR.x), Math.abs(box[2] - IR.x)), dy = Math.max(Math.abs(box[1] - IR.y), Math.abs(box[3] - IR.y));
  return smooth01((IR.r - Math.hypot(dx, dy)) / (IRIS_BAND * H));
}

const FOOT_W = {
  slice: () => 1, cat: st => c01(st.fill * 20), sectors: st => c01(st.sep / 0.3), hero: st => c01(st.cam / 0.3),
  patch: st => st.pbox, counts: st => c01(st.dd / 0.05), randoms: st => c01(Math.max(st.rnd, st.rr) / 0.2),
  xi: st => c01(st.xi / 0.1), rd: st => c01(st.bao / 0.15), desilrg: st => c01(((st.desi || 0) - 0.12) / 0.1), split: st => c01(st.spl / 0.3),
  lyapatch: st => c01(((st.lz || 0) - 0.5) / 0.3), kinds: st => c01(((st.lk || 0) - 0.2) / 0.06),
  desi: st => c01(((st.lA || 0) - 0.05) / 0.1), sample: st => c01((st.lscale || 0) / 0.3),
  ring: st => c01(st.ring / 0.1), spacing: st => c01(st.gap / 0.1),
};
export function footFor(st) {
  const vis = Math.max(st.axes, st.sk, st.opB, st.opL, st.opE, st.opQ, st.opY, st.lfield || 0, st.lpanel || 0, st.pz || 0, st.lz || 0);
  let top = 0, below = 0;
  for (let i = 0; i < FEET.length; i++) if (FOOT_W[FEET[i][0]](st) > 0) { below = top; top = i; }
  const w = FOOT_W[FEET[top][0]](st);
  return w >= 0.5 || top === 0 ? { id: FEET[top][0], a: (top === 0 ? 1 : 2 * w - 1) * vis } : { id: FEET[below][0], a: (1 - 2 * w) * vis };
}

export function createLabels(root, data, pal) {
  if (!document.getElementById('survey-label-css')) {
    const s = document.createElement('style'); s.id = 'survey-label-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  const ink = pal.css, hexOf = rgb => `#${rgb.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;
  const plate = (() => { const g = pal.ground.map(v => Math.round(v * 255)); return `rgba(${g[0]}, ${g[1]}, ${g[2]}, 0.8)`; })();
  const card = (() => { const g = pal.ground.map(v => Math.round(v * 255)); return `rgba(${g[0]}, ${g[1]}, ${g[2]}, 0.97)`; })();
  const mk = (text, cls, colour, kind, plated) => {
    const p = document.createElement('p');
    p.className = `svl ${kind === 'must' ? 'must ' : kind === 'foot' ? 'foot ' : kind === 'num' ? 'num ' : ''}${cls}${plated ? ' plate' : ''}${plated === 'card' ? ' card' : ''}${/\n/.test(text) ? ' lines' : ''}`;
    setText(p, text); p.style.color = colour;
    if (plated) p.style.background = plated === 'card' ? card : plate;
    root.appendChild(p);
    return { p, x: NaN, y: NaN, o: NaN, t: text, k: kind, pad: plated === 'card' ? [0.4, 0.18] : plated ? [0.3, 0.12] : [0, 0] };
  };
  ACC = ink.accent;
  const tracerColour = g => (g === 4 ? ink.accent : hexOf(pal.ink[g]));
  const ticks = data.ticks.map(t => ({ ...mk(`z = ${t.z}`, 'tick', ink.soft, 'sec'), r: t.r }));
  const apex = mk(APEX_WORD, 'apex', ink.soft, 'sec');
  const sliceCap = mk(SLICE_WORDS, 'slice', ink.soft, 'sec');
  const drNote = DR_NOTE.map(t => mk(t, 'drnote', ink.soft, 'sec'));
  const tracers = TRACER_LABELS.map((t, g) => mk(t, g === 4 ? 'tracer r-lya' : 'tracer', tracerColour(g), 'must', true));
  const keys = TRACER_LABELS.map((t, g) => mk(t, g === 4 ? 'tkey r-lya' : 'tkey', tracerColour(g), 'must', true));
  const lya = mk(LYA_LABEL, 'lya r-lya', ink.accent, 'must');
  const date = mk('', 'date', ink.soft, 'sec');
  const quasar = mk(QUASAR_LABEL, 'quasar', ink.text, 'must');
  const tous = mk(TOWARDS_US, 'tous', ink.text, 'must');
  const rbars = data.readSim ? data.readSim.bars.map(len => mk(`${len} h⁻¹ Mpc`, 'rbar', ink.text, 'sec')) : [];
  const rsimName = data.readSim ? mk('simulated absorption (PRIYA)', 'rsim', ink.soft, 'sec') : null;
  const W_ = PAIR_WORDS, pr = data.pairs ? {
    lrg: mk(W_.lrg, 'p-lrg', ink.lrg, 'must'), random: mk(W_.random, 'p-rnd', ink.random, 'must'),
    dd: mk(W_.dd, 'p-dd', ink.text, 'must'), rr: mk(W_.rr, 'p-rr', ink.random, 'must'),
    est: Object.fromEntries(Object.entries(W_.est).map(([k, t]) => [k, mk(t, 'p-est', ink.text, 'must')])),
    xi: mk(W_.xi, 'p-xi', ink.text, 'must'),
    axis: mk(W_.axis, 'p-axis', ink.text, 'must'),
    shell: W_.shell.map((t, i) => (i < 2 ? mk(t, 'p-shell', ink.text, 'must', 'card') : mk(t, 'p-shell', ink.soft, 'sec', 'card'))),
    desi: data.desi && data.desi.lrg ? mk(W_.desi, 'p-desi', ink.soft, 'sec') : null,
    bao: W_.bao && data.desi && data.desi.lrg ? mk(W_.bao, 'p-bao left', ink.text, 'sec') : null,
    yCounts: mk(W_.yCounts, 'p-ytitle', ink.text, 'must'),
    ySq: data.desi && data.desi.lrg ? mk(W_.ySq, 'p-ytitle', ink.text, 'must') : null,
    zero: mk(W_.zero, 'p-zero', ink.soft, 'num'),
    lens: lensBins().map(b => {
      const lo = data.pairs.bins.sMin + b * data.pairs.bins.w;
      return [mk(W_.lens, 'p-lens', ink.lrg, 'must'), mk(`s = ${lo}–${lo + data.pairs.bins.w}`, 'p-lens', ink.text, 'must'),
        mk(W_.lensRandom, 'p-lens-w', ink.random, 'sec'), mk(W_.lensData, 'p-lens-w', ink.soft, 'sec')];
    }),
    par: mk(W_.par, 'p-par', ink.text, 'must', true), perp: mk(W_.perp, 'p-perp', ink.text, 'must', true),
    hyp: mk(W_.hyp, 'p-hyp', ink.text, 'must', true),
    ticks: S_TICKS.map(v => ({ ...mk(String(v), 'p-tick', ink.soft, 'num'), v })),
    scale: mk(W_.scale, 'p-scale', ink.soft, 'sec'), los: mk(W_.los, 'p-los', ink.soft, 'sec'),
  } : null;
  const LY = data.lya, LW = LYA_WORDS, DS = data.desi, ly = LY ? {
    quasars: mk(LW.quasars, 'l-q', ink.qso, 'must'), key: mk(LW.key, 'l-key r-lya', ink.text, 'must'),
    pairs: Object.fromEntries(CONN.filter(k => LY.pairs[k]).map(k => [k, mk(CONN_WORDS[k], `l-pair l-pair-${k}`, ink.text, 'must', true)])),
    panel: DS && DS.auto && DS.cross ? {
      cap: mk(lyaCaption(DS), 'l-cap', ink.soft, 'sec'),
      rowA: mk(LW.rowA, 'l-row', ink.text, 'must'), rowX: mk(LW.rowX, 'l-row', ink.text, 'must'),
      y: mk(LW.y, 'l-y l-ytitle', ink.text, 'must'), bao: mk(LW.bao, 'l-bao', ink.soft, 'sec'), dip: mk(LW.dip, 'l-dip right', ink.soft, 'sec'),
      ...(LW.prec ? { prec: mk(LW.prec, 'l-row left', ink.accent, 'sec') } : {}),
      ticks: LP.ticks.map(v => ({ ...mk(String(v), 'l-tick', ink.soft, 'num'), v })), axis: mk(LW.axis, 'l-axis', ink.text, 'must'),
    } : null,
    scale: [LY.words.pixelQuasarPairs, LY.words.pixelPairs, LY.words.share]
      .map((t, i) => mk(t, i === 1 ? 'l-scale r-lya' : 'l-scale', i === 1 ? ink.accent : ink.text, 'must', true)),
    glyph: { title: mk(GLYPH_WORDS.title, 'l-glyph', ink.text, 'must'), f: mk(GLYPH_WORDS.f, 'l-glyph-f', ink.soft, 'sec'),
      mean: mk(GLYPH_WORDS.mean, 'l-glyph-m', ink.soft, 'sec'), less: mk(GLYPH_WORDS.less, 'l-glyph-l', ink.soft, 'sec') },
  } : null;
  const LG = {};
  const sp = data.spacing;
  const cl = {
    ring: mk(CLOSE_WORDS.ring, 'c-ring', ink.text, 'must', true),
    res: sp ? mk(CLOSE_WORDS.res, 'c-scale c-res', ink.text, 'must') : null,
    gal: sp ? mk(CLOSE_WORDS.gal, 'c-scale c-gal', ink.text, 'must') : null,
    bar: sp ? mk(CLOSE_WORDS.bar, 'c-scale c-bar', ink.text, 'must') : null,
    blue: sp ? mk(ARROW_WORDS.blue, 'c-arrow', ink.soft, 'sec') : null,
    red: sp ? mk(ARROW_WORDS.red, 'c-arrow', ink.soft, 'sec') : null,
  };
  const fmtInt = v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const FOOTS = Object.fromEntries(FEET.map(([id, t]) => [id, t.replace(/\{targetid\}/g, SECTION8.targetid)
    .replace(/\{z\}/g, SECTION8.zq.toFixed(2)).replace(/\{forests\}/g, LY && LY.forests ? fmtInt(LY.forests) : 'all')
    .replace(/\{lrgz\}/g, data.desi && data.desi.lrg ? `${data.desi.lrg.zRange[0]} < z < ${data.desi.lrg.zRange[1]}` : '')
    .replace(/\{apart\}/g, LY ? LY.words.apart : '')
    .replace(/\{lyaz\}/g, data.desi && data.desi.auto ? `z = ${data.desi.auto.zEff}` : '')]));
  const foot = mk('', 'foot', ink.foot || ink.soft, 'foot');
  const F = newFrame(), P = [0, 0], Q = [0, 0], TH = [0, 0, 0, 0], geo = data.geo, G = {}, I = {}, IR = {}, FG = {}, PK = {}, GG = {}, DI = {};
  const PS = {}, PG = { P: [0, 0], Q: [0, 0] };

  let clip = '', gH = 0, gfs = 0, gmfs = 0;
  const boxOf = (L, x, y, anchor, out) => labelBox(L.t, x, y, anchor, L.k === 'must' ? gmfs : gfs, L.pad, out);
  function place(L, x, y, o, anchor, text, gate) {
    if (text !== undefined && text !== L.t) { setText(L.p, text); L.t = text; }
    const g = gate ?? (IR.on && L.k !== 'foot' && o > 0 ? irisGate(IR, boxOf(L, x, y, anchor, BX), gH) : 1);
    const xo = Math.round(x * 10) / 10, yo = Math.round(y * 10) / 10, oo = Math.round(Math.max(0, Math.min(1, o * g)) * 1000) / 1000;
    if (oo !== L.o) { L.p.style.opacity = oo; L.o = oo; }
    if (oo > 0 && (xo !== L.x || yo !== L.y)) { L.p.style.transform = `translate(${xo}px, ${yo}px) ${anchor}`; L.x = xo; L.y = yo; }
    if (oo === 0 && L.x !== undefined) { L.p.style.transform = ''; L.x = L.y = undefined; }
  }
  const UB = [0, 0, 0, 0];
  function placeBlock(rows) {
    let g = 1;
    if (IR.on) {
      UB[0] = UB[1] = Infinity; UB[2] = UB[3] = -Infinity;
      for (const [L, x, y, o, anchor, text] of rows) {
        if (!(o > 0)) continue;
        if (text !== undefined && text !== L.t) { setText(L.p, text); L.t = text; }
        boxOf(L, x, y, anchor, BX);
        UB[0] = Math.min(UB[0], BX[0]); UB[1] = Math.min(UB[1], BX[1]); UB[2] = Math.max(UB[2], BX[2]); UB[3] = Math.max(UB[3], BX[3]);
      }
      if (UB[0] <= UB[2]) g = irisGate(IR, UB, gH);
    }
    for (const [L, x, y, o, anchor, text] of rows) place(L, x, y, o, anchor, text, g);
  }
  const polar = (r, t, out) => project(F, r * Math.sin(t), r * Math.cos(t), out);

  function update(st, W, H) {
    frameAt(data, st, W, H, F);
    irisDisc(data, st, W, H, IR);
    const c = IR.on ? `circle(${Math.round(IR.r * 10) / 10}px at ${Math.round(IR.x * 10) / 10}px ${Math.round(IR.y * 10) / 10}px)` : '';
    if (c !== clip && root.style) { root.style.clipPath = c; clip = c; }
    const mkA = st.mk ?? 1, fs = labelPx(H), mfs = mustPx(H);
    gH = H; gfs = fs; gmfs = mfs;
    const tEdge = sepAngle(geo, 4, geo.theta1, st.sep);
    for (const t of ticks) {
      polar(t.r, tEdge, P);
      place(t, P[0], P[1], st.zlab * st.axes, 'translate(0.45em, -50%)');
    }
    project(F, 0, 0, P);
    place(apex, P[0], P[1] + 0.2 * fs, st.zlab * st.axes, 'translate(-50%, 0)');
    place(sliceCap, 0.08 * W, SLICE.captionY * H, st.slice || 0, 'translate(0, -50%)');
    const ops = [st.opB, st.opL, st.opE, st.opQ, st.opY];
    const secOn = c01((st.sep - 0.5) / 0.3), keyOn = 1 - c01(st.sep / 0.3);
    tracers.forEach((L, g) => {
      const r = data.groupR[g].p95 + 0.035 * geo.rMax, a = sepAngle(geo, g, geo.thetaMid, st.sep);
      polar(r, a, P);
      place(L, P[0], P[1], st.tlab * secOn * Math.max(ops[g], g === 4 ? st.sk : 0), 'translate(-50%, -100%)');
    });
    keys.forEach((L, g) => {
      polar(data.groupR[g].med, geo.thetaMid, P);
      place(L, P[0], P[1], (st.tkey || 0) * keyOn * Math.max(ops[g], g === 4 ? st.sk : 0), 'translate(-50%, -50%)');
    });
    polar(data.skewers.midR, geo.theta0, P);
    place(lya, P[0], P[1], st.lyalab * st.sk, 'translate(calc(-100% - 0.45em), -50%)');
    const h = data.skewers.hero;
    if (h) {
      project(F, h.qx, h.qy, P); place(quasar, P[0], P[1], st.heroQ || 0, QUASAR_ANCHOR);
      project(F, h.rStart * Math.sin(h.theta), h.rStart * Math.cos(h.theta), P);
      place(tous, P[0], P[1] + 0.35 * mfs, (st.heroQ || 0) * st.cam, LW_LEFT ? 'translate(-100%, 0)' : 'translate(0, 0)');
      if (data.readSim) {
        const uu = Math.min(H / 100, 0.5625 * W / 100), set = 1 - (st.settle || 0), sn = Math.sin(h.theta), cs = Math.cos(h.theta);
        readBarSpans(h, data.readSim.bars).forEach(([r0, r1], q) => {
          project(F, ((r0 + r1) / 2) * sn, ((r0 + r1) / 2) * cs, P);
          place(rbars[q], P[0], P[1] + READ_BAR_OFF * uu + 0.6 * uu, (st.rs || 0) * set, 'translate(-50%, 0)');
        });
        const rm = h.rStart + 0.8 * (h.rEnd - h.rStart);
        project(F, rm * sn, rm * cs, P);
        place(rsimName, P[0], P[1] + READ_BAR_OFF * uu + 0.6 * uu, Math.min(1, 2 * (st.ra || 0)) * set * (st.rs || 0), 'translate(-50%, 0)');
      }
    }
    if (Number.isFinite(data.day0)) {
      surveyTimes(data, st, TH);
      const tSurvey = Math.min(data.D - 1, Math.max(0, TH[0], TH[1], TH[2], TH[3]));
      const d = mjdToDate(data.day0 + Math.floor(tSurvey));
      const text = `observed through ${MONTHS[d.m - 1]} ${d.y}${data.placeholder ? ' (placeholder dates)' : ''}`;
      place(date, 0.08 * W, SLICE.captionY * H, st.date, 'translate(0, -50%)', text);
    }
    {
      const o = c01(((st.dr || 0) - 0.5) / 0.5), y3 = SLICE.captionY * H - DR_NOTE_GAP * fs;
      placeBlock(drNote.map((L, i) => [L, 0.08 * W, y3 - (drNote.length - 1 - i) * DR_NOTE_PITCH * fs, o, 'translate(0, -50%)']));
    }

    if (pr) {
      const pt = data.pairs.patch, pp = data.pairs;
      panelGeom(pp, W, H, G);
      polar(pt.r1, pt.tc, Q);
      const yTop = Math.min(Q[1], (polar(pt.r1, pt.ta, P), P[1]), (polar(pt.r1, pt.tb, P), P[1])) - 6;
      polar(pt.r1, pt.ta, P);
      place(pr.lrg, P[0], yTop, st.pbox * mkA, 'translate(0, -100%)');
      polar(pt.r1, pt.tb, P);
      place(pr.random, P[0], yTop, st.rnd * mkA, 'translate(-100%, -100%)');
      patchKey(data, F, W, H, PK);
      if (!(ly && (st.lz || 0) >= 0.5)) {
        place(pr.scale, (PK.bx0 + PK.bx1) / 2, PK.bwy, st.pbox * mkA, 'translate(-50%, -50%)');
        place(pr.los, PK.awx, PK.awy, st.pbox * mkA, 'translate(0, -50%)');
      }
      const lr = Math.min(G.x1, 0.97 * W), lx = Math.min(G.x0, lr - (LEGEND_EM[0] + LEGEND_EM[1]) * mfs - 24);
      const ppA = patchRowsA(st);
      place(pr.dd, lx, G.legendY, st.panel * mkA * ppA, 'translate(0, -50%)');
      place(pr.rr, lr, G.legendY, c01(st.rr * 6) * st.panel * mkA * ppA, 'translate(-100%, -50%)');
      const yx = yTitleX(G.x0, H);
      place(pr.yCounts, yx, (G.cTop + G.cBase) / 2, st.panel * mkA * ppA, ROT);
      formulaGeom(data, F, W, H, FG);
      const fo = formulaOpen(st) * mkA * c01(st.xi / 0.1), first = xiStage(xiPhase(st.xi, 0, pp.bins.nb), 'drop');
      placeBlock([[pr.est.lead, FG.xEq, FG.yBar, fo, 'translate(-100%, -50%)'], [pr.est.num, FG.xMid, FG.yNum, fo, 'translate(-50%, -50%)'],
        [pr.est.den, FG.xMid, FG.yDen, fo, 'translate(-50%, -50%)'], [pr.est.tail, FG.xTail, FG.yBar, fo, 'translate(0, -50%)'],
        [pr.est.excess, FG.x, FG.yEx, first * formulaOpen(st) * mkA, 'translate(0, -50%)']]);
      for (const t of pr.ticks) place(t, G.x0 + t.v * G.sx, G.tickY, st.panel * mkA, 'translate(-50%, 0)');
      place(pr.axis, G.x1, G.axisY, st.panel * mkA, 'translate(-100%, -50%)');
      if (pr.desi) {
        desiPlotGeom(pp, data.desi, W, H, DI);
        const da = desiFrameA(st) * mkA;
        place(pr.desi, DI.x0, DI.capY, da, 'translate(0, -50%)');
        if (pr.bao) place(pr.bao, DI.xOf(115), DI.y0 + 0.4 * fs, desiFitA(st) * mkA, 'translate(0, 0)');
        place(pr.ySq, yx, DI.yc, da, ROT);
      }
      const y0 = G.xBot - (0 - XI_LO) / (G.xiHi - XI_LO) * (G.xBot - G.xTop);
      place(pr.zero, G.x0 - 8, y0, (XI_ROW ? 1 : 0) * st.panel * mkA * ppA, 'translate(-100%, -50%)');
      place(pr.xi, yx, (G.xTop + G.xBot) / 2, first * st.panel * mkA * ppA, ROT);
      const LG = {};
      lensBins().forEach((b, i) => {
        lensGeom(data, F, W, H, i, LG);
        const o = lensOpen(st, xiPhase(st.xi, b, pp.bins.nb)) * mkA, L = pr.lens[i];
        placeBlock([[L[0], LG.cx, LG.t1, o, 'translate(-50%, -50%)'], [L[1], LG.cx, LG.t2, o, 'translate(-50%, -50%)']]);
        place(L[2], LG.xr, LG.wordY, o, 'translate(-50%, -50%)');
        place(L[3], LG.xd, LG.wordY, o, 'translate(-50%, -50%)');
      });
      const g = pp.g, gx = pp.dx[g], gy = pp.dy[g];
      project(F, gx, gy, P);
      const rs = shellRadius(st.bao) * F.k;
      const shY = [P[1] - rs - 10 - 0.61 * mfs, P[1] + rs + 10 + 0.61 * mfs, P[1] + rs + 10 + 0.61 * mfs + 1.2 * mfs];
      placeBlock(pr.shell.map((L, i) => [L, P[0], shY[i], c01((st.bao - 0.75) / 0.15) * (1 - c01(st.spl / 0.3)) * mkA, 'translate(-50%, -50%)']));
      const k = pp.split;
      if (k >= 0) {
        const xx = pp.dx[k], xy = pp.dy[k];
        const mx = (gx + xx) / 2, my = (gy + xy) / 2, ml = Math.hypot(mx, my), ux = mx / ml, uy = my / ml;
        const par = (xx - gx) * ux + (xy - gy) * uy, cx = gx + par * ux, cy = gy + par * uy;
        project(F, (gx + cx) / 2, (gy + cy) / 2, P);
        project(F, xx, xy, Q);
        const side = Q[0] > P[0] ? -1 : 1;
        place(pr.par, P[0] + side * 12, P[1], c01((st.spl - 0.4) / 0.3) * mkA,
          side > 0 ? 'translate(0, -50%)' : 'translate(-100%, -50%)');
        project(F, (cx + xx) / 2, (cy + xy) / 2, Q);
        place(pr.perp, Q[0], Q[1] + (P[1] < Q[1] ? 10 : -10), c01((st.spl - 0.7) / 0.3) * mkA,
          P[1] < Q[1] ? 'translate(-50%, 0)' : 'translate(-50%, -100%)');
        const HA = [0, 0], HB = [0, 0], HC = [0, 0];
        project(F, gx, gy, HA); project(F, xx, xy, HB); project(F, cx, cy, HC);
        const hx = (HA[0] + HB[0]) / 2, hy = (HA[1] + HB[1]) / 2, ox = hx - HC[0], oy = hy - HC[1], ol = Math.hypot(ox, oy) || 1;
        place(pr.hyp, hx + ox / ol * 0.75 * mfs, hy + oy / ol * 0.75 * mfs, c01((st.spl - 0.15) / 0.25) * mkA, 'translate(-50%, -50%)');
      }
    }

    if (ly) {
      const pt = LY.patch, sm = x => { const t = c01(x); return t * t * (3 - 2 * t); };
      polar(pt.r1, pt.tc, Q);
      const yTop = Math.min(Q[1], (polar(pt.r1, pt.ta, P), P[1]), (polar(pt.r1, pt.tb, P), P[1])) - 6;
      polar(pt.r1, pt.ta, P);
      const lo = st.lq * (1 - sm((st.lscale || 0) / 0.45));
      place(ly.quasars, P[0], yTop, lo, 'translate(0, -100%)');
      polar(pt.r1, pt.tb, P);
      place(ly.key, P[0], yTop, Math.min(lo, c01((st.lfield || 0) / 0.5)), 'translate(-100%, -100%)');
      patchKey(data, F, W, H, PK, pt);
      if (pr && (st.lz || 0) >= 0.5) {
        place(pr.scale, (PK.bx0 + PK.bx1) / 2, PK.bwy, st.lq, 'translate(-50%, -50%)');
        place(pr.los, PK.awx, PK.awy, st.lq, 'translate(0, -50%)');
      }
      const ga = glyphAlpha(st);
      glyphGeom(LY, W, H, GG);
      place(ly.glyph.title, GG.x0, GG.titleY, ga, 'translate(0, -50%)');
      place(ly.glyph.f, GG.x1, GG.titleY, ga, 'translate(-100%, -50%)');
      place(ly.glyph.mean, GG.x0 - 8, GG.yMean, ga, 'translate(-100%, -50%)');
      place(ly.glyph.less, GG.xLess, GG.yLess, ga, 'translate(-50%, 0)');
      for (const k of Object.keys(ly.pairs)) {
        const o = pairState(st, k, PS).label;
        if (o > 0) pairGeom(LY, k, F, W, H, PG);
        place(ly.pairs[k], o > 0 ? PG.lx : 0, o > 0 ? PG.ly : 0, o, 'translate(0, 0)');
      }
      const D = ly.panel;
      if (D) {
        const pa = st.lpanel || 0, out = 1 - sm((st.lscale || 0) / 0.2);
        lyaGeom(DS, W, H, G);
        place(D.cap, G.x0, G.cap, pa, 'translate(0, -50%)');
        place(D.rowA, G.x0, G.A.title, pa, 'translate(0, -50%)');
        place(D.rowX, G.x0, G.X.title, pa * c01((st.lX || 0) / 0.05), 'translate(0, -50%)');
        if (D.prec) place(D.prec, G.x0, axisTitleY(G.axis + 0.014 * H, fs, mfs) + 0.9 * fs, guideA(st) * (1 - c01((st.lX || 0) / 0.05)), 'translate(0, 0)');
        place(D.y, yTitleX(G.x0, H), LP.A.bot === LP.axis ? (G.A.top + G.A.bot) / 2 : (G.A.top + G.X.bot) / 2, pa, ROT);
        place(D.bao, lyaX(G, LP.guide), G.A.top - 0.3 * fs, guideA(st), 'translate(-50%, -100%)');
        place(D.dip, G.x1, G.axis - 0.6 * fs, sm(((st.lX || 0) - 0.9) / 0.08) * out, 'translate(-100%, -100%)');
        const tickY = G.axis + 0.014 * H, axisY = axisTitleY(tickY, fs, mfs);
        for (const t of D.ticks) place(t, lyaX(G, t.v), tickY, pa, 'translate(-50%, 0)');
        place(D.axis, G.x1, axisY, pa, 'translate(-100%, -50%)');
      }
      polar((pt.r0 + pt.r1) / 2, pt.tc, P);
      placeBlock(ly.scale.map((L, i) => [L, P[0], P[1] + (i - 1) * 1.36 * mfs, sm((st.lscale - 0.5) / 0.5), 'translate(-50%, -50%)']));
    }

    project(F, data.ring.x, data.ring.y, P);
    const rp = data.ring.r * F.k;
    place(cl.ring, P[0] + 0.75 * rp + 6, P[1] - 0.75 * rp - 6, c01((st.ring - 0.85) / 0.15) * mkA, 'translate(0, -100%)');
    if (cl.res) {
      insetGeom(data, F, W, H, I);
      place(cl.res, I.res1 + 12, I.resY, insetPhase(st.gap, 'res') * mkA, 'translate(0, -50%)');
      place(cl.gal, I.gal1 + 12, I.galY, insetPhase(st.gap, 'gal') * mkA, 'translate(0, -50%)');
      place(cl.bar, I.barEnd + 12, I.barY, insetPhase(st.gap, 'barWords') * mkA, 'translate(0, -50%)');
      const aw = insetPhase(st.gap, 'ticks') * mkA;
      place(cl.blue, I.x0 + I.pad, I.arrowWordsY, aw, 'translate(0, -50%)');
      place(cl.red, I.x0 + I.pad + I.innerW, I.arrowWordsY, aw, 'translate(-100%, -50%)');
    }

    const ft = footFor(st);
    place(foot, 0.08 * W, 0.965 * H, ft.a, 'translate(0, -100%)', FOOTS[ft.id]);
  }
  return { update, root, panel: PANEL, footText: id => FOOTS[id] };
}
