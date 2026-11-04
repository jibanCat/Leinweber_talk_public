
import { recordWindow } from '../ghosts-spike/ghosts.js';

export const ROW = 96;
export const NX = 1389;
export const REGIONS = [
  { key: 'z', lo: 465, hi: 502, kind: 'void' },
  { key: 'x', lo: 545, hi: 598, kind: 'void' },
  { key: 'c', lo: 913, hi: 960, kind: 'void' },
  { key: 'v', lo: 1064, hi: 1165, kind: 'void' },
  { key: 'n', lo: 801, hi: 820, kind: 'knot' },
];
export const DEFAULT = 3;
export const Y_ROW = 0.5 - (ROW + 0.5) / 480;
export const xOf = r => ((r.lo + r.hi) / 2 + 0.5) / NX - 0.5;

export function applyAnswer(s, answer = DEFAULT) {
  if (!s.toRegion) return s;
  return { ...s, driftX: s.driftX + xOf(REGIONS[answer]) * s.toRegion };
}
export const cfgFor = (answer, s = {}) => {
  const r = REGIONS[answer];
  return { hero: ROW, mask: [r.lo, r.hi], win: (s.ghostWin || 0) > 0.5 ? recordWindow() : [r.lo, r.hi] };
};
export const answerOfKey = key => REGIONS.findIndex(r => r.key === key);
