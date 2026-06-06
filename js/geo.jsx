// ============================================================
// FloodSense — geo, projection, hex grid & hydrological risk model
// ============================================================

// ---- Backend ML externo (AquaInfer · Railway) ----
// null = usar fallback automático (Open-Meteo + modelo simulado).
// Cuando exista la URL de Railway, cambiar SOLO esta constante para activarlo:
const BACKEND_URL = "https://hackatonagentes-conciencia-production.up.railway.app/predict";

const BOUNDS = { minLng: -99.46, maxLng: -98.82, minLat: 19.12, maxLat: 19.61 };
const LAT0 = (BOUNDS.minLat + BOUNDS.maxLat) / 2;
const KM_PER_DEG = 111;
const kmW = (BOUNDS.maxLng - BOUNDS.minLng) * KM_PER_DEG * Math.cos(LAT0 * Math.PI / 180);
const kmH = (BOUNDS.maxLat - BOUNDS.minLat) * KM_PER_DEG;
const WORLD_ASPECT = kmW / kmH;

function toWorld(lng, lat) {
  const nx = (lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng);
  const ny = (BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat);
  return { x: nx * WORLD_ASPECT, y: ny };
}

const ZONES = [
  { name: "Iztapalapa",          short: "Iztapalapa",   lng: -99.066, lat: 19.357, sus: 0.93, vuln: 0.86, elev: 2230, edo: false, big: true },
  { name: "Tláhuac",             short: "Tláhuac",      lng: -99.001, lat: 19.287, sus: 0.90, vuln: 0.80, elev: 2230, edo: false, big: true },
  { name: "Venustiano Carranza", short: "V. Carranza",  lng: -99.105, lat: 19.423, sus: 0.82, vuln: 0.62, elev: 2232, edo: false },
  { name: "Iztacalco",           short: "Iztacalco",    lng: -99.110, lat: 19.395, sus: 0.80, vuln: 0.60, elev: 2234, edo: false },
  { name: "Xochimilco",          short: "Xochimilco",   lng: -99.103, lat: 19.257, sus: 0.84, vuln: 0.66, elev: 2240, edo: false, big: true },
  { name: "Gustavo A. Madero",   short: "G.A. Madero",  lng: -99.110, lat: 19.487, sus: 0.72, vuln: 0.70, elev: 2245, edo: false },
  { name: "Cuauhtémoc",          short: "Cuauhtémoc",   lng: -99.150, lat: 19.445, sus: 0.56, vuln: 0.45, elev: 2240, edo: false },
  { name: "Benito Juárez",       short: "Benito Juárez",lng: -99.158, lat: 19.372, sus: 0.44, vuln: 0.24, elev: 2245, edo: false },
  { name: "Coyoacán",            short: "Coyoacán",     lng: -99.162, lat: 19.350, sus: 0.40, vuln: 0.34, elev: 2250, edo: false, big: true },
  { name: "Álvaro Obregón",      short: "Á. Obregón",   lng: -99.203, lat: 19.360, sus: 0.50, vuln: 0.56, elev: 2300, edo: false },
  { name: "Tlalpan",             short: "Tlalpan",      lng: -99.169, lat: 19.290, sus: 0.46, vuln: 0.46, elev: 2360, edo: false, big: true },
  { name: "Magdalena Contreras", short: "M. Contreras", lng: -99.240, lat: 19.310, sus: 0.42, vuln: 0.50, elev: 2540, edo: false },
  { name: "Cuajimalpa",          short: "Cuajimalpa",   lng: -99.294, lat: 19.357, sus: 0.36, vuln: 0.44, elev: 2760, edo: false },
  { name: "Miguel Hidalgo",      short: "M. Hidalgo",   lng: -99.205, lat: 19.435, sus: 0.46, vuln: 0.30, elev: 2280, edo: false },
  { name: "Azcapotzalco",        short: "Azcapotzalco", lng: -99.186, lat: 19.483, sus: 0.62, vuln: 0.55, elev: 2240, edo: false },
  { name: "Milpa Alta",          short: "Milpa Alta",   lng: -99.023, lat: 19.192, sus: 0.30, vuln: 0.52, elev: 2520, edo: false },
  { name: "Nezahualcóyotl",      short: "Neza",         lng: -98.995, lat: 19.400, sus: 0.95, vuln: 0.84, elev: 2228, edo: true },
  { name: "Ecatepec",            short: "Ecatepec",     lng: -99.055, lat: 19.585, sus: 0.86, vuln: 0.80, elev: 2235, edo: true },
  { name: "Chimalhuacán",        short: "Chimalhuacán", lng: -98.905, lat: 19.420, sus: 0.90, vuln: 0.82, elev: 2235, edo: true },
  { name: "Naucalpan",           short: "Naucalpan",    lng: -99.245, lat: 19.475, sus: 0.50, vuln: 0.48, elev: 2300, edo: true },
];

function sampleField(wx, wy) {
  let ws = 0, sus = 0, vuln = 0, nearest = null, nd = Infinity;
  for (const z of ZONES) {
    const w = toWorld(z.lng, z.lat);
    const dx = w.x - wx, dy = w.y - wy;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2);
    if (d < nd) { nd = d; nearest = z; }
    const wgt = 1 / (d2 + 0.0008);
    ws += wgt; sus += wgt * z.sus; vuln += wgt * z.vuln;
  }
  return { sus: sus / ws, vuln: vuln / ws, nearest, nd };
}

function hashNoise(i) {
  let x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function buildHexes() {
  const hexes = [];
  const R = 0.0205;
  const hStep = Math.sqrt(3) * R;
  const vStep = 1.5 * R;
  const cols = Math.ceil(WORLD_ASPECT / hStep) + 2;
  const rows = Math.ceil(1 / vStep) + 2;
  let id = 0;
  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const cx = col * hStep + (row % 2 ? hStep / 2 : 0);
      const cy = row * vStep;
      const f = sampleField(cx, cy);
      if (f.nd > 0.135) continue;
      const edgeFade = f.nd > 0.105 ? Math.max(0, 1 - (f.nd - 0.105) / 0.03) : 1;
      const n = hashNoise(id * 3.13);
      const nx = cx / WORLD_ASPECT, ny = cy;
      const lng = BOUNDS.minLng + nx * (BOUNDS.maxLng - BOUNDS.minLng);
      const lat = BOUNDS.maxLat - ny * (BOUNDS.maxLat - BOUNDS.minLat);
      const vertsLL = [];
      for (let k = 0; k < 6; k++) {
        const ang = Math.PI / 180 * (60 * k - 90);
        const vx = cx + R * 0.92 * Math.cos(ang), vy = cy + R * 0.92 * Math.sin(ang);
        const vlng = BOUNDS.minLng + (vx / WORLD_ASPECT) * (BOUNDS.maxLng - BOUNDS.minLng);
        const vlat = BOUNDS.maxLat - vy * (BOUNDS.maxLat - BOUNDS.minLat);
        vertsLL.push([vlat, vlng]);
      }
      const cf = hashNoise(id * 7.73);
      const conf = f.nd > 0.115 ? 2 : (cf < 0.80 ? 0 : cf < 0.94 ? 1 : 2);
      hexes.push({
        id: id++, wx: cx, wy: cy, lng, lat, vertsLL, conf,
        sus: Math.min(1, f.sus * (0.92 + 0.16 * n)),
        vuln: f.vuln, zone: f.nearest, edgeFade, noise: n, R,
      });
    }
  }
  return hexes;
}

const HEXES = buildHexes();

const SCEN = {
  optimista: { mult: 0.62, label: "Optimista", desc: "P10" },
  esperado:  { mult: 1.00, label: "Esperado",  desc: "Mediana" },
  pesimista: { mult: 1.42, label: "Pesimista", desc: "P90" },
};

// ---- Simulation parameter multipliers ----
const DRAIN_MULT  = { excelente: 0.62, bueno: 0.80, basico: 1.00, deficiente: 1.42 };
const SOIL_MULT   = { seco: 0.68, normal: 1.00, saturado: 1.48 };
const CANAL_MULT  = { normal: 1.00, elevado: 1.22, critico: 1.60 };

// simParams: { drainage, soilSat, canalLevel } — null = defaults
function hexRisk(hex, rainMmh, hour, scenKey, simParams) {
  const dp = simParams || {};
  const drainM = DRAIN_MULT[dp.drainage   || "basico"]    || 1;
  const soilM  = SOIL_MULT[dp.soilSat     || "normal"]    || 1;
  const canalM = CANAL_MULT[dp.canalLevel || "normal"]    || 1;

  const scen = SCEN[scenKey] || SCEN.esperado;
  const effRain = rainMmh * scen.mult * drainM * soilM * canalM;
  const rainF = effRain / (effRain + 22);
  const k = 0.34 + 0.44 * hex.sus;
  const timeF = 0.70 + 0.30 * (1 - Math.exp(-hour * k));
  let r = hex.sus * rainF * timeF * 1.62;
  r *= (0.90 + 0.22 * hex.noise);
  r *= hex.edgeFade > 0 ? (0.6 + 0.4 * hex.edgeFade) : 1;
  return Math.max(0, Math.min(1, r));
}

function riskLevel(r) {
  if (r < 0.30) return 0;
  if (r < 0.52) return 1;
  if (r < 0.66) return 2;
  return 3;
}
const LEVEL_NAMES  = ["Sin riesgo", "Bajo", "Medio", "Alto"];
const LEVEL_COLORS = ["#1c3a5e", "#14b8c6", "#f59e0b", "#ef4444"];

function hexFill(r) {
  const lvl = riskLevel(r);
  if (lvl === 0) { const a = 0.13 + r * 0.40; return `rgba(30,64,102,${a.toFixed(3)})`; }
  if (lvl === 1) { const a = 0.30 + (r - 0.30) * 1.0; return `rgba(20,190,205,${a.toFixed(3)})`; }
  if (lvl === 2) { const a = 0.52 + (r - 0.52) * 1.4; return `rgba(245,160,12,${a.toFixed(3)})`; }
  const a = 0.70 + (r - 0.66) * 0.95;
  return `rgba(239,68,68,${Math.min(0.92, a).toFixed(3)})`;
}

function computeState(rainMmh, hour, scenKey, simParams, zoneRain, backendZones) {
  const risks = new Float32Array(HEXES.length);
  const zoneAgg = {};
  let cityNum = 0, cityDen = 0;
  for (let i = 0; i < HEXES.length; i++) {
    const h = HEXES[i];
    let r;
    const bz = backendZones && backendZones[h.zone.name];
    if (bz && typeof bz.nivel_riesgo === "number") {
      // backend ML manda: normaliza nivel_riesgo 1-5 a escala 0-1
      r = Math.max(0, Math.min(1, bz.nivel_riesgo / 5));
    } else {
      // ---- path simulado existente, intacto ----
      const hr = zoneRain && zoneRain[h.zone.name] != null ? zoneRain[h.zone.name] : rainMmh;
      r = hexRisk(h, hr, hour, scenKey, simParams);
    }
    risks[i] = r;
    if (h.edgeFade <= 0.02) continue;
    const w = 0.6 + 0.4 * h.vuln;
    cityNum += r * w * h.edgeFade;
    cityDen += w * h.edgeFade;
    const zn = h.zone.name;
    if (!zoneAgg[zn]) zoneAgg[zn] = { zone: h.zone, num: 0, den: 0, max: 0 };
    zoneAgg[zn].num += r * h.edgeFade;
    zoneAgg[zn].den += h.edgeFade;
    if (r > zoneAgg[zn].max) zoneAgg[zn].max = r;
  }
  const cityMean = cityDen ? cityNum / cityDen : 0;
  const composite = Math.round(Math.min(100, cityMean * 156));
  const zoneScores = Object.values(zoneAgg)
    .filter(z => !z.zone.edo)
    .map(z => {
      const mean = z.num / z.den;
      const score = Math.round(Math.min(100, (mean * 0.62 + z.max * 0.38) * 132));
      return { zone: z.zone, score, mean, max: z.max };
    })
    .sort((a, b) => b.score - a.score);
  let altoHex = 0;
  for (let i = 0; i < HEXES.length; i++) { if (HEXES[i].edgeFade > 0.4 && riskLevel(risks[i]) === 3) altoHex++; }
  const altoColonias = Math.round(altoHex * 0.55);
  return { risks, composite, cityMean, zoneScores, altoColonias };
}

const COLONIAS = [
  { name: "Agrícola Oriental",  alcaldia: "Iztacalco",      level: 3, factor: "Encharcamiento por saturación de drenaje",   min: 2 },
  { name: "Eje 8 Sur",          alcaldia: "Iztapalapa",     level: 3, factor: "Zona de lomas bajas, escurrimiento severo",   min: 3 },
  { name: "La Conchita",        alcaldia: "Tláhuac",        level: 3, factor: "Lecho lacustre, subsidencia del terreno",     min: 5 },
  { name: "Barrio 18",          alcaldia: "Xochimilco",     level: 2, factor: "Nivel elevado en canales",                    min: 7 },
  { name: "Bosques de Aragón",  alcaldia: "Nezahualcóyotl", level: 2, factor: "Cuenca cerrada, cárcamos al límite",          min: 9 },
  { name: "Cd. Cuauhtémoc",     alcaldia: "Ecatepec",       level: 2, factor: "Río de los Remedios cerca de desbordar",      min: 11 },
  { name: "Del Carmen",         alcaldia: "Coyoacán",       level: 1, factor: "Drenaje con capacidad disponible",            min: 14 },
  { name: "Roma Norte",         alcaldia: "Cuauhtémoc",     level: 1, factor: "Monitoreo preventivo en Av. Insurgentes",    min: 16 },
  { name: "Toriello Guerra",    alcaldia: "Tlalpan",        level: 1, factor: "Escurrimiento del Ajusco controlado",         min: 19 },
];

const CONF_COLORS = ["#34d399", "#fbbf24", "#fb923c"];
const CONF_NAMES  = ["Datos reales", "Datos inferidos", "Alta incertidumbre"];
const MAP_CENTER = [19.40, -99.10];
const MAP_ZOOM   = 11;

// ---- Live weather: Open-Meteo (gratis, sin API key, datos de modelos globales que incluyen SMN) ----
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast?latitude=19.4326&longitude=-99.1332&current=temperature_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,relative_humidity_2m,surface_pressure&hourly=precipitation,temperature_2m,weather_code&forecast_days=2&timezone=America%2FMexico_City";

const WX_CODES = {
  0:"Despejado",1:"Mayormente despejado",2:"Parcialmente nublado",3:"Nublado",
  45:"Niebla",48:"Niebla con escarcha",51:"Llovizna ligera",53:"Llovizna",55:"Llovizna intensa",
  56:"Llovizna helada",57:"Llovizna helada",61:"Lluvia ligera",63:"Lluvia moderada",65:"Lluvia fuerte",
  66:"Lluvia helada",67:"Lluvia helada",71:"Nieve ligera",73:"Nieve",75:"Nieve intensa",77:"Aguanieve",
  80:"Chubascos ligeros",81:"Chubascos",82:"Chubascos violentos",85:"Chubascos de nieve",86:"Chubascos de nieve",
  95:"Tormenta eléctrica",96:"Tormenta con granizo",99:"Tormenta con granizo",
};
function wxLabel(code){ return WX_CODES[code] != null ? WX_CODES[code] : "—"; }

// ---- Multi-point real rain per ZONE (Open-Meteo, una sola llamada con N coordenadas) ----
async function fetchZoneRain() {
  const lats = ZONES.map((z) => z.lat).join(",");
  const lngs = ZONES.map((z) => z.lng).join(",");
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=precipitation&timezone=America%2FMexico_City`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Open-Meteo multi HTTP " + res.status);
  const data = await res.json();
  const arr = Array.isArray(data) ? data : [data];
  const out = {};
  ZONES.forEach((z, i) => {
    const c = arr[i] && arr[i].current;
    out[z.name] = c && c.precipitation != null ? c.precipitation : 0;
  });
  return out;
}

// ---- Optional teammate feed (mini-DB → JSON). Contract:
// { updated, zones: { "Iztapalapa": { rain_mmh, soil_sat?, conf? }, ... } }
async function fetchLiveState(url) {
  const res = await fetch(url || "live_state.json", { cache: "no-store" });
  if (!res.ok) throw new Error("live_state.json no disponible");
  const d = await res.json();
  if (!d || !d.zones) throw new Error("live_state.json sin zones");
  const rain = {};
  for (const name in d.zones) {
    const z = d.zones[name];
    if (z && z.rain_mmh != null) rain[name] = z.rain_mmh;
  }
  return { rain, raw: d };
}

// ---- Backend ML (AquaInfer) — GET /predict → { timestamp, zones:{ Zona:{lluvia_mm, prob_lluvia, nivel_riesgo, alerta} } }
// Nunca lanza: si BACKEND_URL es null, hay timeout, CORS, o formato inválido → console.warn y null (fallback).
async function fetchBackendState() {
  if (!BACKEND_URL) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000); // timeout 5s
    const res = await fetch(BACKEND_URL, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(timer);
    if (!res.ok) { console.warn("FloodSense: backend HTTP " + res.status + ", usando fallback"); return null; }
    const data = await res.json();
    if (!data || !data.zones || typeof data.zones !== "object") {
      console.warn("FloodSense: respuesta de backend sin 'zones', usando fallback");
      return null;
    }
    return data.zones;
  } catch (e) {
    console.warn("FloodSense: backend no disponible (" + (e && e.message ? e.message : e) + "), usando fallback");
    return null;
  }
}

async function fetchLiveWeather() {
  const res = await fetch(OPEN_METEO_URL);
  if (!res.ok) throw new Error("Open-Meteo HTTP " + res.status);
  const d = await res.json();
  const cur = d.current || {};
  const hourly = d.hourly || {};
  const times = hourly.time || [];
  // current.time may carry minutes (e.g. 20:15) while hourly is on the hour (20:00);
  // match by the "YYYY-MM-DDTHH" prefix
  const curHourKey = (cur.time || "").slice(0, 13);
  let idx = times.findIndex((t) => t.slice(0, 13) === curHourKey);
  if (idx < 0) idx = 0;
  const precip = hourly.precipitation || [];
  const temps  = hourly.temperature_2m || [];
  const codes  = hourly.weather_code || [];
  const forecast = [];
  for (let k = 1; k <= 6; k++) {
    const j = idx + k;
    forecast.push({ precip: precip[j] != null ? precip[j] : 0, temp: Math.round(temps[j] || 0), code: codes[j] });
  }
  return {
    temp: Math.round(cur.temperature_2m),
    feels: Math.round(cur.apparent_temperature),
    precip: cur.precipitation != null ? cur.precipitation : 0,
    rain: cur.rain != null ? cur.rain : 0,
    wind: Math.round(cur.wind_speed_10m),
    humidity: Math.round(cur.relative_humidity_2m),
    pressure: Math.round(cur.surface_pressure),
    code: cur.weather_code,
    cond: wxLabel(cur.weather_code),
    forecast,
  };
}

// Exposed for use in Alertas authority recommendations
const SIM_PARAMS_META = {
  drainage:   { label: "Alcantarillado",       opts: [{ k:"excelente",c:"#22c55e" },{ k:"bueno",c:"#3b82f6" },{ k:"basico",c:"#f59e0b" },{ k:"deficiente",c:"#ef4444" }], labels:["Excelente","Bueno","Básico","Deficiente"] },
  soilSat:    { label: "Saturación del suelo", opts: [{ k:"seco",c:"#f59e0b" },{ k:"normal",c:"#3b82f6" },{ k:"saturado",c:"#ef4444" }], labels:["Seco","Normal","Saturado"] },
  canalLevel: { label: "Nivel en cauces",      opts: [{ k:"normal",c:"#22c55e" },{ k:"elevado",c:"#f97316" },{ k:"critico",c:"#ef4444" }], labels:["Normal","Elevado","Crítico"] },
};

window.FloodGeo = {
  BOUNDS, WORLD_ASPECT, toWorld, ZONES, HEXES,
  hexRisk, riskLevel, hexFill, computeState,
  LEVEL_NAMES, LEVEL_COLORS, SCEN,
  COLONIAS, CONF_COLORS, CONF_NAMES, MAP_CENTER, MAP_ZOOM,
  DRAIN_MULT, SOIL_MULT, CANAL_MULT, SIM_PARAMS_META,
  fetchLiveWeather, fetchZoneRain, fetchLiveState, fetchBackendState, BACKEND_URL, wxLabel,
};
