// Stylised car illustration in the chosen colour. Placeholder for studio photography: pure inline SVG,
// so it loads instantly (no image weight), recolours when the buyer picks a colour, and works offline.
const BODIES = {
  sedan: {
    body: 'M58 272 L58 224 Q58 208 84 204 L188 192 Q238 114 336 106 L516 106 Q594 114 646 186 L724 200 Q750 206 750 234 L750 272 Z',
    glass: ['M250 188 Q282 128 344 120 L430 120 L430 188 Z', 'M446 120 L514 120 Q562 132 606 188 L446 188 Z'],
  },
  suv: {
    body: 'M56 272 L56 216 Q56 198 84 194 L170 182 Q198 94 290 82 L592 82 Q652 88 678 162 L730 188 Q754 196 754 224 L754 272 Z',
    glass: ['M222 178 Q246 114 302 102 L432 102 L432 178 Z', 'M448 102 L586 102 Q626 114 648 178 L448 178 Z'],
  },
  hatch: {
    body: 'M72 272 L72 214 Q72 198 96 194 L186 184 Q228 106 312 100 L500 100 Q568 108 610 158 L706 194 Q740 202 744 238 L744 272 Z',
    glass: ['M240 182 Q264 122 322 114 L424 114 L424 182 Z', 'M440 114 L500 114 Q542 124 582 182 L440 182 Z'],
  },
};

export default function CarArt({ body = 'sedan', colour = '#b9bdc2', className = '', label = '' }) {
  const b = BODIES[body] ?? BODIES.sedan;
  const id = `g${body}${colour.replace('#', '')}`;
  return (
    <svg className={`car-art ${className}`} viewBox="0 40 800 300" role="img" aria-label={label || 'Car illustration'} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".4" /><stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".38" />
        </linearGradient>
      </defs>
      <ellipse cx="400" cy="322" rx="340" ry="12" fill="#000" opacity=".12" />
      <path d={b.body} fill={colour} />
      <path d={b.body} fill={`url(#${id}s)`} />
      {b.glass.map((g, i) => <path key={i} d={g} fill="#0f1a24" opacity=".85" />)}
      <path d="M60 254 L748 254" stroke="#000" strokeOpacity=".16" strokeWidth="2" />
      <rect x="716" y="214" width="34" height="10" rx="4" fill="#f6f1d8" opacity=".95" />
      <rect x="58" y="214" width="24" height="10" rx="4" fill="#c1272d" opacity=".9" />
      {[200, 600].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="272" r="56" fill="#0d0e10" />
          <circle cx={cx} cy="272" r="33" fill="#d9dce0" />
          <circle cx={cx} cy="272" r="12" fill="#6b7078" />
        </g>
      ))}
    </svg>
  );
}
