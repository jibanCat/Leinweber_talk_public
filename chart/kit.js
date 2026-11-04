
export const SERIF = '"LyaAlpha", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';

export const TEXT = { min: 3.0, label: 4.0, title: 4.0, tick: 3.0, foot: 2.2, stamp: 6.0 };
const SUBSCALE = 0.7;

const PAPER_TRACERS = {
  BGS: { color: '#5B6472', glyph: 'circle-open' },
  LRG1: { color: '#1F2732', glyph: 'circle' },
  LRG2: { color: '#1F2732', glyph: 'circle' },
  'LRG3+ELG1': { color: '#3A4452', glyph: 'diamond' },
  ELG2: { color: '#5B6472', glyph: 'diamond-open' },
  QSO: { color: '#4A5464', glyph: 'square' },
  LYA: { color: '#B93A20', glyph: 'circle', accent: true },
  ALL: { color: '#1F2732', glyph: 'circle' },
  OTHER: { color: '#4A5464', glyph: 'circle' },
};
const DARK_TRACERS = {
  BGS: { color: '#9ACD32', glyph: 'circle-open' },
  LRG1: { color: '#F2B33D', glyph: 'circle' },
  LRG2: { color: '#F2B33D', glyph: 'circle' },
  'LRG3+ELG1': { color: '#9A8FE6', glyph: 'diamond' },
  ELG2: { color: '#7FB0DA', glyph: 'diamond-open' },
  QSO: { color: '#5FBF8A', glyph: 'square' },
  LYA: { color: '#E8704F', glyph: 'circle', accent: true },
  ALL: { color: '#E9E6DF', glyph: 'circle' },
  OTHER: { color: '#B4BDCA', glyph: 'circle' },
};

export const LOOKS = {
  paper: {
    name: 'paper',
    ground: '#F4F2ED',
    ink: '#1F2732',
    muted: '#4A5566',
    foot: '#717F93',
    wash: '#7D8DA3',
    hair: '#7D8DA3',
    accent: '#B93A20',
    stamp: '#B93A20',
    tracers: PAPER_TRACERS,
    fill68: 0.22, fill68Accent: 0.32, fill68All: 0.62, line95: 1.6, line68: 1.1,
    pale: 0.35,
  },
  dark: {
    name: 'dark',
    ground: '#0C121B',
    ink: '#E9E6DF',
    muted: '#A9B3C2',
    foot: '#626E80',
    wash: '#7D8DA3',
    hair: '#8793A6',
    accent: '#E8704F',
    stamp: '#E8704F',
    tracers: DARK_TRACERS,
    fill68: 0.26, fill68Accent: 0.34, fill68All: 0.55, line95: 1.6, line68: 1.1,
    pale: 0.4,
  },
};

export function resolveLook(explicit) {
  const ok = v => (v === 'paper' || v === 'dark' ? v : null);
  if (ok(explicit)) return explicit;
  const g = typeof globalThis !== 'undefined' ? globalThis : {};
  if (ok(g.__chartLook)) return g.__chartLook;
  return 'paper';
}

export function resolveTest(explicit) {
  if (explicit === true || explicit === false) return explicit;
  const g = typeof globalThis !== 'undefined' ? globalThis : {};
  if (g.__chartTest === true) return true;
  try { if (g.location && g.location.search) return new URLSearchParams(g.location.search).has('test'); } catch { }
  return false;
}
export const mixHex = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');

export function tracerKey(name) {
  const s = String(name || '').toUpperCase().replace(/[\s_-]+/g, '').replace('Α', 'A');
  if (s.startsWith('LY')) return 'LYA';
  if (s.includes('LRG') && s.includes('ELG')) return 'LRG3+ELG1';
  if (s === 'LRG1' || s === 'LRG2') return s;
  if (s.startsWith('ELG')) return 'ELG2';
  if (s.startsWith('BGS')) return 'BGS';
  if (s.startsWith('QSO')) return 'QSO';
  if (s === 'ALL' || s.startsWith('ALL') || s.startsWith('COMBINED') || s.startsWith('DESI')) return 'ALL';
  if (s.startsWith('LRG')) return 'LRG1';
  return 'OTHER';
}
export const tracerStyle = (T, name) => T.tracers[tracerKey(name)] || T.tracers.OTHER;
export const PLAIN = { BGS: 'bright galaxies', LRG1: 'red galaxies', LRG2: 'red galaxies', 'LRG3+ELG1': 'red + star-forming galaxies',
  ELG2: 'star-forming galaxies', QSO: 'quasars', LYA: 'Lyα' };
const SHARED = new Set(['LRG1', 'LRG2']);
export function plainName(id, z = null, o = {}) {
  const k = tracerKey(id), raw = String(id || '').toUpperCase().replace(/\s+/g, '');
  const key = /^LRG3$/.test(raw) ? 'LRG3' : k;
  let n = PLAIN[key === 'LRG3' ? 'LRG1' : key];
  if (!n) return String(id);
  if (o.short) n = n.replace(/ galaxies$/, '');
  return (SHARED.has(key) || key === 'LRG3') && z !== null && o.z !== false ? `${n} · z = ${z}` : n;
}

export const unit = (W, H) => Math.min(H, (W * 9) / 16) / 100;

export function parseMarkup(str) {
  const out = [];
  let buf = '', i = 0;
  const flush = () => { if (buf) { out.push({ t: buf, kind: 'n' }); buf = ''; } };
  while (i < str.length) {
    const c = str[i];
    if (c === '\\' && (str[i + 1] === '_' || str[i + 1] === '^')) { buf += str[i + 1]; i += 2; continue; }
    if ((c === '_' || c === '^') && i + 1 < str.length) {
      flush();
      const kind = c === '_' ? 'sub' : 'sup';
      if (str[i + 1] === '{') {
        const j = str.indexOf('}', i + 2);
        const end = j < 0 ? str.length : j;
        out.push({ t: str.slice(i + 2, end), kind });
        i = end + 1;
      } else {
        const m = /^[\p{L}\p{N}]+/u.exec(str.slice(i + 1));
        const t = m ? m[0] : String.fromCodePoint(str.codePointAt(i + 1));
        out.push({ t, kind });
        i += 1 + t.length;
      }
      continue;
    }
    buf += c; i++;
  }
  flush();
  return out;
}
export const plain = str => parseMarkup(String(str)).map(s => s.t).join('');

export const fontOf = (px, italic = false, weight = 400, exact = false) => `${italic ? 'italic ' : ''}${weight} ${exact ? Math.max(1, +px.toFixed(2)) : Math.max(1, Math.round(px))}px ${SERIF}`;

export function measure(g, str, px, italic = false) {
  let w = 0;
  for (const seg of parseMarkup(typo(str))) {
    g.font = fontOf(seg.kind === 'n' ? px : px * SUBSCALE, italic);
    w += g.measureText(seg.t).width;
  }
  return w;
}

const SUBD = '₀₁₂₃₄₅₆₇₈₉';
export const typo = s => String(s).replace(/(\p{L}|\d|\))'(?=\p{L}|\s|$)/gu, '$1\u2019').replace(/(\S)([₀-₉]+)/gu, (m0, a, d) => `${a}_{${[...d].map(c => SUBD.indexOf(c)).join('')}}`);
export function tagged(g, tag, fn) {
  if (!g.__tag) return fn();
  g.save(); g.__tag(tag);
  try { return fn(); } finally { g.restore(); }
}
const INK_PAD = 0.15;
export function irisGate(I, box, em = 0) {
  if (!I) return 1;
  const p = INK_PAD * em, x0 = box.x - p, x1 = box.x + box.w + p, y0 = box.y - p, y1 = box.y + box.h + p;
  const d = I.keep === 'inside'
    ? I.r - Math.hypot(Math.max(Math.abs(x0 - I.x), Math.abs(x1 - I.x)), Math.max(Math.abs(y0 - I.y), Math.abs(y1 - I.y)))
    : Math.hypot(Math.max(x0 - I.x, 0, I.x - x1), Math.max(y0 - I.y, 0, I.y - y1)) - I.r;
  const b = Math.min(I.band, I.r);
  return b > 0 ? smooth(d / b) : d > 0 ? 1 : 0;
}
export function irisBlock(g, box, em, fn) {
  if (!g.__iris || g.__irisFix !== undefined) return fn();
  g.__irisFix = irisGate(g.__iris, box, em);
  try { return fn(); } finally { g.__irisFix = undefined; }
}
export function text(g, str, x, y, o = {}) {
  const px = o.px, segs = parseMarkup(typo(str));
  if (!segs.length || !(px > 0)) return { x, y, w: 0, h: 0 };
  const widths = segs.map(seg => { g.font = fontOf(seg.kind === 'n' ? px : px * SUBSCALE, o.italic, 400, o.exact); return g.measureText(seg.t).width; });
  const w = widths.reduce((a, b) => a + b, 0);
  let x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  const box = { x: x0, y: y - 0.8 * px, w, h: 1.05 * px };
  const gate = g.__iris ? (g.__irisFix !== undefined ? g.__irisFix : irisGate(g.__iris, box, px)) : 1;
  const alpha = (o.alpha === undefined ? 1 : o.alpha) * gate;
  if (alpha <= 0) return box;
  g.save();
  g.globalAlpha *= Math.min(1, alpha);
  g.fillStyle = o.color || '#000';
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  if (g.__group && !o.cont) g.__group();
  segs.forEach((seg, i) => {
    g.font = fontOf(seg.kind === 'n' ? px : px * SUBSCALE, o.italic, 400, o.exact);
    const dy = seg.kind === 'sub' ? 0.22 * px : seg.kind === 'sup' ? -0.38 * px : 0;
    if (g.__note) g.__note(seg.kind === 'n' ? (o.role || 'text') : seg.kind, seg.t);
    g.fillText(seg.t, x0, y + dy);
    x0 += widths[i];
  });
  g.restore();
  return box;
}

export function textRuns(g, runs, x, y, o = {}) {
  const rs = runs.filter(r => r && r.t);
  if (!rs.length) return { x, y, w: 0, h: 0 };
  const ws = rs.map(r => measure(g, r.t, r.px || o.px, r.italic ?? o.italic));
  const W = ws.reduce((a, b) => a + b, 0), px0 = rs[0].px || o.px;
  let x0 = o.align === 'center' ? x - W / 2 : o.align === 'right' ? x - W : x;
  const box = { x: x0, y: y - 0.8 * px0, w: W, h: 1.05 * px0 };
  irisBlock(g, box, px0, () => rs.forEach((r, i) => { text(g, r.t, x0, y, { ...o, align: 'left', px: r.px || o.px, color: r.color || o.color, italic: r.italic ?? o.italic, cont: i > 0 }); x0 += ws[i]; }));
  return box;
}
export const sigSplit = L => { const m = /^(.*?:)\s*([−-]?[\d.]+\s?σ)$/.exec(String(L)); return m ? [m[1], ` ${m[2]}`] : null; };

export function wrap(g, str, maxW, px, italic = false) {
  const lines = [];
  for (const para of String(str).split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word;
      if (line && measure(g, trial, px, italic) > maxW) { lines.push(line); line = word; } else line = trial;
    }
    lines.push(line);
  }
  return lines;
}

export const MINUS = '−';
export function fmt(v, decimals = 2) {
  let s = Number(v).toFixed(Math.max(0, decimals));
  if (/^-0(\.0+)?$/.test(s)) s = s.slice(1);
  return s.replace('-', MINUS);
}
export const num = v => String(v).replace(/^-/, MINUS);

export function niceTicks(lo, hi, maxCount = 5, minCount = 4) {
  if (!(hi > lo)) return { ticks: [lo], step: 1, decimals: 0 };
  const span = hi - lo, e0 = Math.floor(Math.log10(span)) - 2;
  const steps = [];
  for (let e = e0; e <= e0 + 4; e++) for (const m of [1, 2, 2.5, 5]) steps.push({ step: m * 10 ** e, m, e });
  const count = st => Math.floor(hi / st + 1e-9) - Math.ceil(lo / st - 1e-9) + 1;
  let pick = steps.find(st => count(st.step) <= maxCount && count(st.step) >= minCount);
  if (!pick) {
    const ok = steps.filter(st => count(st.step) >= 2 && count(st.step) <= maxCount + 2);
    ok.sort((a, b) => Math.abs(count(a.step) - 4.5) - Math.abs(count(b.step) - 4.5) || count(b.step) - count(a.step));
    pick = ok[0] || steps[steps.length - 1];
  }
  const { step, m, e } = pick;
  const ticks = [];
  for (let i = Math.ceil(lo / step - 1e-9); i <= Math.floor(hi / step + 1e-9); i++) ticks.push(+(i * step).toPrecision(12));
  const decimals = Math.max(0, -e + (m === 2.5 ? 1 : 0));
  return { ticks, step, decimals };
}
export function logTicks(lo, hi) {
  const a = Math.min(lo, hi), b = Math.max(lo, hi), out = [];
  const label = v => {
    const e = Math.floor(Math.log10(v) + 1e-9), m = Math.round(v / 10 ** e);
    if (e >= -2 && e <= 3) return fmt(v, Math.max(0, -e));
    return m === 1 ? `10^{${String(e).replace('-', MINUS)}}` : `${m}×10^{${String(e).replace('-', MINUS)}}`;
  };
  for (const ms of [[1], [1, 2, 5], [1, 1.5, 2, 3, 5, 7]]) {
    out.length = 0;
    for (let e = Math.floor(Math.log10(a)) - 1; e <= Math.ceil(Math.log10(b)) + 1; e++) for (const m of ms) {
      const v = +(m * 10 ** e).toPrecision(6);
      if (v >= a * (1 - 1e-9) && v <= b * (1 + 1e-9)) out.push(v);
    }
    if (out.length >= 3) break;
  }
  const keep = out.length > 7 ? out.filter((_, i) => i % Math.ceil(out.length / 6) === 0) : out;
  return keep.map(v => ({ v, label: label(v) }));
}

export function scale(d0, d1, r0, r1, log = false) {
  const f = log ? v => Math.log10(v) : v => v;
  const a = f(d0), b = f(d1);
  const s = v => r0 + ((f(v) - a) / (b - a)) * (r1 - r0);
  s.domain = [d0, d1]; s.range = [r0, r1]; s.log = log;
  return s;
}
export const lerp = (a, b, u) => (u === 0 ? a : u === 1 ? b : a + (b - a) * u);
export const clamp01 = x => Math.max(0, Math.min(1, x));
export const smooth = x => { const t = clamp01(x); return t * t * (3 - 2 * t); };
export const lerpRect = (A, B, u) => ({ x: lerp(A.x, B.x, u), y: lerp(A.y, B.y, u), w: lerp(A.w, B.w, u), h: lerp(A.h, B.h, u) });
export function stagger(t, i, n, overlap = 0.5) {
  if (n <= 1) return clamp01(t);
  const w = 1 / (n - (n - 1) * overlap), a = i * w * (1 - overlap);
  return smooth((t - a) / w);
}

export function axes(g, P, ax, env, o = {}) {
  const { T, u } = env, alpha = o.alpha === undefined ? 1 : o.alpha;
  if (alpha <= 0) return;
  const lw = Math.max(1, 0.16 * u), tl = 0.8 * u, px = TEXT.tick * u;
  const xA = o.xAlpha === undefined ? 1 : o.xAlpha;
  const yA = o.yTickAlpha === undefined ? 1 : o.yTickAlpha;
  g.save();
  g.globalAlpha *= alpha;
  g.strokeStyle = T.hair; g.lineWidth = lw; g.lineCap = 'butt';
  if (g.__mark) g.__mark('axis');
  g.beginPath();
  if (o.xOnly) { g.moveTo(P.x, P.y + P.h); g.lineTo(P.x + P.w, P.y + P.h); } else { g.moveTo(P.x, P.y); g.lineTo(P.x, P.y + P.h); g.lineTo(P.x + P.w, P.y + P.h); }
  g.stroke();
  const listOf = axis => axis.ticks || (axis.log ? logTicks(...axis.s.domain).map(t => ({ v: t.v, label: t.label }))
    : (() => { const n = niceTicks(Math.min(...axis.s.domain), Math.max(...axis.s.domain)); return n.ticks.map(v => ({ v, label: fmt(v, n.decimals) })); })());
  let corner = null;
  if (ax.y && !ax.y.bare) {
    const low = listOf(ax.y).map(t => ({ t, p: ax.y.s(t.v) })).filter(q => q.p >= P.y + P.h - 2.5 * u).sort((a, b) => b.p - a.p)[0];
    if (low) { const w = measure(g, low.t.label, px); corner = { x: P.x - tl - 0.5 * u - w, y: low.p + 0.34 * px - 0.8 * px, w, h: 1.05 * px }; }
  }
  const tick = (axis, which) => {
    for (const t of listOf(axis)) {
      const p = axis.s(t.v);
      g.beginPath();
      if (which === 'x') { g.moveTo(p, P.y + P.h); g.lineTo(p, P.y + P.h + tl); } else { g.moveTo(P.x, p); g.lineTo(P.x - tl, p); }
      g.stroke();
      if (axis.bare) continue;
      if (which === 'x') {
        const w = measure(g, t.label, px), y = P.y + P.h + tl + 1.0 * px;
        if (corner && p - w / 2 < corner.x + corner.w + 0.3 * u && y - 0.8 * px < corner.y + corner.h + 0.2 * u) continue;
        text(g, t.label, p, y, { px, color: T.muted, align: 'center', role: 'tick', alpha: xA });
      } else if (yA > 0) text(g, t.label, P.x - tl - 0.5 * u, p + 0.34 * px, { px, color: T.muted, align: 'right', role: 'tick', alpha: yA });
    }
  };
  if (ax.x) tick(ax.x, 'x');
  if (ax.y) tick(ax.y, 'y');
  const tp = TEXT.label * u;
  const xDrop = o.xTitleDrop !== undefined ? o.xTitleDrop * u : tl + 1.0 * px + 1.35 * tp;
  if (ax.x && ax.x.label) text(g, ax.x.label, P.x + P.w, P.y + P.h + xDrop, { px: tp, color: T.ink, align: 'right', italic: false, role: 'axis', alpha: xA });
  if (ax.y && ax.y.label && o.yTitle === 'top') text(g, ax.y.label, P.x - tl - 0.5 * u, P.y - (o.yTitleLift || 1.0 * tp), { px: tp, color: T.ink, align: 'left', role: 'axis' });
  else if (ax.y && ax.y.label) {
    const nums = ax.y.bare || yA <= 0 ? [] : listOf(ax.y), wMax = nums.reduce((m, t) => Math.max(m, measure(g, t.label, px)), 0);
    const xb = P.x - tl - 0.5 * u - wMax - (0.7 + (o.yTitleGap || 0)) * u - 0.25 * tp, yc = P.y + P.h / 2;
    const w = measure(g, ax.y.label, tp), fix = g.__irisFix;
    if (g.__iris) g.__irisFix = irisGate(g.__iris, { x: xb - 0.8 * tp, y: yc - w / 2, w: 1.05 * tp, h: w }, tp);
    g.save(); g.translate(xb, yc); g.rotate(-Math.PI / 2);
    text(g, ax.y.label, 0, 0, { px: tp, color: T.ink, align: 'center', role: 'axis' });
    g.restore();
    g.__irisFix = fix;
  }
  g.restore();
}

export function hatch(g, x, y, w, h, env, o = {}) {
  const { T, u } = env;
  if (!(w > 0 && h > 0)) return;
  const sp = (o.sp || 1.6) * u, c = o.color || T.muted, al = (o.alpha === undefined ? 1 : o.alpha) * fillAlphaFor(c, T.ground, o.target || 20);
  g.save(); if (g.__mark) g.__mark('hatch');
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.globalAlpha *= al; g.strokeStyle = c; g.lineWidth = Math.max(2, 0.16 * u);
  g.beginPath();
  for (let c0 = Math.floor((x + y) / sp) * sp; c0 <= x + w + y + h; c0 += sp) { g.moveTo(c0 - y, y); g.lineTo(c0 - (y + h), y + h); }
  g.stroke(); g.restore();
}
export function plate(g, box, env, a = 1, pad = 0.3) {
  const { T, u } = env;
  if (g.__iris) a *= g.__irisFix !== undefined ? g.__irisFix : irisGate(g.__iris, box, 0);
  if (!(a > 0)) return;
  g.save(); g.globalAlpha *= a; g.fillStyle = T.ground; g.fillRect(box.x - pad * u, box.y - pad * u, box.w + 2 * pad * u, box.h + 2 * pad * u); g.restore();
}

export function refLine(g, x0, y0, x1, y1, env, o = {}) {
  const { T, u } = env;
  g.save(); if (g.__mark) g.__mark('ref');
  g.globalAlpha *= o.alpha === undefined ? 1 : o.alpha;
  g.strokeStyle = o.color || T.hair; g.lineWidth = Math.max(1, (o.lw || 0.16) * u);
  g.setLineDash(o.dash === false ? [] : [0.9 * u, 0.7 * u]);
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.restore();
}

export function glyph(g, shape, cx, cy, r, color, env, o = {}) {
  const { T, u } = env;
  g.save(); if (g.__mark) g.__mark('point');
  g.globalAlpha *= o.alpha === undefined ? 1 : o.alpha;
  g.fillStyle = color; g.strokeStyle = color; g.lineWidth = Math.max(1.2, (o.lw ?? 0.3) * u);
  g.beginPath();
  const base = shape.replace('-open', '');
  if (base === 'diamond') { g.moveTo(cx, cy - 1.25 * r); g.lineTo(cx + 1.25 * r, cy); g.lineTo(cx, cy + 1.25 * r); g.lineTo(cx - 1.25 * r, cy); g.closePath(); }
  else if (base === 'square') g.rect(cx - 0.9 * r, cy - 0.9 * r, 1.8 * r, 1.8 * r);
  else g.arc(cx, cy, r, 0, 2 * Math.PI);
  if (shape.endsWith('-open')) {
    g.fillStyle = T.ground; g.fill();
    g.stroke();
  } else g.fill();
  g.restore();
}

export function errorBar(g, x, y, e, color, env, o = {}) {
  const { u } = env, cap = (o.cap === undefined ? 0.7 : o.cap) * u;
  g.save(); if (g.__mark) g.__mark('bar');
  g.globalAlpha *= o.alpha === undefined ? 1 : o.alpha;
  g.strokeStyle = color; g.lineWidth = Math.max(1.2, (o.lw || 0.28) * u); g.lineCap = 'butt';
  g.beginPath();
  if (e.ylo !== undefined) {
    g.moveTo(x, e.ylo); g.lineTo(x, e.yhi);
    if (cap > 0) { g.moveTo(x - cap, e.ylo); g.lineTo(x + cap, e.ylo); g.moveTo(x - cap, e.yhi); g.lineTo(x + cap, e.yhi); }
  }
  if (e.xlo !== undefined) {
    g.moveTo(e.xlo, y); g.lineTo(e.xhi, y);
    if (cap > 0) { g.moveTo(e.xlo, y - cap); g.lineTo(e.xlo, y + cap); g.moveTo(e.xhi, y - cap); g.lineTo(e.xhi, y + cap); }
  }
  g.stroke();
  g.restore();
}

export function polyline(g, pts, color, env, o = {}) {
  if (pts.length < 2) return;
  g.save(); if (g.__mark) g.__mark('line');
  g.globalAlpha *= o.alpha === undefined ? 1 : o.alpha;
  g.strokeStyle = color; g.lineWidth = Math.max(1, (o.lw || 0.3) * env.u); g.lineJoin = 'round'; g.lineCap = 'round';
  if (o.dash) g.setLineDash(o.dash.map(d => d * env.u));
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.stroke();
  g.restore();
}
export function band(g, upper, lower, color, alpha, env) {
  if (upper.length < 2) return;
  g.save(); if (g.__mark) g.__mark('band');
  g.globalAlpha *= alpha;
  g.fillStyle = color;
  g.beginPath(); g.moveTo(upper[0][0], upper[0][1]);
  for (let i = 1; i < upper.length; i++) g.lineTo(upper[i][0], upper[i][1]);
  for (let i = lower.length - 1; i >= 0; i--) g.lineTo(lower[i][0], lower[i][1]);
  g.closePath(); g.fill();
  g.restore();
}

function tracePath(g, loops, X, Y) {
  g.beginPath();
  for (const L of loops) {
    if (L.length < 3) continue;
    g.moveTo(X(L[0][0]), Y(L[0][1]));
    for (let i = 1; i < L.length; i++) g.lineTo(X(L[i][0]), Y(L[i][1]));
    g.closePath();
  }
}
export function fillLoops(g, loops, X, Y, color, alpha) {
  if (!(alpha > 0) || !loops || !loops.length) return;
  g.save(); if (g.__mark) g.__mark('fill'); g.globalAlpha *= alpha; g.fillStyle = color;
  tracePath(g, loops, X, Y); g.fill('evenodd');
  g.restore();
}
export function strokeLoops(g, loops, X, Y, color, alpha, lw, env, dash) {
  if (!(alpha > 0) || !loops || !loops.length) return;
  g.save(); if (g.__mark) g.__mark('contour'); g.globalAlpha *= alpha; g.strokeStyle = color; g.lineWidth = Math.max(1, lw * 0.16 * env.u);
  g.lineJoin = 'round';
  if (dash) g.setLineDash(dash.map(d => d * env.u));
  tracePath(g, loops, X, Y); g.stroke();
  g.restore();
}
export function clipped(g, P, fn) { g.save(); g.beginPath(); g.rect(P.x, P.y, P.w, P.h); g.clip(); fn(); g.restore(); }

export function ellipseLoop(mx, my, sx, sy, rho, dchi2, n = 96) {
  const r = Math.sqrt(dchi2), c = Math.sqrt(Math.max(0, 1 - rho * rho)), out = [];
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * i) / n, a = Math.cos(t), b = Math.sin(t);
    out.push([mx + r * sx * a, my + r * sy * (rho * a + c * b)]);
  }
  return out;
}

export function tangentTick(g, X, Y, t, color, env, o = {}) {
  const span = t.span || 2, seg = sl => {
    const a = t.x / span, b = t.x * span;
    return [[X(a), Y(t.y * (a / t.x) ** sl)], [X(b), Y(t.y * (b / t.x) ** sl)]];
  };
  if (t.sigma > 0) {
    const lo = seg(t.slope - t.sigma), hi = seg(t.slope + t.sigma);
    band(g, [lo[0], [X(t.x), Y(t.y)], hi[1]], [hi[0], [X(t.x), Y(t.y)], lo[1]], color, 0.22 * (o.alpha ?? 1), env);
  }
  polyline(g, seg(t.slope), color, env, { lw: o.lw || 0.36, alpha: o.alpha });
}

const DEFAULT_CANDS = [[1.2, -1.0, 'left'], [1.2, 2.6, 'left'], [-1.2, -1.0, 'right'], [-1.2, 2.6, 'right'],
  [0, -1.6, 'center'], [0, 3.6, 'center'], [1.2, -4.2, 'left'], [1.2, 5.8, 'left'], [-1.2, -4.2, 'right'], [-1.2, 5.8, 'right'],
  [0, -5.0, 'center'], [0, 7.0, 'center']];
const overlaps = (a, b, pad) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

export function placeLabels(g, items, env, o = {}) {
  const { u, T } = env, placed = [...(o.avoid || [])], used = [], bounds = o.bounds;
  for (const it of items) {
    const lines = String(it.text).split('\n'), lead = 1.15 * (it.px || TEXT.label * u);
    const itl = i => (it.lineItalic && it.lineItalic[i] !== undefined ? it.lineItalic[i] : it.italic);
    const px = it.px || TEXT.label * u, w = Math.max(...lines.map((L, i) => measure(g, L, px, itl(i)))), h = 1.05 * px + (lines.length - 1) * lead;
    let best = null;
    for (const [dx, dy, align] of it.cands || DEFAULT_CANDS) {
      const ax = it.x + dx * u, by = it.y + dy * u;
      const x0 = align === 'center' ? ax - w / 2 : align === 'right' ? ax - w : ax;
      const box = { x: x0, y: by - 0.8 * px, w, h };
      const bd = it.bounds || bounds;
      const inside = !bd || (box.x >= bd.x && box.x + box.w <= bd.x + bd.w && box.y >= bd.y && box.y + box.h <= bd.y + bd.h);
      if (inside && !placed.some(b => overlaps(box, b, 0.4 * u))) { best = { ax, by, align, box, dx, dy }; break; }
    }
    if (!best) {
      const area = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      let least = Infinity;
      for (const [dx, dy, align] of it.cands || DEFAULT_CANDS) {
        let ax = it.x + dx * u; const by = it.y + dy * u;
        const x0 = align === 'center' ? ax - w / 2 : align === 'right' ? ax - w : ax;
        let shift = 0, lift = 0;
        if (bounds) {
          if (x0 < bounds.x) shift = bounds.x - x0; if (x0 + w > bounds.x + bounds.w) shift = bounds.x + bounds.w - x0 - w;
          const y0 = by - 0.8 * px;
          if (y0 < bounds.y) lift = bounds.y - y0; if (y0 + h > bounds.y + bounds.h) lift = bounds.y + bounds.h - y0 - h;
        }
        ax += shift;
        const box = { x: x0 + shift, y: by + lift - 0.8 * px, w, h };
        const o = placed.reduce((s, b) => s + area(box, b), 0);
        if (o < least) { least = o; best = { ax, by: by + lift, align, box, dx, dy }; }
      }
    }
    placed.push(best.box); used.push(best.box);
    const far = Math.hypot(best.dx, best.dy) > 3.5;
    if (far && it.leader === true && (it.alpha ?? 1) > 0) {
      const bx = Math.max(best.box.x, Math.min(it.x, best.box.x + best.box.w));
      const byy = it.y < best.box.y ? best.box.y : best.box.y + best.box.h;
      g.save(); if (g.__mark) g.__mark('leader'); g.globalAlpha *= 0.7 * (it.alpha ?? 1); g.strokeStyle = it.leaderColor || T.hair; g.lineWidth = Math.max(1, 0.14 * u);
      g.beginPath(); g.moveTo(it.x, it.y); g.lineTo(bx, byy); g.stroke(); g.restore();
    }
    irisBlock(g, best.box, px, () => (it.plate && plate(g, best.box, env, it.alpha === undefined ? 1 : it.alpha), lines.forEach((L, i) => { const o2 = { px, color: (it.lineColors && it.lineColors[i]) || it.color, alpha: it.alpha, align: best.align, italic: itl(i), role: it.role || 'label' };
      const rr = it.runs ? it.runs(L, i) : null;
      if (rr) textRuns(g, rr, best.ax, best.by + i * lead, o2); else text(g, L, best.ax, best.by + i * lead, o2); })));
  }
  return used;
}

export function breakLabel(g, str, maxW, px, italic = false) {
  if (measure(g, str, px, italic) <= maxW) return str;
  const parts = []; let depth = 0, cur = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i]; if (c === '(' || c === '[') depth++; if (c === ')' || c === ']') depth--;
    if (depth === 0 && i > 0 && str.startsWith(' + ', i)) { parts.push(cur); cur = '+ '; i += 2; continue; }
    cur += c;
  }
  parts.push(cur);
  const lines = [];
  for (const p of parts) {
    const last = lines[lines.length - 1];
    if (last !== undefined && measure(g, `${last} ${p}`, px, italic) <= maxW) lines[lines.length - 1] = `${last} ${p}`; else lines.push(p);
  }
  return lines.join('\n');
}

export function foot(g, lines, x, bottom, maxW, env, o = {}) {
  const { u, T } = env, px = (o.size || TEXT.foot) * u, lead = 1.22 * px;
  const all = [];
  for (const L of lines) for (const w of wrap(g, L, maxW, px, true)) all.push(w);
  let y = bottom;
  for (let i = all.length - 1; i >= 0; i--) {
    text(g, all[i], x, y, { px, color: o.color || T.muted, alpha: o.alpha, italic: true, role: 'foot' });
    y -= lead;
  }
  return y + lead - 0.8 * px;
}

export function stamp(g, P, words, env, o = {}) {
  const { u, T } = env, px = TEXT.stamp * u;
  g.save();
  g.globalAlpha *= 0.28 * (o.alpha ?? 1);
  g.translate(P.x + P.w / 2, P.y + P.h / 2); g.rotate(-0.18);
  text(g, words, 0, 0.35 * px, { px, color: T.stamp, align: 'center', role: 'stamp' });
  g.restore();
}

export function segmentHitsBox(x0, y0, x1, y1, b, pad = 0) {
  const bx0 = b.x - pad, by0 = b.y - pad, bx1 = b.x + b.w + pad, by1 = b.y + b.h + pad;
  let t0 = 0, t1 = 1;
  const dx = x1 - x0, dy = y1 - y0;
  for (const [p, q] of [[-dx, x0 - bx0], [dx, bx1 - x0], [-dy, y0 - by0], [dy, by1 - y0]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return true;
}
export function lineObstacles(pts, u, step = 2, half = 0.5) {
  const out = [];
  for (let i = 0; i < pts.length; i += step) out.push({ x: pts[i][0] - half * u, y: pts[i][1] - half * u, w: 2 * half * u, h: 2 * half * u });
  return out;
}

export function deltaLWorst(col, alpha, ground) {
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const L = c => { const y = 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y; };
  const worst = c => c.map((v, i) => (0.20 + 0.74 * v) ** 0.8 * [1, 0.96, 0.86][i]);
  const G = hex(ground), C = hex(col).map((v, i) => alpha * v + (1 - alpha) * G[i]);
  return Math.abs(L(worst(C)) - L(worst(G)));
}
export function deltaLBack(col, alpha, lwU, ground) {
  return deltaLWorst(col, alpha, ground) * Math.min(1, ((lwU * 7.2) / 3.2) ** 1.5);
}
export function fillAlphaFor(col, ground, target = 21) {
  for (let a = 0.05; a < 1; a += 0.01) if (deltaLWorst(col, a, ground) >= target) return Math.round(a * 100) / 100;
  return 1;
}

export const fillHis = T => fillAlphaFor(T.accent, T.ground, 21);

export function contrast(a, b) {
  const lum = hex => {
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [l1, l2] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (l1 + 0.05) / (l2 + 0.05);
}
