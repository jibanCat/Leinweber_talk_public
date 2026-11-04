
export const LOOKS = ['scene', 'paper', 'dark'];
export const OVERRIDES = ['paper', 'dark'];
export const KEY = 'lw10-look';

export function chosenLook(query) {
  const q = query && (query.get('look') || (query.get('fanlook') === 'paper' ? 'paper' : null));
  return q && OVERRIDES.includes(q) ? q : 'scene';
}

export const LOOK = typeof location !== 'undefined' ? chosenLook(new URLSearchParams(location.search)) : 'scene';
if (typeof window !== 'undefined') window.__look = LOOK;

export const surveyLook = (look = LOOK) => (look === 'paper' ? 'paper' : 'dark');
export const chartLook = (look = LOOK) => (look === 'dark' ? 'dark' : 'paper');
export const groundOf = name => (name === 'dark' ? 1 : 0);

export const ACCENT = '#B93A20';
export const PALETTES = {
  paper: {
    ground: '#F4F2ED', ink: '#1F2732', secondary: '#4A5566', wash: '#7D8DA3', accent: ACCENT,
    tracers: { BGS: '#5B6472', LRG: '#1F2732', ELG: '#7D8DA3', QSO: '#4A5464', LYA: ACCENT },
  },
  dark: {
    ground: '#0C121B', ink: '#E9E6DF', secondary: '#B8BFCA', wash: '#7D8DA3', accent: '#E8704F',
    tracers: { BGS: '#9ACD32', LRG: '#F2B33D', 'LRG3+ELG1': '#9A8FE6', ELG: '#7FB0DA', QSO: '#5FBF8A', LYA: '#E8704F' },
  },
};

export const SCENE = LOOK === 'paper' ? {
  paper: true, ground: '#F4F2ED', ink: '#3A4049', soft: '#5A6170', muted: '#666C78', axis: 'rgba(90,97,112,0.6)',
  halo: 'rgba(244,242,237,0.92)', frame: 'rgba(90,97,112,0.5)', accent: '#A0503A', desi: '#6A707B', slate: '#66707F',
  hair: 'rgba(90,97,112,0.26)', metal: '#7D6633', shade: 'rgba(100,112,130,0.45)', hot: '#8A6230', cool: '#4F6680',
  kinds: { LLS: '#506A88', subDLA: '#86652F', DLA: '#A54E37' },
  tracers: { BGS: '#5D7340', LRG: '#86652F', ELG: '#506A88', QSO: '#46755B', Lya: '#A0503A' },
} : {
  paper: false, ground: '#0C121B', ink: '#E9E6DF', soft: '#AEB6C2', muted: '#8995A6', axis: 'rgba(125,141,163,0.75)',
  halo: 'rgba(12,18,27,0.92)', frame: 'rgba(174,182,194,0.6)', accent: '#E8704F', desi: '#AEB7C4', slate: '#7D8DA3',
  hair: 'rgba(200,204,210,0.28)', metal: '#D9B26A', shade: 'rgba(120,170,235,0.42)', hot: '#FFCC66', cool: '#7FB0FF',
  kinds: { LLS: '#9FC3E6', subDLA: '#F2B33D', DLA: '#E8704F' },
  tracers: { BGS: '#9ACD32', LRG: '#F2B33D', ELG: '#7FB0DA', QSO: '#5FBF8A', Lya: '#E8704F' },
};
export const INK_GAS = LOOK === 'paper' && !(typeof location !== 'undefined' && new URLSearchParams(location.search).get('gas') === 'framed');
export const IMG = INK_GAS ? { paper: true, ink: '#3A4049', soft: '#5A6170', halo: 'rgba(244,242,237,0.92)', accent: '#A0503A', dark: '#F4F2ED',
  kinds: { LLS: '#506A88', subDLA: '#86652F', DLA: '#A54E37' }, tracers: { BGS: '#5D7340', LRG: '#86652F', ELG: '#506A88', QSO: '#46755B', Lya: '#A0503A' } }
  : { paper: false, ink: '#E9E6DF', soft: '#AEB6C2', halo: 'rgba(12,18,27,0.92)', accent: '#E8704F', dark: '#0C121B',
    kinds: { LLS: '#9FC3E6', subDLA: '#F2B33D', DLA: '#E8704F' }, tracers: { BGS: '#9ACD32', LRG: '#F2B33D', ELG: '#7FB0DA', QSO: '#5FBF8A', Lya: '#E8704F' } };
export const imgSrc = src => (INK_GAS ? src.replace(/(\.[a-z0-9]+)$/, '_paper$1') : src);
export const INKVIEW = {
  paper: [0.957, 0.949, 0.929], tauInk: [0.49, 0.55, 0.64], pdLo: -0.1,
  stops: [[3.9, [0.30, 0.34, 0.41]], [4.3, [0.32, 0.36, 0.43]], [4.8, [0.36, 0.39, 0.45]], [5.4, [0.43, 0.40, 0.42]],
    [6.0, [0.52, 0.41, 0.36]], [6.6, [0.58, 0.42, 0.31]], [7.2, [0.52, 0.38, 0.29]]],
  band: { ground: '#F4F2ED', ink: '#3A4049', muted: '#5A6170', halo: 'rgba(244,242,237,0.92)', seam: 'rgba(58,64,73,0.5)', path: 'rgba(58,64,73,0.55)',
    trail: 'rgba(160,80,58,0.16)', glow: 'rgba(160,80,58,0.5)', core: 'rgba(160,80,58,0.95)', comp: 'source-over',
    quasar: ['rgba(160,80,58,0.95)', 'rgba(160,80,58,0.5)', 'rgba(160,80,58,0)'], galaxy: ['rgba(110,60,44,0.9)', 'rgba(160,80,58,0.45)', 'rgba(160,80,58,0)'] },
};
