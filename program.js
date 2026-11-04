const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('talk')
  : (typeof process !== 'undefined' && process.env && process.env.TALK) || null;
export const PROGRAM = 'lw10';
export const V3_FAMILY = PROGRAM !== 'v2';
export const LW = PROGRAM === 'lw10';
export const DESI_CURVES = !LW;
