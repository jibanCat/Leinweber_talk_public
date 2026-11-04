
import { REAL_LIGHT } from './features.js';
import { PROGRAM as PROGRAM_Q, V3_FAMILY } from '../program.js';
import { lw10Beats } from './lw10.js';
import { LOOK, surveyLook, chartLook, groundOf } from './look.js';
import { TAGS as SURVEY_TAGS } from '../survey/provenance.js';

const SURVEY_PROV = 'about 6 beams per square degree: DESI’s ≈ 60 quasars per deg² beyond z = 2.1 (DESI 2016)\n× the ≈ 10% far enough away for their forest to cross this box (DESI mock) · positions illustrative';
const CUT = 'the usual practice in SDSS and DESI Lyman-alpha cosmology: find dense clouds and cut them out\ne.g. eBOSS DR16 (du Mas des Bourboux et al. 2020); DESI DR2 (Brodzeller et al. 2025)';
const TEXTURE = 'measured from 460 PRIYA simulated sightlines (z = 3), those with dense clouds left out\nhydrogen only: no metal lines added · what-if curves: the same gas changed by hand';
const WHAT_IF = 'what-if: the gas changed by hand, not a new simulation';

const V2 = [
  { id: 'title', card: 'title', title: 'Title', min: 0.5, scene: 'stub', dark: [1],
    heads: [''],
    steps: [],
    notes: []},
  { id: 'arrival', point: [1, 1, 0], title: 'The Arrival', min: 2.0, scene: 'arrival', range: [0, 2], dark: [1, 1, 0],
    heads: ['A lamp, very far away', 'Its light crosses hydrogen gas', ''],
    steps: [],
    notes: []},
  { id: 'record', strip: true, title: 'The Missing Light', min: 3.2, scene: 'record', range: [0, 5], enter: 'continue',
    heads: ['Light, spread into its colours', 'The gap is what hydrogen ate', 'Each dip traces hydrogen absorbing the light', 'Colour is (almost) distance', 'One colour at a time', ''],
    labels: { 0: { sub: 'one simulated sightline · PRIYA galaxy-formation simulation (Bird et al. 2023) · z = 3' },
      3: { foot: 'switched to a sister PRIYA simulation of this stretch, to show its gas\nthe gas is read from the simulation, not inferred from the spectrum' },
      4: { foot: 'switched to a sister PRIYA simulation of this stretch, to show its gas\nthe gas is read from the simulation, not inferred from the spectrum' } },
    steps: [],
    notes: []},
  { id: 'fold', turn: true, title: 'The Fold', min: 3.0, scene: 'fold', range: [0, 7], enter: 'continue',
    heads: ['One thin line through the Universe', 'Neighbouring beams look alike', 'The gas is wider than the gap between beams', 'Side by side: a slice', 'Stack slices: a box of shadows', 'Dark ink: roughly, where the gas is', 'The web of hydrogen', 'Back to one beam'],
    labels: { 4: { side: 'PRIYA simulation\n(Bird et al. 2023)\none box, 120 Mpc/h:\nabout 590 million light years\nacross today\nz = 3: 2.1 billion years\nafter the Big Bang\nevery beam runs parallel\nto the drawn line\ndarker = less light gets through\n(F = exp(−τ))' } },
    steps: [],
    notes: []},
  { id: 'read', answer: true, title: 'Read It Yourself', min: 2.0, scene: 'read', range: [0, 3], droppable: true,
    heads: ['Where is there the least hydrogen?', 'Your pick, inside the web', 'Where more light gets through, less is absorbed', 'Remember how much it wiggles'],
    steps: [],
    notes: []},
  { id: 'wide', title: 'Too Wide', min: 3.5, scene: 'ghosts', range: [0, 6],
    heads: ['An ordinary forest', 'More hydrogen: the dip hits the floor', 'More still: the dip gets wider', 'A dense cloud: wider, not deeper',
      'One atom: a sharp center, long faint wings', 'Many moving atoms: the Voigt profile', ''],
    labels: {
      1: { marks: [{ text: 'at the floor: no light left; more hydrogen can’t make the dip deeper', u: 0.376, v: 1.06 }] },
      3: { marks: [{ text: 'the sloping sides: many atoms’ faint wings add up', u: 0.636, v: -0.04, anchor: 'bottom', rust: true }],
        foot: 'drawn by hand, not simulated' } },
    steps: [],
    notes: []},
  { id: 'own', title: 'Made on Its Own', min: 0.5, scene: 'ghosts', range: [6, 6],
    heads: ['PRIYA made this one'],
    labels: { 0: { foot: 'a dense cloud that formed in the PRIYA simulation on its own' } },
    steps: [],
    notes: []},
  { id: 'mask', peek: true, title: 'The Mask', min: 3.0, scene: 'mask', range: [0, 5], enter: 'match',
    heads: ['Too loud: the cloud takes over the texture', 'Cut it out', 'Its neighbours are untouched', 'Dense clouds are compact and rare', 'A slit in the box', ''],
    labels: { 1: { foot: CUT } },
    steps: [],
    notes: []},
  { id: 'confession', turn: true, offer: true, title: 'The Confession', min: REAL_LIGHT ? 2.0 : 1.5, scene: 'confession', range: [0, REAL_LIGHT ? 4 : 2], enter: 'continue', interact: true,
    heads: ['The stretch we cut out', 'The simulation: a beam everywhere', 'The real sky gives us only a few lamps', ...(REAL_LIGHT ? ['', 'Every beam carries the texture'] : [])],
    labels: { 2: { foot: SURVEY_PROV }, ...(REAL_LIGHT ? { 4: { foot: SURVEY_PROV } } : {}) },
    steps: [],
    notes: []},
  { id: 'texture', title: 'The Texture', min: 2.0, scene: 'texture', range: [0, 4], droppable: true,
    heads: ['Change the gas, watch the forest', 'Hotter gas: the dips blur', 'If the UV light were stronger: the forest pales', 'The texture: wiggles at each size', 'All three would be ruled out'],
    labels: { 1: { foot: WHAT_IF }, 2: { foot: WHAT_IF }, 3: { foot: TEXTURE }, 4: { foot: TEXTURE } },
    steps: [],
    notes: []},
  { id: 'return', end: true, card: [null, null, 'title'], title: 'Return', min: 1.0, scene: 'return', range: [0, 2], dark: [0, 0, 1],
    heads: ['Back to the beams', 'The same beam as at the start', ''],
    labels: { 0: { foot: SURVEY_PROV } },
    steps: [],
    notes: []},
  { id: 'thanks', card: 'credits', title: 'Thanks', min: 0.7, scene: 'stub', dark: [1],
    heads: [''],
    steps: [],
    notes: []},
];



export const BANNER = 'Simulations and DESI, reading the Lyman-α forest together';
export const ACT1 = 'DESI’s BAO reads the large scales';
export const ACT2 = 'Simulations interpret the small scales DESI cannot interpret alone';
export const ROBUST = 'Robustness: simpler absorber (HCD) models shift both results';
export const EDGE = 'DESI’s 3D Lyα fits use r > 30 h⁻¹ Mpc and marginalize smaller scales';
export const FINER = 'Along each sightline, the forest sees finer scales';
export const MINE = {
  gp: 'data work:\nthe GP DLA finder (Ho, Bird & Garnett 2020, 2021)',
  desi: 'data work:\nthe DR2 DLA catalogue (Brodzeller et al. 2025) and after',
  theory: 'theory work:\nsmall-scale modelling (Ho et al. 2026)',
  priya: 'our simulation:\nPRIYA (Bird, Fernandez, Ho et al. 2023)',
  emu: 'KODIAQ emulator:\nHo et al. 2026; Ho, Bird & Shelton 2022',
  hcd: 'theory work:\nhcd_priya, a new emulator',
  mentor: 'mentoring:\nstudents I co-advise',
  roles: 'theory and data work:\nsimulations, emulators, finder',
};
export const PROV_KINDS = ['data', 'published', 'computed', 'schematic', 'simulated'];
export const WORD_RATE = 110 / 60, BREATH = 1.5;
export const WORD_BUDGET = { 0: 48, 1: 67, 2: 68, 3: 73, 4: 45, 5: 25, 6: 0, 7: 125, 8: 262, 9: 134, 10: 291, 11: 479, 12: 129, 13: 33 };
export const LOGOS = [];
export const SPEAKER = 'Ming-Feng Ho';
export const CUT_SUB = 'one simulated sightline · PRIYA · its DLA cut out';
export function absorberWords3(logN, swap) {
  if (swap > 0.5) return 'the simulation’s own DLA';
  if (logN < 14.5) return 'the forest';
  if (logN < 17.2) return 'one absorber, drawn in by hand';
  if (logN < 20.3) return 'one dense absorber, drawn in by hand';
  return 'one DLA, drawn in by hand';
}

const V2BY = Object.fromEntries(V2.map(B => [B.id, B]));
const fill = (n, v) => Array.from({ length: n }, () => v);
const upto = n => Array.from({ length: n }, (_, i) => i);

function v3Beats(look) {
  const SG = groundOf(surveyLook(look)), CG = groundOf(chartLook(look));
  const S = n => fill(n, SG), C = n => fill(n, CG), P = n => fill(n, 0), D = n => fill(n, 1);
  const R = V2BY.record, W = V2BY.wide, O = V2BY.own, M = V2BY.mask, X = V2BY.texture, F = V2BY.fold;
  const SLICE = 'data · DESI DR1 (public), one slice';
  const stag = (scene, ks, own) => ks.map((k, i) => (SURVEY_TAGS && SURVEY_TAGS[scene] && SURVEY_TAGS[scene][k]) || (Array.isArray(own) ? own[i] : own));
  return r8(r7(r4([
    { id: 'title', section: 0, card: 'title', title: 'Title', min: 0.5, scene: 'stub', dark: D(1),
      heads: [''],
      steps: [],
      notes: []},

    { id: 'fan', section: 1, title: 'DESI collects', min: 0.55, scene: 'fan', ks: [0, 1], dark: S(2),
      heads: ['DESI DR1: one thin slice of the sky', 'Galaxies are points; distant quasars add sightlines'],
      prov: stag('fan', [0, 1], SLICE),
      steps: [],
      notes: []},
    { id: 'split', section: 1, title: 'Tracer by tracer', min: 0.15, scene: 'fan', ks: [2], dark: S(1),
      heads: ['Each tracer at its own redshifts'],
      prov: stag('fan', [2], 'data · DESI DR1 · the sectors schematic'),
      steps: [],
      notes: []},
    { id: 'pairs', section: 2, title: 'Two-point correlation', min: 0.65, scene: 'pairs', ks: upto(7), durs: [2.0, null, null, null, 8.0, 5.5, null], dark: S(7),
      heads: ['Count pairs of galaxies', 'One tracer, one patch', 'Pairs at each separation', 'Against random points', 'ξ(s): the excess of pairs at each separation',
        'Sound waves: slightly more pairs at one separation', 'Along and across the line of sight'],
      prov: stag('pairs', upto(7), [SLICE, 'data · DESI DR1 LRG, one patch', 'computed · pair counts on this patch', 'computed · random points, seeded',
        'computed · this patch only', 'published · the BAO scale', 'schematic · one pair']),
      steps: [],
      notes: []},
    { id: 'lyapairs', section: 3, title: 'The forest’s pairs', min: 0.75, scene: 'lyapairs', ks: [1, 2, 3, 4, 5], dark: S(5),
      heads: ['Now the forest: quasars and their pixels', 'Quasar pairs: counted, like galaxies', 'Pixel–quasar pairs: an average, not a count',
        'Pixel pairs: products that nearly cancel', 'The bump needs all of DESI’s forests'],
      prov: stag('lyapairs', [1, 2, 3, 4, 5], 'computed · DR1'),
      steps: [],
      notes: []},
    { id: 'xi', section: 3, title: 'Each tracer folds to its ξ', min: 0.3, scene: 'xi', ks: upto(3), dark: C(3),
      heads: ['Each tracer gives its own ξ(s)', 'The same bump in every one', 'Lyα: the same scale, from all DESI'],
      prov: 'data · DESI DR2 figures',
      steps: [],
      notes: []},
    { id: 'ruler', section: 4, title: 'Standard ruler', min: 0.45, scene: 'ruler', ks: [0, 1, 2, 3], durs: [null, 7.0, 6.0, 6.0], dark: C(4),
      heads: ['The BAO bump in Lyα clustering is a standard ruler', 'An assumed cosmology stretches the ruler', 'An assumed cosmology stretches the ruler',
        'DESI’s Lyα reads the ruler to just over 1%'],
      prov: ['data · DESI DR2 Lyα ξ', 'schematic · the ring', 'schematic · the ring', 'published · DR2 Lyα BAO'],
      steps: [],
      notes: []},
    { id: 'distances', section: 5, title: 'Distances', min: 0.25, scene: 'w0wa', ks: [0], dark: C(1),
      heads: ['Each tracer gives a distance; Lyα is farthest'],
      prov: ['published · DR2 + ours'],
      steps: [],
      notes: []},
    { id: 'darkenergy', section: 7, title: 'Dark energy', min: 0.8, scene: 'w0wa', ks: [1, 2, 3], durs: [9.0, 8.0, 4.5], dark: C(3),
      heads: ['Dark energy: w_0 and w_a', 'DESI BAO + CMB prefers evolving dark energy', 'Adding supernovae: the preference depends on the sample'],
      prov: ['computed · CAMB curves', 'data · DESI DR2 chains', 'data · DR2 + supernovae'],
      steps: [],
      notes: []},
    { id: 'anchor', section: 7, title: 'Why Lyα: the high-redshift anchor', min: 0.65, scene: 'w0wa', ks: [5, 5], durs: [24.0, 1.0], jumpEase: 'own', dark: C(2),
      heads: ['Lyα: the anchor before dark energy dominated', ACT1],
      prov: 'published · DR2 + ours',
      steps: [],
      notes: []},
    { id: 'scales', section: 7, title: 'From large scales to small', min: 0.65, scene: 'scales', ks: [0, 1, 2, 3], durs: [null, 4.5, 3.0, 4.5], dark: C(4),
      heads: ['Lyα reaches from the largest scales to the smallest', 'Lyα reaches from the largest scales to the smallest',
        'Lyα reaches from the largest scales to the smallest', 'Lyα reaches from the largest scales to the smallest'],
      prov: 'schematic · remake',
      steps: [],
      notes: []},

    { id: 'skewer', section: 8, title: 'Into one skewer', min: 0.15, scene: 'lines', ks: [1, 2], dark: S(2),
      heads: ['Back to the fan: only the quasar sightlines', 'One quasar, one sightline'],
      prov: stag('lines', [1, 2], [SLICE, 'data · DESI DR1: the quasar whose spectrum follows']),
      steps: [],
      notes: []},
    { id: 'spectrum', section: 8, title: 'Its spectrum', min: 1.75, scene: 'spectrum', enter: 'match', ks: upto(10),
      durs: [0.6, 3.6, null, 4.0, 12.0, null, null, null, null, null],
      turn: { 1: [0.08, 0.55] }, arrow: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1], dark: [SG, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      heads: ['One quasar, one sightline', 'Its spectrum: real DESI DR1 data', 'Light against wavelength: the whole spectrum',
        'DESI sees the forest more sharply than SDSS did', 'Lyman-α: hydrogen absorbs at 121.6 nm', 'Seen at (1 + z) × 121.6 nm', 'Each dip: hydrogen somewhere along this sightline',
        'Galaxies: a mean spacing of 12–14 h⁻¹ Mpc', FINER, 'Dense sampling is not independent information'],
      prov: [stag('lines', [2], 'data · DESI DR1 (public)')[0], 'data · DESI DR1', 'data · DESI DR1', 'data · DESI + SDSS',
        'simulated · PRIYA', 'data · DR1 + schematic', 'data · DESI DR1',
        'computed · DR1 + papers', 'computed · DR1 + papers', 'computed · DR1 + papers'],
      steps: [],
      notes: []},

    { id: 'fold', section: 9, turn: true, title: 'From one sightline to the 3D web, and back', min: 0.9, scene: 'fold', ks: [0, 1, 2, 3, 8, 9],
      arrow: [1, 0, 0, 0, 0, 0], dark: P(6), durs: [null, null, null, null, 6.0, null],
      heads: ['We need hydro simulations to interpret the Lyα forest', 'Neighbouring sightlines cross the same gas', 'Many sightlines map the gas between galaxies',
        'Side by side, sightlines make a map of the gas', 'PRIYA simulates the cosmic web of hydrogen in 3D', 'The simulation’s sightlines, drawn through the box in one direction'],
      jumpCurves: {
        4: { curves: { elev: [[0, 0], [0.85, 1]], azim: [[0, 0], [1, 1]], fov: [[0, 0], [0.8, 1]], frame: [[0, 0], [1, 1]], lookY: [[0, 0], [1, 1]],
          slabW: [[0.06, 0], [0.75, 1]], sheetAmt: [[0.2, 0], [0.85, 1]], box: [[0.3, 0], [0.9, 1]], inkScale: [[0, 0], [0.5, 1]] } },
        6: { curves: { comb: [[0, 0], [0.4, 1]], combGrow: [[0, 0], [0.4, 1]], azim: [[0.3, 0], [1, 1]], slabW: [[0.3, 0], [1, 1]], sheetAmt: [[0.3, 0], [1, 1]], frame: [[0.3, 0], [1, 1]],
          inkScale: [[0.3, 0], [1, 1]], heroLine: [[0.5, 0], [1, 1]] } },
      },
      fit: true,
      mine: 'priya',
      prov: 'simulated · PRIYA',
      steps: [],
      notes: []},
    { id: 'photon', section: 9, title: 'One photon, from the lamp to us', min: 0.45, scene: 'arrival', ks: [0, 1, 2], durs: [null, 16.0, null], point: [1, 1, 0], dark: [1, 1, 0],
      heads: ['One photon leaves a quasar', 'The light crosses hydrogen on its way', ''],
      prov: 'simulated · PRIYA',
      steps: [],
      notes: []},
    { id: 'forest', section: 9, strip: true, title: 'The forest, briefly', min: 0.6, scene: 'record', ks: upto(5), arrow: true, dark: P(5),
      heads: [ACT2, 'Transmitted flux: F = e^{−τ}', 'Each dip: hydrogen absorbing', 'Doppler shift: a dip sits off its gas', 'Doppler shift: a dip sits off its gas'],
      labels: { 0: { ...R.labels[0], sub: `${R.labels[0].sub}\nsmall scales: below DESI’s 3D range, r < 30 h⁻¹ Mpc` },
        1: { marks: [{ text: 'pale line: the light expected · shaded: absorbed', u: 0.5, v: -0.02, anchor: 'bottom' }] },
        3: { foot: 'the gas and this spectrum: a sister PRIYA simulation of this stretch; the gas is read directly, not inferred' },
        4: { foot: 'the gas and this spectrum: a sister PRIYA simulation of this stretch; the gas is read directly, not inferred' } },
      prov: 'simulated · PRIYA',
      steps: [],
      notes: []},
    { id: 'wide', section: 10, title: 'Finding DLAs: what they look like', min: 0.75, scene: 'ghosts', ks: [0, 1, 3, 6], durs: [null, null, 4.0, 3.4], arrow: true, dark: P(4),
      heads: ['My first role: finding the dense absorbers', 'More hydrogen: the dip hits the floor', 'A DLA: its width tells how much hydrogen', 'The simulation makes them on its own'],
      labels: { 1: { marks: W.labels[1].marks.map(m => ({ ...m, v: -0.04, anchor: 'bottom' })) }, 2: { marks: W.labels[3].marks.map(m => ({ ...m, rust: false })) } },
      prov: ['simulated · PRIYA', 'schematic · hand-drawn', 'schematic · hand-drawn', 'simulated · PRIYA'],
      steps: [],
      notes: []},
    { id: 'loud', section: 10, title: 'Why find DLAs', min: 0.1, scene: 'mask', ks: [0], enter: 'match', arrow: true, dark: P(1),
      heads: ['A DLA is loud: its wings fake structure'],
      prov: 'simulated · PRIYA',
      steps: [],
      notes: []},
    { id: 'find', section: 10, title: 'Finding DLAs in DESI spectra', min: 0.45, scene: 'find', ks: upto(6), arrow: true, dark: P(6), wordsFrom: { 3: 0.3 },
      heads: ['In real spectra, first find them', 'My GP finder models the quasar’s own light', 'Where the DLA is, and how much hydrogen',
        'P1D: the forest’s power at each scale', 'A mock: DLAs boost P1D’s longest scales', 'My finder marks them; the mask removes most'],
      mine: [null, 'gp', 'gp', 'gp', 'gp', 'gp'],
      prov: ['data · DESI DR1', 'computed · my GP finder', 'computed · my GP finder', 'simulated · PRIYA mocks', 'simulated · PRIYA mocks', 'simulated · PRIYA mocks'],
      steps: [],
      notes: []},
    { id: 'cut', section: 10, peek: true, title: 'Finding DLAs: cut them out', min: 0.8, scene: 'mask3', ks: [1, 2], arrow: true, dark: P(2),
      heads: ['DESI’s DR2 catalogue: every DLA needs my finder', 'Its neighbours are untouched'],
      mine: ['desi', 'desi'],
      prov: 'simulated · PRIYA',
      labels: { 0: { sub: CUT_SUB }, 1: { side: 'Lyman-limit systems\nand sub-DLAs:\ntoo weak to find\none by one;\nthey stay in the data' } },
      steps: [],
      notes: []},
    { id: 'model', section: 10, title: 'DLAs: model what remains', min: 0.4, scene: 'hcd', ks: upto(3), dark: P(3),
      heads: ['Large scales: DESI’s ξ model, no dense absorbers', 'Dense absorbers: the bump stays, the shape changes', 'P1D’s longest scales: masking helps; model the rest'],
      prov: ['computed · HCD model', 'computed · HCD model', 'computed · Rogers et al.'],
      steps: [],
      notes: []},
    { id: 'why', section: 11, title: 'Small scales: why they matter', min: 1.3, scene: 'why', ks: upto(4), dark: P(4),
      heads: ['My second role: why small scales matter', 'The neutrino-mass bound depends on the dark-energy model',
        'Warm dark matter: 2 keV is excluded', 'The forest’s lower limit: 5.7 keV'],
      prov: 'computed · CAMB',
      steps: [],
      notes: []},
    { id: 'hard', section: 11, title: 'Small scales: why they are hard', min: 0.45, scene: 'texture3', ks: upto(4), arrow: true, dark: P(4),
      heads: ['Small scales are hard: the gas matters', 'One short stretch', 'Hotter gas: the dips blur', 'Stronger UV light: the forest pales'],
      labels: { 2: X.labels[1], 3: { ...X.labels[2], sub: '+ resolution, noise and metals; the gas needs simulations', subUnder: true, subFrom: 0.8 } },
      prov: ['simulated · PRIYA', 'simulated · PRIYA', 'simulated · edited PRIYA', 'simulated · edited PRIYA'],
      steps: [],
      notes: []},
    { id: 'priya', section: 11, turn: true, title: 'Small scales: modelling with PRIYA', min: 0.65, scene: 'fold', ks: upto(5), arrow: [1, 0, 0, 0, 0], dark: P(5),
      heads: ['My main work: modelling the small scales', 'Its neighbours look alike', 'Many sightlines', 'A slice', 'PRIYA: whole volumes at many settings'],
      labels: { 4: { side: 'one box, 120 h⁻¹ Mpc across · z = 3\nevery sightline parallel to the drawn line\ndarker = less light gets through' } },
      fit: true,
      mine: 'priya',
      prov: 'simulated · PRIYA',
      steps: [],
      notes: []},
    { id: 'multifid', section: 11, title: 'Small scales: the multi-fidelity idea', min: 0.6, scene: 'emulator', ks: [0, 1, 2], dark: P(3),
      heads: [MF_T, MF_T, MF_T],
      mine: 'emu',
      prov: 'schematic · PRIYA costs',
      steps: [],
      notes: []},
    { id: 'emulator', section: 11, title: 'Small scales: the emulator', min: 0.8, scene: 'emulator', ks: [3, 4, 5], dark: P(3),
      heads: ['The first cosmology fit to KODIAQ-SQUAD’s high-resolution spectra', 'The first cosmology fit to KODIAQ-SQUAD’s high-resolution spectra',
        'The first cosmology fit to KODIAQ-SQUAD’s high-resolution spectra'],
      mine: 'emu',
      prov: 'computed · my emulator',
      steps: [],
      notes: []},
    { id: 'nuisance', section: 11, title: 'Small scales: what else the sampler fits', min: 0.5, scene: 'emulator', ks: [6], dark: P(1),
      heads: ['This is a ~50-parameter fit to multiple IGM observables'],
      mine: 'emu',
      prov: 'computed · my chain',
      steps: [],
      notes: []},
    { id: 'payoff', section: 11, title: 'The payoff: P(k) at z = 3', min: 1.55, scene: 'pk', ks: upto(9), dark: P(9),
      durs: [null, null, null, null, null, null, 14.0, 6.0, 4.5],
      heads: ['Linear matter power spectrum at z = 3', 'DESI’s 3D fits read the large scales', 'The forest’s P1D reaches smaller scales', 'The pivot: height → amplitude, tilt → slope',
        'My point: amplitude agrees with Planck and DESI', 'At the pivot: my slope, somewhat higher', ROBUST, ROBUST, ACT2],
      mine: [null, null, 'theory', 'theory', 'theory', 'theory', 'theory', 'theory', 'theory'],
      prov: ['computed · CAMB', 'published · DR2 Lyα', 'published · P1D ranges', 'published · Planck, DESI',
        'computed · my chains', 'computed · my chains', 'computed · my chains', 'computed · my chains', 'computed · my chains'],
      steps: [],
      notes: []},
    { id: 'now', section: 11, title: 'What I am doing now', min: 0.4, scene: 'mywork', ks: [0, 1, 2, 3], dark: P(4),
      heads: ['', NOW_T,
        'hcd\\_priya: a differentiable Lyα likelihood emulator that includes DLAs', 'I enjoy learning from students!'],
      mine: ['desi', 'hcd', 'hcd', 'mentor'],
      prov: ['', 'schematic · PRIYA shapes', 'simulated · mock data', 'simulated · schematic'],
      durs: [null, 6.0, 10.0, 5.5],
      steps: [],
      notes: []},
    { id: 'contribution', section: 12, title: 'My contribution', min: 0.65, scene: 'mywork', ks: [4, 5, 6, 7], dark: P(4),
      heads: ['My work reads one sightline two ways', 'My work reads one sightline two ways', 'My work reads one sightline two ways', 'My work reads one sightline two ways'],
      mine: 'roles',
      prov: 'simulated · schematic',
      durs: [4.5, 3.5, 4.5, 3.5],
      steps: [],
      notes: []},
    { id: 'close', section: 12, end: true, title: 'Close', min: 0.3, scene: 'close', ks: upto(4), arrow: [0, 0, 1, 0], dark: S(4),
      heads: ['What I add: absorbers and small-scale modelling', 'Large scales: the BAO ring', 'Small scales: DESI resolves about 1 h⁻¹ Mpc', BANNER],
      band: [true, true, true, false],
      prov: [...stag('close', [0, 1, 2], [SLICE, 'published · the BAO scale', 'data · one DR1 spectrum · dips computed']), ''],
      steps: [],
      notes: []},
    { id: 'thanks', section: 13, card: ['credits', 'papers'], band: false, title: 'Thanks', min: 0.67, scene: 'stub', dark: D(2),
      heads: ['', ''],
      steps: [],
      notes: []},
  ])));
}

const PAIRS_T = 'The standard ruler hidden in the two-point correlation function', BAO_T = 'BAO: the standard ruler';
const LYA_T = 'Lyα is unique: pairs along sightlines, across them, and with quasars';
const DLA_T = 'A damped Lyman-α (DLA): the mark of a galaxy on the sightline', FIND_T = 'My finder locates each DLA and measures its hydrogen';
const P1D_T = 'A DLA breaks the rule that hydrogen traces the cosmic web', PRIYA_T = 'Simulations connect the forest to the gas and matter behind it';
const LYA_SCALE_T = 'DESI Lyα probes ~1 h⁻¹ Mpc; Keck/HIRES can probe smaller';
const WDM_T = 'Lyα is also a probe of alternative dark matter', HCD_T = 'Big conceptual gap: simulations miss part of the hydrogen!';
const MF_T = 'Multi-fidelity: near-detailed accuracy for about 8× less computing';
const NOW_T = 'Proposed idea: bridging galaxy physics to the Lyα likelihood';
export const R4 = {
  fan: { steps: [],
    heads: ['DESI: the largest 3D map of the Universe, with galaxies and quasars', 'DESI: the largest 3D map of the Universe, with galaxies and quasars'],
    sub: { 0: 'one thin slice of DR1 (2.5°), seen from above: we are at the tip; farther out is farther away', 1: 'each object appears on the night DESI observed it; quasars add sightlines (red)' } },
  split: { heads: ['Lyα is the high-z probe'], sub: { 0: 'the slice pulls apart by tracer' } },
  pairs: { heads: [PAIRS_T, PAIRS_T, PAIRS_T, PAIRS_T, PAIRS_T, BAO_T, BAO_T], durs: { 5: 9.0 },
    steps: [],
    notes: [],
    sub: { 0: 'counting pairs of galaxies', 1: 'one tracer (red galaxies), one patch', 2: 'pairs at each separation', 3: 'against random points in the same survey footprint',
      4: 'the excess over random: the correlation function ξ(s)', 6: 'separations along and across the line of sight' } },
  lyapairs: { heads: [LYA_T, LYA_T, LYA_T, LYA_T],
    sub: { 1: 'three real pairs in this patch: along one sightline, across sightlines, with a quasar', 2: 'DESI DR2, published: the forest with itself', 3: 'and the forest with quasars: a dip' },
    steps: [],
    notes: []},
  xi: { heads: ['Every DESI tracer shows the same BAO bump', 'Every DESI tracer shows the same BAO bump', 'Lyα shows the same ruler at the highest redshift'] },
  ruler: { heads: ['The forest measures the cosmic ruler (BAO) to about 1%'], durs: { 0: null } },
  distances: { heads: ['Across redshifts, DESI’s tracers measure how the Universe expanded'], sub: { 0: 'distance in ruler units; below, each ÷ the ΛCDM fit, with 1σ errors' },
    steps: [],
    notes: []},
  darkenergy: { heads: ['Evolving dark energy changes distances most at low redshift', 'The fit: only some curves pass through DESI’s points',
    'Adding supernovae: a preference that depends on the sample'], durs: { 1: 14.0, 2: 7.0 },
    sub: { 0: 'the early Universe fixed by the CMB; each curve one dark-energy model', 1: 'each curve is one point in this plane: DESI + CMB' },
    steps: [],
    notes: []},
  anchor: { heads: ['The forest anchors DESI’s dark-energy result at early times'],
    steps: []},
  scales: { sub: { 0: 'comoving scale against redshift', 1: 'the precision probes', 2: 'the Lyα forest: from the BAO ruler to about 1 Mpc', 3: 'where the small end leads: dark matter’s nature' } },
  skewer: { heads: ['Follow one quasar’s light to us', 'Follow one quasar’s light to us'] },
  spectrum: { heads: ['The Lyα forest lies blueward of the quasar’s own Lyα peak', 'The Lyα forest lies blueward of the quasar’s own Lyα peak', 'The Lyα forest lies blueward of the quasar’s own Lyα peak',
    'Same quasar: spectrograph improvement from SDSS to DESI', 'Hydrogen also absorbs at Lyβ, Lyγ… down to the Lyman limit', 'Each dip (sort of) records hydrogen at its own redshift',
    LYA_SCALE_T, LYA_SCALE_T, LYA_SCALE_T, LYA_SCALE_T],
    steps: []},
  forest: { heads: ['The forest records the gas’s properties, not just its place', 'Gas motion shifts dips: one dip can mean gas in different places', 'Gas motion shifts dips: one dip can mean gas in different places', 'Gas motion shifts dips: one dip can mean gas in different places'],
    durs: { 3: 8.0 } },
  wide: { heads: ['Conceptual gap? Galaxies are missing!', DLA_T],
    durs: { 1: 5.0 }, jumpCurves: { 1: { curves: { logN: [[0.05, 0], [0.45, 1]], swap: [[0.5, 0], [0.9, 1]] } } },
    steps: []},
  loud: { heads: ['A treasure for galaxy formation; a trash for cosmology'], sub: { 0: 'its broad trough removes light over a long stretch' } },
  find: { heads: [FIND_T, FIND_T, FIND_T, P1D_T, P1D_T, P1D_T],
    sub: { 0: 'a DESI DR1 spectrum with a DLA', 1: 'the quasar’s own light, modelled with its uncertainty (a Gaussian process)', 2: 'the best model with a DLA',
      3: 'P1D: the forest’s power at each scale (mock spectra)', 4: 'a mock with far more DLAs than real', 5: 'my finder marks them; masking removes most of the excess' } },
  cut: { heads: ['DESI DR2 BAO: every retained DLA has a detection by my finder', 'Only the DLA is cut; the neighbouring sightlines stay'] },
  why: { heads: ['Why physicists care: window at k = 1 h Mpc⁻¹ and beyond', 'Why physicists care: window at k = 1 h Mpc⁻¹ and beyond', WDM_T, WDM_T],
    sub: { 0: 'the matter power at z = 3, relative to the standard model', 1: 'their mass bound depends on the dark-energy model (DESI DR2 BAO + CMB)',
      2: 'a 2 keV thermal relic: excluded by the forest', 3: 'the forest’s lower limit: 5.7 keV (Iršič et al. 2024)' } },
  hard: { heads: ['Resolution changes the small scales: simulations must resolve the gas'] },
  priya: { heads: [PRIYA_T, PRIYA_T, PRIYA_T, PRIYA_T, 'PRIYA varies cosmology and gas physics together'],
    sub: { 0: 'one simulated sightline', 1: 'its neighbours cross the same gas', 2: 'many sightlines', 3: 'a slice: the absorption the simulation predicts',
      4: 'led by Simeon Bird; I helped build it' } },
  payoff: { heads: ['Multiple measurements (almost!) start to converge', 'Multiple measurements (almost!) start to converge', 'Remaining difficulties lie in simulation modelling', HCD_T, HCD_T],
    sub: { 0: 'the pivot: height → amplitude, tilt → slope' } },
};
const R4_SUB_OK = () => false;
export const R7_THROUGH = { spectrum: [6, 7], why: [2], forest: [1] };
function r7(beats) {
  return beats.map(b => (R7_THROUGH[b.id] ? { ...b, through: R7_THROUGH[b.id] } : b));
}

export const R4_CUT = { model: 'all', hard: 'all', cut: 'all',
   xi: 'all', lyapairs: [0, 1, 2, 3], anchor: [0], payoff: [3, 4, 5, 6, 7], close: [3], priya: 'all', darkenergy: 'all',
  ruler: [3], photon: 'all', forest: [1, 2, 3, 4], wide: [0, 3] };
function r4(beats) {
  return beats.filter(b => R4_CUT[b.id] !== 'all').map(b => {
    const cut = R4_CUT[b.id], o = R4[b.id];
    let x = Array.isArray(cut) ? { ...b, ks: cut.map(i => b.ks[i]), heads: cut.map(i => b.heads[i]), steps: [],
      prov: Array.isArray(b.prov) ? cut.map(i => b.prov[i]) : b.prov, durs: b.durs ? cut.map(i => b.durs[i]) : b.durs,
      labels: Object.fromEntries(cut.map((i, j) => [j, (b.labels || {})[i]]).filter(([, v]) => v)), dark: Array.isArray(b.dark) ? cut.map(i => b.dark[i]) : b.dark,
      mine: Array.isArray(b.mine) ? cut.map(i => b.mine[i]) : b.mine } : b;
    if (!o) return x;
    const heads = x.heads.slice(), from = o.headsFrom || 0;
    (o.heads || []).forEach((h, i) => { heads[from + i] = h; });
    const labels = { ...(x.labels || {}) };
    for (const [i, t] of Object.entries(o.sub || {})) if (R4_SUB_OK(b.id, +i)) labels[i] = { ...(labels[i] || {}), sub: t };
    const steps = Array.isArray(x.steps) ? x.steps.slice() : x.steps;
    for (const [i, t] of Object.entries(o.steps || {})) steps[i] = t;
    const durs = o.durs ? Object.assign((x.durs || x.ks.map(() => null)).slice(), o.durs) : x.durs;
    return { ...x, heads, labels, steps, durs, ...(o.notes ? { notes: []} : {}), ...(o.jumpCurves ? { jumpCurves: o.jumpCurves } : {}) };
  });
}

export const R8_ORDER = ['title', 'fan', 'split', 'pairs', 'lyapairs', 'ruler', 'distances', 'anchor', 'scales', 'readings',
  'spectrum', 'fold', 'forest', 'why', 'hard', 'multifid', 'emulator', 'nuisance', 'payoff',
  'wide', 'loud', 'dlapairs', 'mask', 'now', 'cut', 'hcd', 'students', 'contribution', 'close', 'thanks'];
export const R8_MIN = { now: 0.4, mask: 0.8, hcd: 0.85, students: 0.35, dlapairs: 0, pairs: 0.65, readings: 1 };
function sliceBeat(b, i0, i1, id = b.id, extra = {}) {
  const out = { ...b, id, ks: b.ks.slice(i0, i1) };
  for (const key of ['heads', 'steps', 'prov', 'durs', 'dark', 'mine', 'arrow', 'turn', 'point', 'card']) if (Array.isArray(b[key])) out[key] = b[key].slice(i0, i1);
  for (const key of ['labels', 'wordsFrom']) if (b[key]) out[key] = Object.fromEntries(Object.entries(b[key]).filter(([k]) => +k >= i0 && +k < i1).map(([k, v]) => [+k - i0, v]));
  if (b.through) out.through = b.through.filter(i => i >= i0 && i < i1).map(i => i - i0);
  return { ...out, ...extra };
}
const R10_NO_DLAPAIRS = true;
function r8(beats) {
  const by = Object.fromEntries(beats.map(b => [b.id, b]));
  if (by.find && by.find.ks.length === 6) {
    by.mask = sliceBeat(by.find, 3, 6, 'mask', { title: 'Finding DLAs: the masking, on mocks', wordsFrom: undefined });
    delete by.find;
  }
  if (by.now && by.now.ks.length === 4) {
    by.hcd = sliceBeat(by.now, 1, 3, 'hcd', { title: 'What I am doing now: the absorbers in the model', section: 10 });
    by.students = sliceBeat(by.now, 3, 4, 'students', { title: 'The students I mentor', section: 12 });
    by.now = sliceBeat(by.now, 0, 1, 'now', { title: 'What I am doing now', section: 10 });
  }
  if (by.pairs && by.pairs.ks.length === 7) {
    const b = by.pairs, at2 = (v, i) => (Array.isArray(v) ? v[i] : v);
    by.pairs = { ...b, ks: [0, 7], through: undefined, jumpEase: 'curves', min: 0.55,
      heads: ['By DR3 (2026), we finally have ~a million Lyα forest quasars', 'Counting pairs: the standard way to measure how galaxies cluster'],
      prov: [at2(b.prov, 0), at2(b.prov, 5)], dark: [at2(b.dark, 0), at2(b.dark, 5)], durs: [b.durs ? b.durs[0] : null, 11.0],
      mine: Array.isArray(b.mine) ? [b.mine[0], b.mine[5]] : b.mine,
      steps: [],
      labels: Object.fromEntries([[0, (b.labels || {})[0]], [1, (b.labels || {})[5]]].filter(([, v]) => v)),
      notes: []};
  }
  if (by.skewer && !by.readings) {
    const dk = Array.isArray(by.skewer.dark) ? by.skewer.dark[0] : by.skewer.dark;
    by.readings = { id: 'readings', section: 8, title: 'One forest, two readings', min: 1, scene: 'readings', ks: [0, 1, 2], dark: [dk, dk, dk],
      heads: ['Let’s zoom in to one spectrum', 'How small a scale you probe depends on your spectrograph’s resolution', 'How small a scale you probe depends on your spectrograph’s resolution'],
      prov: ['published · DR2', 'data · DESI DR1', 'schematic · DR1'],
      steps: [],
      notes: []};
    delete by.skewer;
  }
  if (by.hard && by.hard.scene !== 'resolution') {
    const b = by.hard, dk = Array.isArray(b.dark) ? b.dark[0] : b.dark;
    by.hard = { ...b, scene: 'resolution', ks: [0, 1], through: [0], durs: [null, 7.0], dark: [dk, dk], arrow: [0, 0], labels: {},
      heads: [R4.hard.heads[0], R4.hard.heads[0]], prov: ['simulated · PRIYA', 'simulated · PRIYA'],
      steps: [],
      notes: []};
  }
  if (by.forest && by.forest.labels && by.forest.labels[0] && by.forest.labels[0].marks) {
    const { 0: _legend, ...rest } = by.forest.labels;
    by.forest = { ...by.forest, labels: rest };
  }
  if (by.loud && !by.dlapairs && !R10_NO_DLAPAIRS) by.dlapairs = { id: 'dlapairs', section: 10, title: 'Why find DLAs: pairs along one sightline', min: 0.35, scene: 'dlapairs', ks: [0, 1], through: [0],
    dark: [0, 0], heads: ['A DLA breaks the rule that hydrogen traces the cosmic web', 'A DLA breaks the rule that hydrogen traces the cosmic web'],
    prov: 'simulated · PRIYA',
    steps: [],
    notes: []};
  for (const id of Object.keys(R8_MIN)) if (by[id] && R8_MIN[id] > 0) by[id] = { ...by[id], min: R8_MIN[id] };
  const left = Object.keys(by).filter(id => !R8_ORDER.includes(id));
  if (left.length) throw new Error(`beats.js r8: not placed in R8_ORDER: ${left.join(', ')}`);
  return R8_ORDER.filter(id => by[id]).map(id => by[id]);
}

export const PROGRAMS = ['lw10', 'v3', 'v2'];
export const PROGRAM = PROGRAM_Q;
export function beatsFor(program = PROGRAM, look = LOOK) { return program === 'v2' ? V2 : program === 'lw10' ? lw10Beats(v3Beats(look)) : v3Beats(look); }
export const BEATS = beatsFor();
export const V3 = V3_FAMILY;
export const atStep = (v, i) => (Array.isArray(v) ? v[i] : v);

export const startsOf = beats => beats.reduce((a, b, i) => (a.push(i ? a[i - 1] + beats[i - 1].min : 0), a), []);
export const STARTS = startsOf(BEATS);
