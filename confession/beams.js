
export const NY = 480;
export const G = 64;
export const FACE_DEG2 = (120 / 75.8) ** 2;
export const DLA = { row: 341, iz: 240 };
export const OBS_N = 240;
export const TUBE = 1.3;

function hash(i, salt) {
  let x = Math.imul(i ^ salt, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
export const worldY = row => 0.5 - (row + 0.5) / NY;
export const worldZ = iz => (iz + 0.5) / NY - 0.5;

export function buildBeams(perDeg2 = 55) {
  const nComb = G * G;
  const nObs = Math.round(perDeg2 * FACE_DEG2);
  const order = Array.from({ length: nComb }, (_, i) => i).sort((a, b) => hash(a, 0x51ed) - hash(b, 0x51ed) || a - b);
  const rank = new Int32Array(nComb);
  order.forEach((i, r) => { rank[i] = r; });
  const n = nComb + 1;
  const rows = Math.ceil(n / 128);
  const packed = new Float32Array(128 * rows * 4);
  const kept = [];
  for (let i = 0; i < nComb; i++) {
    const y = 0.5 - (Math.floor(i / G) + 0.5 + 0.8 * (hash(i, 0x7a3) - 0.5)) / G;
    const z = (i % G + 0.5 + 0.8 * (hash(i, 0x3c1) - 0.5)) / G - 0.5;
    const obs = rank[i] >= nComb - nObs;
    const bright = obs ? 0.35 + 0.65 * hash(i, 0xb419) : 0;
    packed.set([y, z, rank[i], bright], 4 * i);
    if (obs) kept.push({ index: i, y, z, bright });
  }
  packed.set([worldY(DLA.row), worldZ(DLA.iz), nComb, 1], 4 * nComb);
  kept.push({ index: nComb, y: worldY(DLA.row), z: worldZ(DLA.iz), bright: 1, dla: true });

  const mask = new Uint8Array(OBS_N * OBS_N);
  const R = Math.ceil(3 * TUBE);
  for (const b of kept) {
    const cy = (0.5 - b.y) * OBS_N - 0.5, cz = (b.z + 0.5) * OBS_N - 0.5;
    for (let r = Math.floor(cy) - R; r <= Math.ceil(cy) + R; r++) for (let c = Math.floor(cz) - R; c <= Math.ceil(cz) + R; c++) {
      if (r < 0 || c < 0 || r >= OBS_N || c >= OBS_N) continue;
      const d2 = (r - cy) ** 2 + (c - cz) ** 2;
      const v = Math.round(255 * Math.exp(-d2 / (2 * TUBE * TUBE)));
      if (v > mask[r * OBS_N + c]) mask[r * OBS_N + c] = v;
    }
  }
  const keptPacked = new Float32Array(Math.ceil(kept.length / 64) * 64 * 4);
  kept.forEach((b, j) => keptPacked.set([b.y, b.z, b.index, b.bright], 4 * j));
  return { packed, n, nComb, nObs: kept.length, kept, keptPacked, mask };
}
