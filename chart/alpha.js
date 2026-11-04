
export const ALPHA_FAMILY = 'LyaAlpha';
let ready = null;

export function loadAlpha() {
  if (ready) return ready;
  if (typeof document === 'undefined' || !document.fonts || typeof FontFace === 'undefined') return (ready = Promise.resolve(false));
  const faces = [
    new FontFace(ALPHA_FAMILY, 'local("STIX Two Text"), local("STIXTwoText")', { unicodeRange: 'U+03B1, U+03BD' }),
    new FontFace(ALPHA_FAMILY, 'local("STIX Two Text Italic"), local("STIXTwoText-Italic")', { unicodeRange: 'U+03B1, U+03BD', style: 'italic' }),
  ];
  ready = Promise.all(faces.map(f => f.load().then(l => { document.fonts.add(l); return true; }, () => false)))
    .then(r => r.some(Boolean));
  return ready;
}
