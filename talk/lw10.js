
import { LOOK } from './look.js';
import { MIN_LW } from './plan_lw.js';
import { DESI_CURVES } from '../program.js';

export const WORD_RATE_LW = 100 / 60;
export const BREATH_LW = 1.5;
export const TARGET_LW = 10 * 60;

const OWN = LOOK === 'paper' ? 0 : 1, ownDark = n => Array.from({ length: n }, () => OWN);
const PER_REST = ['heads', 'steps', 'prov', 'durs', 'dark', 'mine', 'arrow', 'point', 'card', 'strip'];
const PER_REST_MAPS = ['labels', 'wordsFrom', 'jumpCurves', 'turn'];
function pick(b, idx, extra = {}) {
  if (!b) throw new Error('lw10: a beat it needs is missing from v3');
  const out = { ...b };
  if (Array.isArray(b.ks)) out.ks = idx.map(i => b.ks[i]);
  delete out.through;
  for (const key of PER_REST) if (Array.isArray(b[key])) out[key] = idx.map(i => b[key][i]);
  for (const key of PER_REST_MAPS) {
    if (!b[key] || typeof b[key] !== 'object' || Array.isArray(b[key])) continue;
    out[key] = Object.fromEntries(idx.map((i, j) => [j, b[key][i]]).filter(([, v]) => v !== undefined));
    if (!Object.keys(out[key]).length) delete out[key];
  }
  return { ...out, ...extra };
}
const each = (n, v) => Array.from({ length: n }, () => v);

const T = {
  fan: 'DESI: the largest 3D map of the Universe, with galaxies and quasars',
  million: 'DESI, by 2026, observe ~million of Lyα quasars!',
  ruler: 'Sound waves in the early Universe left a standard ruler in the map',
  counting: 'Counting pairs: the standard way to measure how galaxies cluster',
  lya: 'The forest is unique: pairs along sightlines, across them, and with quasars',
  anchor: 'The forest anchors DESI’s expansion history at early times',
  scales: 'The Lyα forest reaches from large scales to small scales',
  zoom: 'Let’s start our journey as a photon emitted by quasar, super massive black hole',
  what: 'What is Lyman alpha forest?',
  spec: 'This is a real DESI spectrum. Why the forest lives on the left hand side?',
  resol: 'How small a scale you probe depends on your spectrograph’s resolution',
  light: 'Imagine you are travelling through the cosmic web of hydrogen',
  gas: 'Hydrogen filament and knots record the cosmic structure and temperature',
  beam: 'This forest is called: the Lyman alpha forest',
  levels: 'Its electron jumps a level and takes one exact colour: Lyman alpha',
  photon: 'A photon meets hydrogen: its electron jumps a level. This is Lyman alpha',
  stretch: 'The expanding Universe stretches the wavelength to longer',
  everywhere: 'Hydrogen is more abundant than stars',
  trees: 'Each photon/hydrogen encounter imprints an absorption dip',
  forest: 'Abundant intergalactic hydrogen forms a forest of lines',
  mapping: 'Forest spectra map the 3D cosmic hydrogen',
  why: 'Small scale structure measures the fast moving particles',
  wdm: 'The forest also tests what dark matter is',
  mf: 'Multi-fidelity: near-detailed accuracy for about 8× less computing',
  clumpy: 'How clustered matter is, from large scales to small',
  pairs: 'Comparing pairs of points along a sightline reads how matter is clustered',
  converge: 'Multiple measurements (almost!) start to converge',
  gap: 'Big conceptual gap: simulations don’t yet capture all the dense hydrogen!',
  forward: 'The way forward: find the dense clouds, then mask or model them',
  missing: 'Conceptual gap? Galaxies are missing!',
  dla: 'A damped Lyman-α absorber (DLA): the mark of a galaxy on the sightline',
  treasure: 'A treasure for galaxy formation, a nuisance for reading the forest',
  rule: 'A DLA breaks the rule that each dip traces thin gas',
  count: 'The dense clouds sit where matter clusters into galaxies',
  anchorclouds: 'Counting the clouds anchors the model between the forest and galaxies',
  next: 'Next: putting the dense clouds into the model',
  dials: 'I develop an emulator to explain their abundance in the data',
  students: 'I enjoy learning from students!',
  roles: 'My work reads one sightline three ways',
};

const LYMAN = {
  id: 'lyman', section: 5, title: 'What is Lyman alpha', min: 0.4, scene: 'lyman', ks: [0, 1], through: [0],
  dark: ownDark(2), prov: ['schematic · hydrogen’s levels, E_n = −13.6 eV / n²', 'schematic · hydrogen’s levels, E_n = −13.6 eV / n²'],
  heads: [T.photon, T.photon],
  steps: [],
  notes: []};
const MAP = {
  id: 'map', section: 7, title: 'Many spectra map the cosmic hydrogen', min: 0.4, scene: 'map', ks: [0, 1], through: [0],
  dark: ownDark(2), mine: 'priya', prov: ['simulated · PRIYA, one slice', 'simulated · PRIYA, one slice'], heads: [T.mapping, T.mapping],
  steps: [],
  notes: []};
const ANCHOR = {
  id: 'anchor', section: 4, title: 'The forest anchors the expansion history at early times', min: 0.6, scene: 'expansion', ks: [0, 1], through: [0],
  dark: ownDark(2), prov: ['computed · the standard model + DESI DR2', 'computed · the standard model + DESI DR2'], heads: ['The forest anchors DESI’s expansion history at early times', 'The forest anchors DESI’s expansion history at early times'],
  steps: [],
  notes: []};
const PAYOFF_PROV = 'computed + published · Planck, DESI DR1, Ho et al. 2026, PRIYA';
const PAYOFF = {
  id: 'payoff', section: 11, title: 'How clustered matter is: my result, and the gap the dense clouds leave', min: 1.4, scene: 'gap', ks: [0, 1, 2, 3, 4, 5, 6], through: [0],
  dark: ownDark(7), mine: [null, 'priya', 'theory', 'theory', 'theory', 'theory', 'gp'],
  prov: ['simulated · PRIYA', 'simulated · PRIYA', 'computed · Planck 2018 (CAMB); DESI ranges', PAYOFF_PROV, 'computed · CAMB, Viel et al. 2005; Iršič et al. 2024', PAYOFF_PROV, PAYOFF_PROV],
  heads: [T.pairs, T.pairs, T.clumpy, T.converge, T.why, T.gap, T.forward],
  steps: [],
  notes: []};
const NOW = {
  id: 'now', section: 14, title: 'The dense clouds: where they sit, and putting them into the model', min: 0.9, scene: 'count', ks: [0, 1, 2], through: [0],
  dark: ownDark(3), mine: [null, 'desi', 'hcd'], prov: ['simulated · PRIYA, one slice', 'simulated · PRIYA, one slice', 'computed · hcd_priya (illustrative)'],
  heads: [T.count, T.count, T.dials],
  steps: [],
  notes: []};
const BEAM_PROV = 'simulated · PRIYA + a synthetic quasar';
const BEAM = {
  id: 'beam', section: 7, title: 'Follow the light through a simulated universe', min: 2.8, scene: 'clip', ks: [0, 1, 2, 3, 4, 5, 6, 7], through: [0],
  dark: ownDark(8), mine: 'priya', prov: each(8, BEAM_PROV),
  heads: [T.stretch, T.stretch, T.light, T.trees, T.everywhere, T.forest, T.beam, T.beam],
  steps: [],
  notes: [],
};

export function lw10Beats(v3) {
  const by = Object.fromEntries(v3.map(b => [b.id, b]));
  const out = [
    pick(by.title, [0], { section: 0, min: 0.45, band: false,
      notes: []}),
    pick(by.fan, [0, 1], { section: 1, min: 0.55, band: false, heads: [T.fan, T.fan] }),
    DESI_CURVES ? pick(by.pairs, [0, 1], { section: 2, min: 0.5, heads: [T.million, T.ruler] }) : {
      ...by.pairs, section: 2, min: 0.5, ks: [0, 1, 2, 3, 8], through: [1], jumpEase: 'curves',
      durs: [by.pairs.durs ? by.pairs.durs[0] : null, null, null, null, null], dark: each(5, by.pairs.dark[0]),
      heads: [T.million, T.counting, T.counting, T.counting, T.ruler],
      prov: ['data · DESI DR1', 'data · DR1 LRGs', 'computed · DR1', 'computed · DR1', 'computed · DR1'],
      steps: [],
      notes: []},
    pick(by.lyapairs, [0, 1, 2], { section: 3, min: 0.4, through: [0, 1], heads: [T.lya, T.lya, T.lya], ...(DESI_CURVES ? {} : { durs: [null, null, 0.5] }) }),
    ANCHOR,
    pick(by.scales, [0, 1, 2], { section: 4, min: 0.5, through: [0], heads: each(3, T.scales), dark: ownDark(3) }),
    pick(by.readings, [0, 1], { section: 6, min: 0.25, through: [0], heads: [T.what, T.what], ...(DESI_CURVES ? {} : { prov: ['data · DESI DR1', 'data · DESI DR1'] }) }),
    LYMAN,
    BEAM,
    pick(by.thanks, [0], { section: 16, min: 0.3,
      steps: [],
      notes: []}),
  ];
  return out.map(b => (MIN_LW && MIN_LW[b.id] ? { ...b, min: MIN_LW[b.id] } : b));
}
