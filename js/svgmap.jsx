// ============================================================
// FloodSense — SVGHexMap: lightweight static SVG hex map
// used by the hero preview and the Transparencia confidence map
// ============================================================
const Gs = window.FloodGeo;
const WAs = Gs.WORLD_ASPECT;
const _w  = (lng, lat) => { const w = Gs.toWorld(lng, lat); return w.x.toFixed(4) + "," + w.y.toFixed(4); };
const _wp = (pts) => pts.map(([la, ln]) => _w(ln, la)).join(" ");

const SROADS = [
  [[19.545,-99.128],[19.49,-99.142],[19.445,-99.155],[19.40,-99.168],[19.355,-99.178],[19.31,-99.183],[19.285,-99.180]],
  [[19.487,-99.095],[19.455,-99.128],[19.435,-99.155],[19.424,-99.178],[19.420,-99.206]],
  [[19.515,-99.205],[19.46,-99.236],[19.40,-99.256],[19.345,-99.256],[19.30,-99.236],[19.275,-99.196],[19.276,-99.145],[19.29,-99.095],[19.322,-99.06]],
  [[19.405,-99.205],[19.402,-99.16],[19.40,-99.11],[19.40,-99.06]],
];
const SWATER = [
  [[19.278,-99.108],[19.27,-99.082],[19.252,-99.07],[19.24,-99.088],[19.246,-99.112],[19.266,-99.12]],
  [[19.535,-99.045],[19.505,-99.00],[19.46,-98.985],[19.435,-99.02],[19.46,-99.06],[19.505,-99.065]],
];
const SHILLS = [
  { lng: -99.27, lat: 19.27, r: 0.17, c: "rgba(48,70,60,0.40)" },
  { lng: -99.13, lat: 19.55, r: 0.14, c: "rgba(46,60,56,0.30)" },
];

const SHEX_POLYS = Gs.HEXES.map((h) => {
  const pts = [];
  for (let k = 0; k < 6; k++) {
    const ang = Math.PI / 180 * (60 * k - 90);
    pts.push((h.wx + h.R * 0.92 * Math.cos(ang)).toFixed(4) + "," + (h.wy + h.R * 0.92 * Math.sin(ang)).toFixed(4));
  }
  return pts.join(" ");
});

function SVGHexMap({ fillFn, strokeFn, labels, glowAlto }) {
  return (
    <svg className="svghexmap" viewBox={`0 0 ${WAs} 1`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="sbasin" cx="42%" cy="44%" r="62%">
          <stop offset="0%" stopColor="#0e1c2c" /><stop offset="100%" stopColor="#070b13" />
        </radialGradient>
        <filter id="ssoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.045" /></filter>
      </defs>
      <rect x={-0.2} y={-0.2} width={WAs + 0.4} height={1.4} fill="url(#sbasin)" />
      <g filter="url(#ssoft)">
        {SHILLS.map((h, i) => { const w = Gs.toWorld(h.lng, h.lat); return <circle key={i} cx={w.x} cy={w.y} r={h.r} fill={h.c} />; })}
      </g>
      {SWATER.map((p, i) => <polygon key={i} points={_wp(p)} fill="rgba(22,118,140,0.30)" />)}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {SROADS.map((p, i) => <polyline key={i} points={_wp(p)} stroke="rgba(124,154,184,0.20)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
      </g>
      <g>
        {SHEX_POLYS.map((pts, i) => {
          const h = Gs.HEXES[i];
          const lvl = glowAlto ? glowAlto(h, i) : 0;
          return <polygon key={i} points={pts} fill={fillFn(h, i)}
            stroke={strokeFn ? strokeFn(h, i) : "rgba(255,255,255,0.05)"} strokeWidth="0.6"
            vectorEffect="non-scaling-stroke" className={lvl === 3 ? "alto" : ""} />;
        })}
      </g>
      {labels && labels.map((l, i) => {
        const w = Gs.toWorld(l.lng, l.lat);
        return <text key={i} x={w.x} y={w.y} className="svgmap-label" textAnchor="middle">{l.t}</text>;
      })}
    </svg>
  );
}

window.SVGHexMap = SVGHexMap;
