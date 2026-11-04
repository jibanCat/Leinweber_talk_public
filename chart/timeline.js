
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

export function makeScene(REST, STEPS) {
  const LAST = REST.length - 1;
  function pose(k, s) {
    if (k <= 0) return { ...REST[0] };
    if (k > LAST) return { ...REST[LAST] };
    const a = REST[k - 1], b = REST[k], step = STEPS[k], out = {};
    for (const key of Object.keys(b)) {
      if (typeof b[key] !== 'number') { out[key] = b[key]; continue; }
      const linear = !!(step.linear && step.linear.includes(key));
      out[key] = lerp(a[key], b[key], fraction((step.curves && step.curves[key]) || DEFAULT, s, linear));
    }
    return out;
  }
  return { REST, STEPS, LAST, pose };
}

const B0 = { chart: 'bao', dist: 1, pts: 0, lya: 0, split: 0, omh: 0, trc: 0, all: 0 };
const B2 = { ...B0, pts: 1, lya: 1 };
const BAO_REST = [B0, { ...B0, pts: 1 }, B2];
const BAO_STEPS = [null,
  { dur: 2.2, linear: ['pts'] },
  { dur: 1.6 }];

const W0 = { chart: 'w0wa', de: 0, fit: 0, sne: 0, anchor: 0, a2: 0 };
const W0WA_REST = [W0,
  { ...W0, de: 1 },
  { ...W0, de: 1, fit: 1 },
  { ...W0, de: 1, fit: 1, sne: 1 },
  { ...W0, de: 1, fit: 1, sne: 1, anchor: 1 },
  { ...W0, a2: 1 }];
const W0WA_STEPS = [null,
  { dur: 9.0, linear: ['de'] },
  { dur: 14.0, linear: ['fit'] },
  { dur: 7.0, linear: ['sne'] },
  { dur: 12.0, linear: ['anchor'] },
  { dur: 24.0, linear: ['a2'] }];

const K0 = { chart: 'pk', curve: 1, desi: 0, p1d: 0, split: 0, fly: 0, pl: 0, de: 0, ks: 0, zoom: 0, rot: 0, same: 0, prior: 0, pko: 1, wide: 0, alt: 0, move: 0, mark: 0, shift: 0, vout: 0, rng: 1, spec: 0, specb: 0, slide: 0 };
const K3 = { ...K0, desi: 1, p1d: 1, split: 1, fly: 1, pl: 1, de: 1 };
const K5 = { ...K3, de: 1, ks: 1, same: 1 };
const K6 = { ...K5, zoom: 1, rot: 1, same: 0, prior: 1, rng: 0 };
const K7 = { ...K6, pko: 0, wide: 1, alt: 1, move: 1, specb: 1, slide: 1 };
const WIDE6 = 0.4;
const K7s = { ...K6, pko: 0, wide: WIDE6, alt: 1, move: 1, spec: 1, specb: 1, slide: 1 };
const PK_REST = [K0, { ...K0, desi: 1 }, { ...K0, desi: 1, p1d: 1 }, K3, K5, K6, K7s, { ...K7s, mark: 1, shift: 1 }, { ...K6, alt: 1, move: 1, mark: 1, shift: 1, vout: 1, zoom: 0, rng: 1, specb: 1, slide: 1 }];
const PK_STEPS = [null,
  { dur: 2.0 },
  { dur: 2.0 },
  { dur: 5.6, curves: { split: [[0, 0], [0.45, 1]], fly: [[0.3, 0], [0.75, 1]], pl: [[0.8, 0], [1, 1]], de: [[0.8, 0], [1, 1]] } },
  { dur: 2.5, curves: { ks: [[0, 0], [0.7, 1]], same: [[0.7, 0], [1, 1]] } },
  { dur: 8.0, curves: { same: [[0, 0], [0.12, 1]], rng: [[0, 0], [0.12, 1]], zoom: [[0.12, 0], [0.45, 1]], rot: [[0.5, 0], [0.9, 1]], prior: [[0.9, 0], [1, 1]] } },
  { dur: 14.0, curves: { pko: [[0, 0], [0.06, 1]], wide: [[0.08, 0], [0.14, 1]], spec: [[0.16, 0], [0.21, 1]], specb: [[0.16, 0], [0.42, 1]], alt: [[0.6, 0], [0.65, 1]], slide: [[0.66, 0], [0.86, 1]], move: [[0.87, 0], [1, 1]] } },
  { dur: 6.0, curves: { mark: [[0.15, 0], [0.45, 1]], shift: [[0.5, 0], [1, 1]] } },
  { dur: 5.0, curves: { vout: [[0, 0], [0.2, 1]], zoom: [[0.2, 0], [0.21, 1]], spec: [[0.225, 0], [0.4, 1]], wide: [[0.425, 0], [0.6, 1]], pko: [[0.6, 0], [0.9, 1]], rng: [[0.6, 0], [0.9, 1]] } }];

const RU0 = { chart: 'ruler', data: 1, ring: 0, ac: 0, fit: 0 };
const RULER_REST = [RU0, { ...RU0, ring: 1 }, { ...RU0, ring: 1, ac: 1 }, { ...RU0, ring: 1, ac: 1, fit: 1 }];
const RULER_STEPS = [null,
  { dur: 7.0, linear: ['ring'] },
  { dur: 6.0, linear: ['ac'] },
  { dur: 6.0, linear: ['fit'] }];

const SC0 = { chart: 'scales', ax: 1, prec: 0, lya: 0, dm: 0 };
const SCALES_REST = [SC0, { ...SC0, prec: 1 }, { ...SC0, prec: 1, lya: 1 }, { ...SC0, prec: 1, lya: 1, dm: 1 }];
const SCALES_STEPS = [null,
  { dur: 4.5, linear: ['prec'], curves: { prec: [[0.2, 0], [1, 1]] } },
  { dur: 3.0, linear: ['lya'], curves: { lya: [[0.3, 0], [1, 1]] } },
  { dur: 4.5, linear: ['dm'], curves: { dm: [[0.2, 0], [1, 1]] } }];

const F0 = { chart: 'fullshape', geo: 1, lya: 0, shrink: 0 };
const FS_REST = [F0,
  { ...F0, lya: 1 },
  { ...F0, lya: 1, shrink: 1 }];
const FS_STEPS = [null,
  { dur: 1.6 },
  { dur: 2.6, linear: ['shrink'] }];

const X0 = { chart: 'xi', pts: 1, fit: 0, lya: 0 };
const XI_REST = [X0, { ...X0, fit: 1 }, { ...X0, fit: 1, lya: 1 }];
const XI_STEPS = [null, { dur: 2.4, linear: ['fit'] }, { dur: 2.0, linear: ['lya'] }];

const SP0 = { chart: 'spectrum', line: 1, lc: 0, open: 0, wide: 0, arrow: 0, lvl: 0, zoom: 0, sepA: 0, sepB: 0, sepC: 0, sdss: 0 };
const SP1 = { ...SP0, lc: 1, open: 1, arrow: 1 };
const SP2 = { ...SP1, wide: 1 };
const SP4 = { ...SP2, lvl: 1, zoom: 1 };
const SPECTRUM_REST = [SP0,
  SP1,
  SP2,
  { ...SP2, sdss: 1 },
  { ...SP2, lvl: 0.58 },
  { ...SP2, lvl: 1 },
  SP4,
  { ...SP4, sepA: 1 },
  { ...SP4, sepA: 1, sepB: 1 },
  { ...SP4, sepA: 1, sepB: 1, sepC: 1 }];
const SPECTRUM_STEPS = [null,
  { dur: 2.8, curves: { lc: [[0.3, 0], [0.6, 1]], open: [[0.4, 0], [1, 1]], arrow: [[0.6, 0], [1, 1]] } },
  { dur: 2.6 },
  { dur: 4.0, curves: { sdss: [[0.1, 0], [1, 1]] } },
  { dur: 6.0, linear: ['lvl'], curves: { sdss: [[0, 0], [0.04, 1]] } },
  { dur: 4.5, linear: ['lvl'] },
  { dur: 2.6 },
  { dur: 2.4, linear: ['sepA'] },
  { dur: 1.6 },
  { dur: 1.6 }];

const FD0 = { chart: 'find', spec: 1, mu: 0, fit: 0, ex: 0, mock: 0, dla: 0, mask: 0 };
const FD2 = { ...FD0, mu: 1, fit: 1 };
const FIND_REST = [FD0, { ...FD0, mu: 1 }, FD2, { ...FD2, mock: 1 }, { ...FD2, mock: 1, dla: 1 }, { ...FD2, mock: 1, dla: 1, mask: 1 }];
const FIND_STEPS = [null, { dur: 2.2 }, { dur: 2.6 }, { dur: 2.8, linear: ['mock'] }, { dur: 2.6 }, { dur: 7.0, linear: ['mask'] }];

const H0 = { chart: 'hcd', xi: 1, hcd: 0, split: 0, p1d: 0 };
const HCD_REST = [H0, { ...H0, hcd: 1 }, { ...H0, hcd: 1, split: 1, p1d: 1 }];
const HCD_STEPS = [null, { dur: 2.0, curves: { hcd: [[0.45, 0], [1, 1]] } }, { dur: 3.2, curves: { split: [[0, 0], [0.4, 1]], p1d: [[0.3, 0], [1, 1]] }, linear: ['split', 'p1d'] }];

const C0 = { chart: 'abscosmo', ref: 1, perz: 1, global: 0, move: 0, shift: 0 };
const AC_REST = [C0, { ...C0, global: 1, move: 1, shift: 1 }];
const AC_STEPS = [null, { dur: 6.0, curves: { global: [[0, 0], [0.3, 1]], move: [[0.25, 0], [0.6, 1]], shift: [[0.62, 0], [0.95, 1]] } }];

const WY0 = { chart: 'why', nu: 0, wdm: 0, wdm2: 0, strip: 0, fs: 0 };
const WY1 = { ...WY0, nu: 1 };
const WHY_REST = [WY0, WY1, { ...WY1, wdm: 1, strip: 1 }, { ...WY1, wdm: 1, wdm2: 1, strip: 1 }];
const WHY_STEPS = [null, { dur: 8.5, curves: { nu: [[0.12, 0], [0.71, 1]] }, linear: ['nu'] },
  { dur: 4.0, curves: { strip: [[0.2, 0], [0.45, 1]], wdm: [[0.5, 0], [1, 1]] } },
  { dur: 3.5, linear: ['wdm2'] }];

const EM0 = { chart: 'emudesign', design: 1, pred: 0 };
const EMULATOR_REST = [EM0, { ...EM0, pred: 1 }];
const EMULATOR_STEPS = [null, { dur: 3.4, linear: ['pred'] }];

const EW0 = { chart: 'emulator', pat: 1, dia: 0, mfp: 0, post: 0, walk: 0, band: 0, nu: 0, th: 0, spin: 0, zout: 0 };
const EW3 = { ...EW0, dia: 1, mfp: 1, post: 1, spin: 1, zout: 1 };
const EMUWALK_REST = [EW0, { ...EW0, dia: 1, spin: 0.5, zout: 0.5 }, { ...EW0, dia: 1, mfp: 1, spin: 1, zout: 1 }, EW3, { ...EW3, walk: 1 }, { ...EW3, walk: 1, band: 1 }, { ...EW3, walk: 1, band: 1, nu: 1 },
  { ...EW3, walk: 1, band: 1, nu: 1, th: 1 }];
const EMUWALK_STEPS = [null,
  { dur: 4.5, linear: ['dia', 'spin', 'zout'], curves: { dia: [[0.2, 0], [1, 1]] } },
  { dur: 7.0, linear: ['mfp', 'spin', 'zout'], curves: { mfp: [[0.13, 0], [1, 1]] } },
  { dur: 4.5, linear: ['post'], curves: { post: [[0.2, 0], [1, 1]] } },
  { dur: 10.0, linear: ['walk'] }, { dur: 3.0 },
  { dur: 13.0, linear: ['nu'], curves: { nu: [[0.07, 0], [1, 1]] } },
  { dur: 7.0, linear: ['th'], curves: { th: [[0.13, 0], [1, 1]] } }];

const MW0 = { chart: 'mywork', m: 0, lit: 0, h: 0, kn: 0, ks: 0, mt: 0, ms: 0, line: 0, pairs: 0, dla: 0, props: 0 };
const MW3 = { ...MW0, ks: 1, ms: 1 }, MW4 = { ...MW3, line: 1 };
const MYWORK_REST = [{ ...MW0, m: 1, lit: 1 }, { ...MW0, m: 1, h: 1 }, { ...MW0, kn: 1, ks: 1 }, { ...MW3, mt: 1 }, MW4, { ...MW4, pairs: 1 }, { ...MW4, pairs: 1, dla: 1 }, { ...MW4, pairs: 1, dla: 1, props: 1 }];
const MYWORK_STEPS = [null,
  { dur: 6.0, linear: ['h', 'lit'], curves: { lit: [[0, 0], [0.3, 1]], h: [[0.3, 0], [1, 1]] } },
  { dur: 10.0, linear: ['ks'], curves: { m: [[0, 0], [0.15, 1]], h: [[0, 0], [0.15, 1]], kn: [[0.15, 0], [0.27, 1]], ks: [[0.17, 0], [1, 1]] } },
  { dur: 5.5, linear: ['ms'], curves: { kn: [[0, 0], [0.3, 1]], mt: [[0.33, 0], [0.45, 1]], ms: [[0.33, 0], [1, 1]] } },
  { dur: 4.5, linear: ['line'], curves: { mt: [[0, 0], [0.3, 1]], line: [[0.35, 0], [1, 1]] } },
  { dur: 3.5, linear: ['pairs'], curves: { pairs: [[0.26, 0], [1, 1]] } },
  { dur: 4.5, linear: ['dla'], curves: { dla: [[0.2, 0], [1, 1]] } },
  { dur: 3.5, linear: ['props'], curves: { props: [[0.26, 0], [1, 1]] } }];

const DP0 = { chart: 'dlapairs', pr: 0, xc: 0 };
const DLAPAIRS_REST = [DP0, { ...DP0, pr: 1, xc: 1 }];
const DLAPAIRS_STEPS = [null, { dur: 8.0, curves: { pr: [[0.05, 0], [0.5, 1]], xc: [[0.5, 0], [1, 1]] }, linear: ['pr', 'xc'] }];

const RS0 = { chart: 'resolution', hf: 0, lf: 0, ratio: 0 };
const RESOLUTION_REST = [RS0, { ...RS0, hf: 1, lf: 1, ratio: 1 }];
const RESOLUTION_STEPS = [null, { dur: 7.0, linear: ['hf', 'lf'], curves: { hf: [[0.05, 0], [0.3, 1]], lf: [[0.32, 0], [0.55, 1]], ratio: [[0.6, 0], [1, 1]] } }];

export const SCENES = {
  bao: makeScene(BAO_REST, BAO_STEPS),
  w0wa: makeScene(W0WA_REST, W0WA_STEPS),
  pk: makeScene(PK_REST, PK_STEPS),
  ruler: makeScene(RULER_REST, RULER_STEPS),
  fullshape: makeScene(FS_REST, FS_STEPS),
  xi: makeScene(XI_REST, XI_STEPS),
  hcd: makeScene(HCD_REST, HCD_STEPS),
  abscosmo: makeScene(AC_REST, AC_STEPS),
  spectrum: makeScene(SPECTRUM_REST, SPECTRUM_STEPS),
  find: makeScene(FIND_REST, FIND_STEPS),
  why: makeScene(WHY_REST, WHY_STEPS),
  emulator: makeScene(EMUWALK_REST, EMUWALK_STEPS),
  emudesign: makeScene(EMULATOR_REST, EMULATOR_STEPS),
  mywork: makeScene(MYWORK_REST, MYWORK_STEPS),
  scales: makeScene(SCALES_REST, SCALES_STEPS),
  dlapairs: makeScene(DLAPAIRS_REST, DLAPAIRS_STEPS),
  resolution: makeScene(RESOLUTION_REST, RESOLUTION_STEPS),
};
export const ORDER = ['xi', 'ruler', 'bao', 'fullshape', 'w0wa', 'scales', 'spectrum', 'dlapairs', 'find', 'hcd', 'abscosmo', 'why', 'resolution', 'emulator', 'pk', 'mywork'];

const HANDOVER = 0.9;
export function sequence(names = ORDER) {
  const RESTS = [], STEPS = [null], ENTRY = {};
  for (const name of names) {
    const sc = SCENES[name];
    ENTRY[name] = RESTS.length;
    for (let k = 0; k <= sc.LAST; k++) {
      if (RESTS.length) STEPS.push(k === 0 ? { dur: HANDOVER, handover: true } : { dur: sc.STEPS[k].dur });
      RESTS.push({ name, k });
    }
  }
  const LAST = RESTS.length - 1;
  const REST = RESTS.map(r => ({ ...SCENES[r.name].pose(r.k, 1), op: 1 }));
  function pose(K, s) {
    if (K <= 0) return { ...REST[0] };
    if (K > LAST) return { ...REST[LAST] };
    const a = RESTS[K - 1], b = RESTS[K];
    if (STEPS[K].handover) {
      const out = s < 0.5, r = out ? a : b;
      const op = out ? 1 - smootherstep(Math.min(1, 2 * s)) : smootherstep(Math.max(0, 2 * s - 1));
      return { ...SCENES[r.name].pose(r.k, 1), op };
    }
    return { ...SCENES[b.name].pose(b.k, s), op: 1 };
  }
  const hashOf = K => `#${RESTS[K].name}.${RESTS[K].k}`;
  function parseHash(h) {
    const m = /^#([a-z0-9_]+)\.(\d+)(?:@([0-9.]+))?$/.exec(h || '');
    if (!m || ENTRY[m[1]] === undefined) return null;
    const K = ENTRY[m[1]] + Math.min(+m[2], SCENES[m[1]].LAST);
    return [K, m[3] !== undefined ? parseFloat(m[3]) : 1];
  }
  return { REST, STEPS, LAST, pose, RESTS, ENTRY, hashOf, parseHash };
}

const SEQ = sequence();
export const REST = SEQ.REST, STEPS = SEQ.STEPS, LAST = SEQ.LAST, pose = SEQ.pose;
