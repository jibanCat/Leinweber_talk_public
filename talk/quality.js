export const LEVELS = {
  full: { res: 540, steps: 240, dpr: 2, label: 'full (540 px volume, 240 samples, up to 2× pixels)' },
  balanced: { res: 432, steps: 180, dpr: 1.5, label: 'balanced (432 px, 180 samples, up to 1.5×)' },
  light: { res: 360, steps: 140, dpr: 1, label: 'light (360 px, 140 samples, 1×)' },
};
export const ORDER = ['full', 'balanced', 'light'];
export const KEY = 'lw10-quality';
export function chosen(query) {
  const q = query.get('quality');
  if (q && LEVELS[q]) return q;
  try { const s = localStorage.getItem(KEY); if (s && LEVELS[s]) return s; } catch {}
  return 'full';
}
export function store(name) { try { localStorage.setItem(KEY, name); } catch {} }
export const HEAVY = [['b3.5', 0.5, 'the fold: drift'], ['b8.1', 1, 'beat 8: the full comb'],
  ['b1.1', 0.5, 'beat 1: the crossing'], ['b4.1', 1, 'beat 4: inside the void'], ['b7.4', 1, 'beat 7: the close-up']];
export const HEAVY_V3 = [['fan.1', 1, 'the fan, every object'], ['skewer.0', 0.5, 'the iris: the fan and a chart at once'], ['skewer.2', 0.5, 'the fan turning to one skewer'],
  ['ruler.2', 1, 'the ruler: the chain’s cloud'], ['payoff.7', 1, 'the robustness plane: three contours, full frame'],
  ['priya.4', 0.5, 'the fold into the volume'], ['priya.4', 1, 'PRIYA: the hero view'],
  ['cut.1', 1, 'the cut: its neighbours'], ['forest.3', 1, 'the gas over the record']];
export const heavyFor = program => (program === 'v2' ? HEAVY : HEAVY_V3);

export const CONTRAST = {
  standard: { ink: 0.20, label: 'standard (volume ink 0.20)' },
  strong: { ink: 0.26, label: 'projector-safe (volume ink 0.26, for a washed-out projector)' },
};
export const CKEY = 'lw10-contrast';
export function chosenContrast(query) {
  const q = query.get('contrast');
  if (q && CONTRAST[q]) return q;
  try { const s = localStorage.getItem(CKEY); if (s && CONTRAST[s]) return s; } catch {}
  return 'standard';
}
export function storeContrast(name) { try { localStorage.setItem(CKEY, name); } catch {} }
