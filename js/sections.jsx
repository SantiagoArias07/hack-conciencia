// ============================================================
// FloodSense — Navbar + Hero (Inicio) + Alertas + Transparencia
// ============================================================
const Gx = window.FloodGeo;

function Logo({ small }) {
  return (
    <div className="brandlogo">
      <div className="drop">
        <span className="pulse-ring" /><span className="pulse-ring b" />
        <svg width={small ? 24 : 28} height={small ? 24 : 28} viewBox="0 0 24 24" fill="none">
          <path d="M12 2.5c0 0 7 7.2 7 12.1A7 7 0 1 1 5 14.6C5 9.7 12 2.5 12 2.5Z" fill="#00d4ff" fillOpacity="0.18" stroke="#00d4ff" strokeWidth="1.6" />
          <path d="M9.4 14.5a2.6 2.6 0 0 0 2.6 2.6" stroke="#67e8f9" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>
      <div className="name">Flood<b>Sense</b></div>
    </div>
  );
}

const NAV_ITEMS = [
  { id: "inicio",        label: "Inicio" },
  { id: "simulador",     label: "Simulador" },
  { id: "alertas",       label: "Alertas" },
  { id: "transparencia", label: "Transparencia" },
];

function Navbar({ active, onNav, onShare }) {
  const [clock, setClock] = React.useState("");
  React.useEffect(() => {
    const t = () => {
      const d = new Date();
      setClock(`${window.pad2(d.getHours())}:${window.pad2(d.getMinutes())}:${window.pad2(d.getSeconds())}`);
    };
    t(); const id = setInterval(t, 1000); return () => clearInterval(id);
  }, []);
  return (
    <nav className="navbar">
      <div className="nav-left" onClick={() => onNav("inicio")} style={{ cursor: "pointer" }}><Logo small /></div>
      <div className="nav-center">
        {NAV_ITEMS.map((n) => (
          <button key={n.id} className={"navlink" + (active === n.id ? " on" : "")} onClick={() => onNav(n.id)}>
            {n.label}<span className="ul" />
          </button>
        ))}
      </div>
      <div className="nav-right">
        <div className="live-chip">
          <span className="live" />
          <span className="mono">EN VIVO</span>
          <span className="mono nclk">{clock}</span>
        </div>
        <button className="btn-share" onClick={onShare}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v13M7 8l5-5 5 5" stroke="#021016" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Compartir alerta
        </button>
      </div>
    </nav>
  );
}

/* ===================== HERO · INICIO ===================== */
function KPICard({ label, value, unit, accent, sub }) {
  return (
    <div className="kpi glass">
      <div className="kpi-label">{label}</div>
      <div className="kpi-val mono" style={{ color: accent }}>{value}<small>{unit}</small></div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

function HeroSection({ modelState, rainMmh, scenario, onNav }) {
  const [secs, setSecs] = React.useState(2 * 3600 + 14 * 60);
  React.useEffect(() => {
    const id = setInterval(() => setSecs((s) => (s <= 0 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const vh = Math.floor(secs / 3600);
  const vm = Math.floor((secs % 3600) / 60);
  const vs = secs % 60;

  const sm = Gx.SCEN[scenario].mult;
  const fc = [
    { t: "Ahora", v: Math.round(rainMmh) },
    ...[41, 47, 38, 28, 18, 11].map((v, i) => ({ t: "+" + (i + 1) + "h", v: Math.round(v * sm) })),
  ];
  const lvlOf = (v) => v >= 45 ? 3 : v >= 25 ? 2 : v >= 8 ? 1 : 0;
  const dotc  = ["#1c3a5e", "#22d3ee", "#f59e0b", "#ef4444"];
  const icoOf = (v) => v >= 45 ? "⛈" : v >= 25 ? "🌧" : v >= 8 ? "🌦" : "🌤";

  const feed = [
    { c: "red",   dot: "🔴", name: "Iztapalapa", lvl: "Alto",  ago: "hace 3 min" },
    { c: "amber", dot: "🟡", name: "Xochimilco", lvl: "Medio", ago: "hace 7 min" },
    { c: "blue",  dot: "🔵", name: "Coyoacán",   lvl: "Bajo",  ago: "hace 12 min" },
  ];

  return (
    <section className="section sec-inicio">
      <div className="hero-inner">
        <div className="hero-head">
          <div className="hero-eyebrow"><span className="live" /> Monitoreo en tiempo real · Ciudad de México</div>
          <h1 className="hero-title">Anticipa la inundación,<br /><span>antes de la primera gota crítica.</span></h1>
          <p className="hero-sub">Inteligencia hidrológica que combina radar, topografía y drenaje para estimar el riesgo de encharcamiento por colonia — incluso donde no hay sensores.</p>
        </div>

        <div className="kpi-row">
          <KPICard label="Lluvia actual"          value={Math.round(rainMmh)}                   unit=" mm/h" accent="var(--cyan)"  sub="Intensidad media en la cuenca" />
          <KPICard label="Colonias en riesgo alto" value={Math.max(modelState.altoColonias, 0)}  unit=""     accent="var(--red)"   sub="Requieren atención inmediata" />
          <KPICard label="Datos inferidos por IA"  value="47"                                    unit=""     accent="var(--cyan)"  sub="Colonias sin sensor, modeladas" />
          <KPICard label="Ventana de acción"        value={`${vh}h ${window.pad2(vm)}m`}          unit=""     accent="var(--amber)" sub={<span className="mono" style={{ fontSize: 10 }}>{`restan ${window.pad2(vm)}:${window.pad2(vs)}`}</span>} />
        </div>

        <div className="fc-strip glass">
          <div className="fc-strip-h"><span className="eyebrow"><span className="tick" style={{ background: "var(--cyan)" }} />Pronóstico de intensidad · próximas 6 horas</span></div>
          <div className="fc-cols">
            {fc.map((f, i) => {
              const lvl = lvlOf(f.v);
              return (
                <div className={"fc-col" + (i === 0 ? " now" : "")} key={i}>
                  <div className="fc-t">{f.t}</div>
                  <div className="fc-ico">{icoOf(f.v)}</div>
                  <div className="fc-v mono" style={{ color: dotc[lvl] }}>{f.v}<small>mm</small></div>
                  <div className="fc-dot" style={{ background: dotc[lvl], boxShadow: `0 0 8px ${dotc[lvl]}` }} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="hero-2col">
          <div className="hero-map glass" onClick={() => onNav("simulador")}>
            <div className="hero-map-tag">
              <span className="mono">MAPA DE RIESGO H3 · CDMX</span>
              <span className="hero-map-cta">Abrir simulador →</span>
            </div>
            <div className="hero-map-svg">
              <SVGHexMap
                fillFn={(h, i) => Gx.hexFill(modelState.risks[i])}
                strokeFn={(h, i) => Gx.riskLevel(modelState.risks[i]) >= 2 ? "rgba(255,255,255,0.12)" : "rgba(120,160,200,0.05)"}
                glowAlto={(h, i) => Gx.riskLevel(modelState.risks[i])}
              />
            </div>
          </div>
          <div className="hero-feed glass">
            <div className="feed-h"><div className="eyebrow"><span className="tick" style={{ background: "var(--red)" }} />Últimas alertas</div></div>
            {feed.map((a, i) => (
              <div className={"feed-card " + a.c} key={i} onClick={() => onNav("alertas")}>
                <div className="feed-ico">{a.dot}</div>
                <div className="feed-body">
                  <div className="feed-name">{a.name}</div>
                  <div className="feed-meta">
                    <span className={"feed-badge " + a.c}>{a.lvl}</span>
                    <span className="feed-ago mono">{a.ago}</span>
                  </div>
                </div>
                <svg className="feed-arr" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            ))}
            <button className="feed-all" onClick={() => onNav("alertas")}>Ver todas las alertas →</button>
          </div>
        </div>

        <button className="scroll-cue" onClick={() => onNav("simulador")}>
          <span>Explorar el simulador</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </section>
  );
}

/* ===================== ALERTAS ===================== */
const LV_BADGE = { 3: { t: "Alto", c: "red" }, 2: { t: "Medio", c: "amber" }, 1: { t: "Bajo", c: "blue" } };

function AlertasSection({ onNav }) {
  const [filter, setFilter] = React.useState(0);
  const [q, setQ] = React.useState("");
  const list = Gx.COLONIAS.filter((c) =>
    (filter === 0 || c.level === filter) &&
    (q === "" || (c.name + " " + c.alcaldia).toLowerCase().includes(q.toLowerCase()))
  );
  const pills = [{ k: 0, t: "Todos" }, { k: 3, t: "Alto" }, { k: 2, t: "Medio" }, { k: 1, t: "Bajo" }];

  return (
    <section className="section sec-alertas">
      <div className="sec-inner">
        <div className="sec-head">
          <div className="eyebrow"><span className="tick" style={{ background: "var(--red)" }} />Alertas activas</div>
          <h2 className="sec-title">Estado por colonia</h2>
          <p className="sec-desc">Alertas vigentes en la Zona Metropolitana. Datos actualizados cada 2 minutos.</p>
        </div>
        <div className="al-controls">
          <div className="al-pills">
            {pills.map((p) => (
              <button key={p.k}
                className={"al-pill" + (filter === p.k ? " on" : "") + (p.k ? " l" + p.k : "")}
                onClick={() => setFilter(p.k)}>{p.t}</button>
            ))}
          </div>
          <div className="al-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar colonia..." />
          </div>
        </div>
        <div className="al-grid">
          {list.map((c, i) => {
            const b = LV_BADGE[c.level];
            return (
              <div className={"al-card glass " + b.c} key={i}>
                <div className="al-card-top">
                  <div><div className="al-name">{c.name}</div><div className="al-alc">{c.alcaldia}</div></div>
                  <span className={"al-badge " + b.c}>{b.t}</span>
                </div>
                <div className="al-factor">{c.factor}</div>
                <div className="al-foot">
                  <span className="al-time mono">hace {c.min} min</span>
                  <button className="al-link" onClick={() => onNav("simulador")}>Ver en mapa →</button>
                </div>
              </div>
            );
          })}
          {list.length === 0 && <div className="al-empty mono">Sin resultados para "{q}".</div>}
        </div>
      </div>
    </section>
  );
}

/* ===================== TRANSPARENCIA ===================== */
function TranspMetric({ k, v, sub }) {
  return (
    <div className="tm glass">
      <div className="tm-v mono">{v}</div>
      <div className="tm-k">{k}</div>
      {sub && <div className="tm-sub">{sub}</div>}
    </div>
  );
}

function TransparenciaSection() {
  const [open, setOpen] = React.useState(false);
  const confFill = (h) => {
    const c = Gx.CONF_COLORS[h.conf];
    const a = h.edgeFade < 0.5 ? 0.35 : 0.62;
    return c + Math.round(a * 255).toString(16).padStart(2, "0");
  };
  const steps = [
    { n: 1, t: "Imputación espacial",        d: "Se rellenan las colonias sin sensor con un modelo entrenado en topografía, drenaje y eventos históricos." },
    { n: 2, t: "Scoring H3",                  d: "Cada hexágono H3 recibe un puntaje de riesgo físico que se cruza con la vulnerabilidad social del INEGI." },
    { n: 3, t: "Actualización en tiempo real", d: "El radar y las estaciones del SMN recalibran el modelo cada 2 minutos." },
  ];
  return (
    <section className="section sec-transp">
      <div className="sec-inner">
        <div className="sec-head">
          <div className="eyebrow"><span className="tick" style={{ background: "var(--green)" }} />Transparencia del modelo</div>
          <h2 className="sec-title">Qué es dato y qué es estimación</h2>
          <p className="sec-desc">Distinguimos con claridad las mediciones reales de las inferencias del modelo de IA.</p>
        </div>
        <div className="tr-2col">
          <div className="tr-left">
            <div className="tr-map glass">
              <SVGHexMap fillFn={confFill} strokeFn={() => "rgba(255,255,255,0.05)"} />
            </div>
            <div className="tr-conf-legend">
              {Gx.CONF_NAMES.map((n, i) => (
                <div className="cl-row" key={i}><span className="cl-sw" style={{ background: Gx.CONF_COLORS[i] }} />{n}</div>
              ))}
            </div>
            <div className="tr-stats glass">
              <div className="trs"><b className="mono" style={{ color: Gx.CONF_COLORS[0] }}>312</b><span>colonias con datos reales</span></div>
              <div className="trs"><b className="mono" style={{ color: Gx.CONF_COLORS[1] }}>47</b><span>inferidas por IA</span></div>
              <div className="trs"><b className="mono" style={{ color: Gx.CONF_COLORS[2] }}>11</b><span>alta incertidumbre</span></div>
            </div>
          </div>
          <div className="tr-right">
            <div className="tr-metrics">
              <TranspMetric v="0.23"    k="MAE"                   sub="inundaciones / hex / hora" />
              <TranspMetric v="84%"     k="Precisión histórica"   sub="validación 2015–2024" />
              <TranspMetric v="hace 4 min" k="Última actualización" sub="radar + estaciones SMN" />
              <TranspMetric v="5 fuentes" k="Orígenes de datos"   sub="CONAGUA · SMN · CDMX · INEGI · OSM" />
            </div>
            <div className="tr-disclaimer">
              <div className="trd-ic">⚠️</div>
              <div>Este modelo es una herramienta de apoyo. <b>No debe utilizarse como única fuente</b> para decisiones de evacuación sin validación de Protección Civil.</div>
            </div>
            <div className={"tr-acc glass" + (open ? " open" : "")}>
              <div className="tr-acc-head" onClick={() => setOpen(!open)}>
                <span>¿Cómo funciona el modelo de IA?</span>
                <svg className="chev" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div className="tr-acc-body">
                <div className="tr-acc-inner">
                  {steps.map((s) => (
                    <div className="tr-step" key={s.n}>
                      <div className="tr-step-n mono">{s.n}</div>
                      <div><div className="tr-step-t">{s.t}</div><div className="tr-step-d">{s.d}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="tr-foot mono">FloodSense · Prototipo de investigación · 2026</div>
      </div>
    </section>
  );
}

Object.assign(window, { Navbar, HeroSection, AlertasSection, TransparenciaSection, Logo });
