import { LW, DESI_CURVES } from '../program.js';

export const SECTION8 = { i: 382175, targetid: '39627770032034423', zq: 2.8110 };

export const R_D_MPC = 147.09;
export const H_FID = 0.6736;
export const R_D_H = R_D_MPC * H_FID;
export const BAO_WORDS = '≈ 100 h⁻¹ Mpc';
export const R_D_WORDS = '≈ 99 h⁻¹ Mpc';
export const DESI_RES = { range: [0.928, 1.392], value: 1.114, words: '≈ 1 h⁻¹ Mpc' };
export const GAL_SPACING = { range: [12.45, 13.64], words: '12–14 h⁻¹ Mpc' };

const DR1 = 'https://data.desi.lbl.gov/public/dr1/';
export const PROVENANCE = {
  "fan": {
    "kind": "data",
    "source_url": "https://data.desi.lbl.gov/public/dr1/survey/catalogs/dr1/LSS/iron/LSScats/v1.2/"
  },
  "skewers": {
    "kind": "data",
    "source_url": "https://data.desi.lbl.gov/public/dr1/vac/dr1/lya-deltas/v1.0/delta-lya-0-0/"
  },
  "hero": {
    "kind": "data",
    "source_url": "https://astrosparcl.datalab.noirlab.edu/api"
  },
  "sectors": {
    "kind": "schematic",
    "source_url": "https://data.desi.lbl.gov/public/dr1/survey/catalogs/dr1/LSS/iron/LSScats/v1.2/"
  },
  "ticks": {
    "kind": "computed",
    "source_url": "https://arxiv.org/abs/2503.14739v3"
  },
  "date": {
    "kind": "data",
    "source_url": "https://datalab.noirlab.edu/tap"
  },
  "bao_scale": {
    "kind": "published",
    "source_url": "https://arxiv.org/abs/2503.14739v3"
  },
  "sound_horizon": {
    "kind": "published",
    "source_url": "https://arxiv.org/abs/2503.14739v3"
  },
  "estimator": {
    "kind": "published",
    "source_url": "https://arxiv.org/abs/2503.14738v3"
  },
  "lyapairs": {
    "kind": "computed",
    "source_url": "https://data.desi.lbl.gov/public/dr1/vac/dr1/lya-deltas/v1.0/delta-lya-0-0/"
  },
  "desi_lya": {
    "kind": "published",
    "source_url": "https://zenodo.org/records/16644577"
  },
  "desi_lrg": {
    "kind": "published",
    "source_url": "https://zenodo.org/records/16644577"
  },
  "slice_sketch": {
    "kind": "schematic",
    "source_url": "https://data.desi.lbl.gov/public/dr1/survey/catalogs/dr1/LSS/iron/LSScats/v1.2/"
  },
  "dr_note": {
    "kind": "published",
    "source_url": "https://data.desi.lbl.gov/doc/releases/"
  },
  "y_titles": {
    "kind": "published",
    "source_url": "https://zenodo.org/records/16644577"
  },
  "scale_bar": {
    "kind": "computed",
    "source_url": "https://arxiv.org/abs/2503.14739v3"
  },
  "bao_words": {
    "kind": "published",
    "source_url": "https://arxiv.org/abs/2503.14738v3"
  },
  "resolution": {
    "kind": "published",
    "source_url": "https://arxiv.org/abs/2205.10939"
  },
  "galaxy_spacing": {
    "kind": "computed",
    "source_url": "https://data.desi.lbl.gov/public/dr1/survey/catalogs/dr1/LSS/iron/LSScats/v1.2/"
  },
  "pairs": {
    "kind": "computed",
    "source_url": "https://data.desi.lbl.gov/public/dr1/survey/catalogs/dr1/LSS/iron/LSScats/v1.2/"
  },
  "spacing": {
    "kind": "computed",
    "source_url": "https://astrosparcl.datalab.noirlab.edu/api"
  }
};

export const TAGS = {
  fan: ['data · DESI DR1', 'data · DESI DR1', 'data · DR1 · moved apart', 'data · DESI DR1', 'data · DESI DR1'],
  pairs: ['data · DESI DR1', 'data · DR1 LRGs', 'computed · DR1', 'computed · DR1', 'computed · DR1', 'published · DESI', 'data · DR1 LRGs', 'published · DESI'],
  lyapairs: ['data · DR1 LRGs', 'data · DESI DR1', 'data · DESI DR1', !DESI_CURVES ? 'data · DESI DR1' : LW ? 'data + published' : 'published · DR2', 'published · DR2', 'computed · DR1'],
  lines: ['data · DESI DR1', 'data · DESI DR1', 'data · DESI DR1'],
  readings: ['published · DR2', 'data · DESI DR1', 'schematic · DR1'],
  close: ['data · DESI DR1', 'published · DESI', 'computed · DR1', 'data · DESI DR1'],
};

export const FEET = [
  ['slice', 'one 2.5°-thick slice of DESI DR1 · redshift arcs at DESI’s fiducial cosmology · the sketch: schematic'],
  ['cat', 'DESI DR1 public catalogues (LSS v1.2) · the sightlines: the Lyα forest DESI used (v1.0)'],
  ['sectors', 'DESI DR1 public catalogues · the sectors are schematic: each tracer moved apart, distances kept'],
  ['hero', 'DESI DR1 quasar {targetid}, z = {z} · its forest as DESI used it'],
  ['patch', 'DESI DR1 LRG clustering catalogue (LSS v1.2) · one patch of the slice, drawn flat'],
  ['counts', 'pair counts on this patch of DR1 LRGs · separations in the slice’s plane (2D; section 3’s are 3D)'],
  ['randoms', 'random points: seeded, no clustering · the counts use 20× as many (8 million of their pairs)'],
  ['xi', 'the simplest estimator, computed on this patch · DESI uses Landy–Szalay (DESI Collaboration 2025, DR2 II)'],
  ['rd', 'r_{d} = 147.09 Mpc = 99.08 h⁻¹ Mpc (DESI Collaboration 2025, DR2 I) · ring for illustration'],
  ['desilrg', 'ring for illustration · curve: DESI DR2 LRGs, {lrgz} · DESI Collaboration 2025 (DR2 II, Fig. 5)'],
  ['split', 'one real pair of DR1 LRGs, split along and across'],
  ['lyapatch', 'DESI DR1 Lyα forests (deltas v1.0) and quasars · one patch at z 2.1–3.0'],
  ['kinds', 'three real pairs of this patch’s pixels and quasars (DR1), {apart} h⁻¹ Mpc apart'],
  ['desi', LW ? 'patch: DESI DR1 · curve: {lyaz}, one wedge of the 2D clustering · DESI Collaboration 2025 (DR2 II, Fig. 5)'
    : '{lyaz}, one wedge of the 2D clustering (DESI fits all of it) · DESI Collaboration 2025 (DR2 II, Fig. 5)'],
  ['sample', 'pairs in this patch, counted in 3D, 5–165 h⁻¹ Mpc · DR1: {forests} forests (DESI 2024 VI)'],
  ['ring', 'r_{d} = 147.09 Mpc ≈ 100 h⁻¹ Mpc (DESI Collaboration 2025: DR2 I, Table 1; “around 100”: DR2 II)'],
  ['spacing', 'one DR1 spectrum ({targetid}) · resolution: DESI’s R 2000–3000 · galaxies: DR1 mean spacing'],
];
