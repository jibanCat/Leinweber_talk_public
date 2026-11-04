
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

export const CHANNELS = ['BGS', 'LRG', 'ELG', 'QSO'];
export const GROUPS = ['BGS', 'LRG', 'ELG', 'QSO', 'Lyα'];

export const LOOKS = {
  paper: {
    mode: 0,
    ground: '#F4F2ED', text: '#3A4049', soft: '#5A6170', foot: '#6E7480',
    ink: ['#5D7340', '#86652F', '#506A88', '#46755B'],
    accent: '#A0503A',
    random: '#7D8DA3',
    axis: '#6A7280', axisAlpha: 0.85,
    grain: 1,
    cover: [0.60, 0.50, 0.22, 0.22],
    size: [2.2, 1.5, 1.4, 3.0],
    skewer: { halfW: 0.7, alpha: 0.5, gain: 1.4 },
  },
  dark: {
    mode: 1,
    ground: '#0C121B', text: '#E9E6DF', soft: '#AEB6C2',
    foot: '#626E80',
    ink: ['#9ACD32', '#F2B33D', '#7FB0DA', '#5FBF8A'],
    accent: '#E8704F',
    random: '#9AA4B4',
    axis: '#7D8DA3', axisAlpha: 0.6,
    grain: 0,
    cover: [0.60, 0.45, 0.40, 0.50],
    size: [2.4, 1.6, 1.5, 3.4],
    skewer: { halfW: 1.0, alpha: 0.6, gain: 1.4 },
  },
};

export const SURVEY_LOOK = 'dark';

export function chosenLook(query) {
  const q = query ? query.get('fanlook') : null;
  return q === 'paper' || q === 'dark' ? q : SURVEY_LOOK;
}

export const STRIP_STOPS = [[0, [112, 132, 164]], [0.35, [124, 156, 152]], [0.62, [200, 194, 166]], [1, [196, 152, 92]]];
export const STRIP_N = 16;
export function stripRGB(t) {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  let i = 1;
  while (i < STRIP_STOPS.length - 1 && STRIP_STOPS[i][0] < x) i++;
  const [a0, c0] = STRIP_STOPS[i - 1], [a1, c1] = STRIP_STOPS[i], f = (x - a0) / (a1 - a0);
  return c0.map((v, k) => Math.round(v + (c1[k] - v) * f));
}
export const stripBands = () => Array.from({ length: STRIP_N }, (_, k) => stripRGB((k + 0.5) / STRIP_N));

export function palette(name) {
  const L = LOOKS[name] || LOOKS.paper;
  return {
    name: L === LOOKS.dark ? 'dark' : 'paper', mode: L.mode,
    ground: hex(L.ground), ink: L.ink.map(hex), accent: hex(L.accent), axis: hex(L.axis), axisAlpha: L.axisAlpha,
    grain: L.grain, cover: L.cover.slice(), size: L.size.slice(), skewer: { ...L.skewer },
    marks: [...[L.ground, L.text, L.soft, L.accent, L.ink[1], L.random, L.axis, L.ink[3]].map(hex),
      ...stripBands().map(c => c.map(v => v / 255))],
    css: { ground: L.ground, text: L.text, soft: L.soft, accent: L.accent, random: L.random, lrg: L.ink[1], qso: L.ink[3], foot: L.foot,
      tracers: L.ink.slice() },
  };
}

export function contrast(a, b) {
  const lum = h => {
    const [r, g, bb] = hex(h).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bb;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
