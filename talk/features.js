const DEFAULT = false;
const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('reallight') : null;
const WANT = q === null ? DEFAULT : q === '1' || q === 'standin';
export const REAL_LIGHT_FILE = q === 'standin' ? 'real_light.STANDIN.json' : 'real_light.json';

export function validRealLight(d) {
  const arr = a => Array.isArray(a) && a.length > 100 && a.every(Number.isFinite);
  return !!d && typeof d === 'object' && arr(d.rest_wavelength) && arr(d.flux) && arr(d.continuum) &&
    d.flux.length === d.rest_wavelength.length && d.continuum.length === d.rest_wavelength.length &&
    Math.min(...d.rest_wavelength) < 1100 && Math.max(...d.rest_wavelength) > 1250;
}
let data = null;
if (WANT && typeof location !== 'undefined' && typeof fetch !== 'undefined') {
  const url = new URL(`../volume-spike/data/${REAL_LIGHT_FILE}`, new URL('.', import.meta.url));
  try { const r = await fetch(url); const d = r.ok ? await r.json() : null; if (validRealLight(d)) data = d; } catch {}
  if (!data) console.warn(`real light: ${REAL_LIGHT_FILE} missing or malformed; the insert is off (docs 20)`);
}
export const REAL_LIGHT = WANT && (typeof location === 'undefined' || !!data);
export const REAL_DATA = data;
