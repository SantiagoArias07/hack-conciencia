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

const NAV_ICONS = {
  inicio:        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  simulador:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3-6-3zM9 3v15M15 6v15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  alertas:       <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  transparencia: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

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
    <React.Fragment>
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
          <div className="live-chip"><span className="live" /><span className="mono">EN VIVO</span><span className="mono nclk">{clock}</span></div>
          <button className="btn-share" onClick={onShare}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v13M7 8l5-5 5 5" stroke="#021016" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Compartir app
          </button>
        </div>
      </nav>

      {/* mobile bottom navigation */}
      <nav className="mobile-bottomnav">
        {NAV_ITEMS.map((n) => (
          <button key={n.id} className={"mbn-item" + (active === n.id ? " on" : "")} onClick={() => onNav(n.id)}>
            {NAV_ICONS[n.id]}
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </React.Fragment>
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

function HeroSection({ modelState, realState, realRain, scenario, onNav, liveWx, wxStatus }) {
  const [secs, setSecs] = React.useState(2 * 3600 + 14 * 60);
  React.useEffect(() => {
    const id = setInterval(() => setSecs((s) => (s <= 0 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const vh = Math.floor(secs / 3600);
  const vm = Math.floor((secs % 3600) / 60);
  const vs = secs % 60;

  // forecast strip is REAL (Open-Meteo), no scenario multiplier
  const liveFc = liveWx && liveWx.forecast && liveWx.forecast.length >= 6
    ? liveWx.forecast.map((f) => f.precip)
    : null;
  const fcBase = liveFc || [41, 47, 38, 28, 18, 11];
  const fcData = [
    { t: "Ahora", v: Math.round(realRain) },
    ...fcBase.map((v, i) => ({ t: "+" + (i + 1) + "h", v: Math.round(v) })),
  ];
  const colOf  = (v) => { const l = v>=45?3:v>=25?2:v>=8?1:0; return l===3?"#ef4444":l===2?"#f97316":l===1?"#22d3ee":"#2d8a6e"; };
  const icoOf  = (v) => v >= 45 ? "⛈" : v >= 25 ? "🌧" : v >= 8 ? "🌦" : "🌤";

  const feed = [
    { c: "red",   emoji: "🔴", name: "Iztapalapa", lvl: "Alto",  ago: "hace 3 min",  desc: "Encharcamiento severo en Eje 8 Sur" },
    { c: "amber", emoji: "🟡", name: "Xochimilco", lvl: "Medio", ago: "hace 7 min",  desc: "Canales con nivel elevado" },
    { c: "blue",  emoji: "🔵", name: "Coyoacán",   lvl: "Bajo",  ago: "hace 12 min", desc: "Riesgo bajo, monitoreo preventivo" },
  ];
  const badgeCol = { red:"var(--red)", amber:"var(--orange)", blue:"var(--cyan)" };
  const badgeBg  = { red:"rgba(239,68,68,.14)", amber:"rgba(249,115,22,.14)", blue:"rgba(0,212,255,.12)" };

  return (
    <section className="section sec-inicio">
      <div className="hero-inner">
        <div className="hero-head">
          <div className="hero-eyebrow"><span className="live" /> Monitoreo en tiempo real · Ciudad de México</div>
          <h1 className="hero-title">Anticipa la inundación,<br /><span>antes de la primera gota crítica.</span></h1>
          <p className="hero-sub">Inteligencia hidrológica que combina radar, topografía y drenaje para estimar el riesgo de encharcamiento por colonia — incluso donde no hay sensores.</p>
        </div>

        <div className="kpi-row">
          <KPICard label="Lluvia actual"           value={Math.round(realRain)}                 unit=" mm/h" accent="var(--cyan)"   sub="Intensidad media en la cuenca" />
          <KPICard label="Colonias en riesgo alto"  value={Math.max(realState.altoColonias, 0)}  unit=""     accent="var(--red)"    sub="Requieren atención inmediata" />
          <KPICard label="Datos inferidos por IA"   value="47"                                   unit=""     accent="var(--cyan)"   sub="Colonias sin sensor, modeladas" />
          <KPICard label="Ventana de acción"         value={`${vh}h ${window.pad2(vm)}m`}         unit=""     accent="#f97316"       sub={<span className="mono" style={{fontSize:10}}>{`restan ${window.pad2(vm)}:${window.pad2(vs)}`}</span>} />
        </div>

        <div className="fc-strip glass">
          <div className="fc-strip-h" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span className="eyebrow"><span className="tick" style={{background:"var(--cyan)"}}/>Pronóstico de intensidad · próximas 6 horas</span>
            {liveFc && <span className="wx-live-badge"><span className="wx-live-dot" style={{background:"var(--green)"}}/>EN VIVO · Open-Meteo</span>}
          </div>
          <div className="fc-cols">
            {fcData.map((f, i) => (
              <div className={"fc-col" + (i === 0 ? " now" : "")} key={i}>
                <div className="fc-t">{f.t}</div>
                <div className="fc-ico">{icoOf(f.v)}</div>
                <div className="fc-v mono" style={{ color: colOf(f.v) }}>{f.v}<small>mm</small></div>
                <div className="fc-dot" style={{ background: colOf(f.v), boxShadow: `0 0 8px ${colOf(f.v)}` }} />
              </div>
            ))}
          </div>
        </div>

        <div className="hero-2col">
          <div className="hero-map glass" onClick={() => onNav("simulador")}>
            <div className="hero-map-tag">
              <span className="mono" style={{color:"var(--ink-3)",fontSize:9,letterSpacing:".14em"}}>MAPA DE RIESGO H3 · CDMX</span>
              <span className="hero-map-cta">Abrir simulador →</span>
            </div>
            <div className="hero-map-svg">
              <SVGHexMap
                fillFn={(h, i) => Gx.hexFill(modelState.risks[i])}
                strokeFn={(h, i) => Gx.riskLevel(modelState.risks[i]) >= 2 ? "rgba(255,255,255,0.10)" : "rgba(120,160,200,0.04)"}
                glowAlto={(h, i) => Gx.riskLevel(modelState.risks[i])}
              />
            </div>
          </div>

          <div className="hero-feed glass">
            <div className="feed-h" style={{paddingBottom:10,borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
              <div className="eyebrow"><span className="tick" style={{background:"var(--red)"}}/>Últimas alertas</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>
              {feed.map((a, i) => (
                <div className={"feed-card " + a.c} key={i} onClick={() => onNav("alertas")}
                  style={{borderRadius:12,padding:"11px 14px"}}>
                  <div className="feed-ico">{a.emoji}</div>
                  <div className="feed-body">
                    <div className="feed-name">{a.name}
                      <span className="feed-badge" style={{marginLeft:8,background:badgeBg[a.c],color:badgeCol[a.c]}}>{a.lvl}</span>
                    </div>
                    <div className="feed-desc">{a.desc}</div>
                    <div className="feed-ago mono" style={{marginTop:3}}>{a.ago}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="feed-all" style={{marginTop:10}} onClick={() => onNav("alertas")}>Ver todas las alertas →</button>
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

// Generate AI authority recommendations from live model state
function generateAuthorityRecs(modelState) {
  if (!modelState || !modelState.zoneScores) return [];
  const comp = modelState.composite;
  const top  = modelState.zoneScores.slice(0, 6);
  const recs = [];
  const vent = (s) => s >= 80 ? "Inmediato" : s >= 66 ? "2 horas" : s >= 50 ? "3 horas" : "4+ horas";
  const urgency = (s) => s >= 72 ? 3 : s >= 50 ? 2 : 1;

  // Protocol activation
  if (comp >= 72) {
    recs.push({ prio: 3, category: "PROTOCOLO", icon: "🚨",
      title: "Activar Protocolo de Emergencia hidráulica",
      zone: "CDMX",
      detail: `Índice compuesto ${comp}/100. Coordinar con Protección Civil y SACMEX. Habilitar centros de operaciones de emergencia en alcaldías prioritarias.`,
      window: "Inmediato" });
  } else if (comp >= 50) {
    recs.push({ prio: 2, category: "ALERTA", icon: "⚠️",
      title: "Elevar a Alerta Amarilla hidráulica",
      zone: "CDMX",
      detail: `Índice compuesto ${comp}/100. Reforzar monitoreo y tener equipos en espera. Verificar disponibilidad de bombas de emergencia.`,
      window: vent(comp) });
  }

  // Top risk zone: pump deployment
  if (top[0] && top[0].score >= 55) {
    recs.push({ prio: urgency(top[0].score), category: "DESPLIEGUE", icon: "🚒",
      title: `Preposicionar equipo de bombeo`,
      zone: top[0].zone.short,
      detail: `Riesgo ${top[0].score}/100. Mover al menos 2 unidades de bombeo preventivas al sector. Identificar puntos críticos de acumulación de agua.`,
      window: vent(top[0].score) });
  }

  // Canal/lake zones: monitoring
  const canalZone = top.find(z => ["Xochimilco","Tláhuac"].includes(z.zone.name) && z.score >= 40);
  if (canalZone) {
    recs.push({ prio: urgency(canalZone.score), category: "CANALES", icon: "🌊",
      title: `Controlar compuertas y canales`,
      zone: canalZone.zone.short,
      detail: `Nivel en cauces elevado previsto. Coordinar con SACMEX apertura/cierre de compuertas del sistema de canales. Monitorear cada 30 min.`,
      window: vent(canalZone.score) });
  }

  // 2nd zone: sewer inspection
  if (top[1] && top[1].score >= 45) {
    recs.push({ prio: urgency(top[1].score), category: "INFRAESTRUCTURA", icon: "🔧",
      title: `Inspeccionar cárcamos y drenaje`,
      zone: top[1].zone.short,
      detail: `Riesgo ${top[1].score}/100. Verificar operación de cárcamos y estaciones de bombeo. Despejar rejillas en zonas de encharcamiento recurrente.`,
      window: vent(top[1].score) });
  }

  // 3rd zone: early warning
  if (top[2] && top[2].score >= 38) {
    recs.push({ prio: 1, category: "ALERTAMIENTO", icon: "📢",
      title: `Emitir alerta temprana ciudadana`,
      zone: top[2].zone.short,
      detail: `Activar SMS y redes sociales con aviso preventivo. Recomendar evitar zonas de riesgo. Coordinar con alcaldía para difusión local.`,
      window: vent(top[2].score) });
  }

  // Shelter readiness
  if (comp >= 60) {
    recs.push({ prio: 2, category: "ALBERGUES", icon: "🏫",
      title: "Preparar albergues temporales",
      zone: "Iztapalapa · Tláhuac",
      detail: "Activar protocolo de albergues en escuelas y centros comunitarios de colonias con riesgo alto. Notificar a Cruz Roja y DIF.",
      window: vent(comp - 10) });
  }

  // Always: forecast update
  recs.push({ prio: 1, category: "MONITOREO", icon: "📡",
    title: "Actualizar pronóstico hidráulico",
    zone: "SMN · CONAGUA",
    detail: "Solicitar actualización de precipitación al Servicio Meteorológico Nacional. Recalibrar modelo con datos de radar en tiempo real.",
    window: "Continuo" });

  return recs.sort((a, b) => b.prio - a.prio);
}

const LV_BADGE = { 3: { t: "Alto", c: "red" }, 2: { t: "Medio", c: "amber" }, 1: { t: "Bajo", c: "blue" } };
const PRIO_COLOR = { 3: "var(--red)", 2: "var(--orange)", 1: "var(--blue)" };
const PRIO_BG    = { 3: "rgba(239,68,68,.12)", 2: "rgba(249,115,22,.12)", 1: "rgba(59,130,246,.12)" };

const CAT_ICON = { PROTOCOLO:"🚨", EMERGENCIA:"🚨", ALERTA:"⚠️", DESPLIEGUE:"🚒", BOMBEO:"🚒", CANALES:"🌊", COMPUERTAS:"🌊", INFRAESTRUCTURA:"🔧", DRENAJE:"🔧", ALERTAMIENTO:"📢", AVISO:"📢", ALBERGUES:"🏫", EVACUACIÓN:"🚨", MONITOREO:"📡" };
const catIcon = (c) => CAT_ICON[String(c || "").toUpperCase()] || "✨";
const nivelFromScore = (s) => s >= 80 ? 5 : s >= 60 ? 4 : s >= 40 ? 3 : s >= 20 ? 2 : 1;

// ai/aiStatus/onRegen vienen del componente App (persisten entre secciones)
function AlertasSection({ onNav, modelState, ai, aiStatus, onRegen }) {
  const [tab, setTab] = React.useState("ciudadanos");
  const [filter, setFilter] = React.useState(0);
  const [q, setQ] = React.useState("");

  const authorityRecs = React.useMemo(
    () => generateAuthorityRecs(modelState),
    [modelState && modelState.composite]
  );

  // tarjetas de autoridades redactadas por IA (null si no hay)
  const aiAuthCards = (ai && ai.autoridades && ai.autoridades.length)
    ? ai.autoridades.map((r) => ({
        prio: Math.max(1, Math.min(3, r.prioridad || 1)),
        category: r.categoria || "ACCIÓN",
        icon: catIcon(r.categoria),
        title: r.titulo || "",
        zone: r.zona || "—",
        detail: r.detalle || "",
        window: r.ventana || "—",
      }))
    : null;
  const aiCitizens = (ai && ai.ciudadanos && ai.ciudadanos.length) ? ai.ciudadanos : null;

  // qué mostrar en autoridades según el estado: ok→IA, fallback→plantillas, loading→nada
  const authCards = aiStatus === "ok" ? aiAuthCards : (aiStatus === "fallback" ? authorityRecs : null);
  const loading = aiStatus === "loading" || aiStatus === "idle";

  const list = Gx.COLONIAS.filter((c) =>
    (filter === 0 || c.level === filter) &&
    (q === "" || (c.name + " " + c.alcaldia).toLowerCase().includes(q.toLowerCase()))
  );
  const pills = [{ k: 0, t: "Todos" }, { k: 3, t: "Alto" }, { k: 2, t: "Medio" }, { k: 1, t: "Bajo" }];

  const highCount = (authCards || []).filter(r => r.prio >= 2).length;

  const loader = (
    <div className="ai-loading">
      <span className="ai-spin-lg" />
      <div className="ai-loading-t">Analizando el mapa y redactando recomendaciones…</div>
      <div className="ai-loading-s mono">IA · Groq · Llama 3.3</div>
    </div>
  );
  const emptyState = (
    <div className="ai-empty mono">Sin alertas activas en este momento.</div>
  );

  const aiBar = (
    <div className="ai-statusbar">
      <span className={"ai-chip" + (aiStatus === "ok" ? " on" : "")}>
        {loading
          ? <React.Fragment><span className="ai-spin" /> Redactando con IA…</React.Fragment>
          : aiStatus === "ok"
          ? <React.Fragment>✨ Redactado por IA · Groq · <b>{ai && ai.model ? ai.model.split("-").slice(0,2).join(" ") : "llama"}</b></React.Fragment>
          : <React.Fragment>📋 Plantilla por reglas <span className="ai-hint">· activa la IA con GROQ_API_KEY</span></React.Fragment>}
      </span>
      <button className="ai-regen" onClick={onRegen} disabled={aiStatus === "loading"}>↻ Regenerar</button>
    </div>
  );

  return (
    <section className="section sec-alertas">
      <div className="sec-inner">
        <div className="sec-head">
          <div className="eyebrow"><span className="tick" style={{background:"var(--red)"}}/>Alertas activas</div>
          <h2 className="sec-title">Centro de alertas</h2>
          <p className="sec-desc">Información actualizada cada 2 minutos para ciudadanos y autoridades de la Zona Metropolitana.</p>
        </div>

        {/* main tab toggle */}
        <div className="al-tab-bar">
          <button className={"al-tab-btn" + (tab === "ciudadanos" ? " on" : "")} onClick={() => setTab("ciudadanos")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/></svg>
            Ciudadanía
          </button>
          <button className={"al-tab-btn" + (tab === "autoridades" ? " on" : "")} onClick={() => setTab("autoridades")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Autoridades
            {highCount > 0 && <span className="badge-cnt" style={{marginLeft:6}}>{highCount}</span>}
          </button>
        </div>

        {aiBar}

        {/* ---- CIUDADANÍA tab ---- */}
        {tab === "ciudadanos" && (
          <React.Fragment>
            <div className="al-intro-banner glass" style={{marginBottom:20,padding:"14px 18px",borderLeft:"4px solid var(--cyan)",borderRadius:"0 14px 14px 0"}}>
              <div style={{fontSize:12.5,fontWeight:600,color:"var(--ink)",marginBottom:4}}>Qué hacer si estás en una zona de riesgo</div>
              <div style={{fontSize:12,color:"var(--ink-3)",lineHeight:1.55}}>Evita circular por pasos a desnivel y avenidas inundables. No cruces corrientes de agua en movimiento. Sigue las indicaciones de Protección Civil.</div>
            </div>

            {loading ? loader
             : aiStatus === "ok" ? (
              aiCitizens ? (
                <div className="ai-citizen-wrap">
                  {aiCitizens.map((c, i) => {
                  const col = c.nivel >= 4 ? "var(--red)" : c.nivel >= 3 ? "var(--orange)" : "var(--cyan)";
                  const bg  = c.nivel >= 4 ? "rgba(239,68,68,.14)" : c.nivel >= 3 ? "rgba(249,115,22,.14)" : "rgba(0,212,255,.12)";
                  const nlabel = c.nivel >= 4 ? "Alto" : c.nivel >= 3 ? "Medio" : "Bajo";
                  const emoji = c.nivel >= 4 ? "🔴" : c.nivel >= 3 ? "🟠" : "🔵";
                  return (
                    <div className="ai-citizen-card glass" key={i} style={{ borderLeft: `4px solid ${col}` }}>
                      <span className="ai-cc-emoji">{emoji}</span>
                      <div style={{ minWidth: 0 }}>
                        <div className="ai-cc-zone">{c.zona}<span className="ai-cc-tag" style={{ color: col, background: bg }}>{nlabel}</span></div>
                        {c.titulo && <div className="ai-cc-title">{c.titulo}</div>}
                        <div className="ai-cc-msg">{c.mensaje}</div>
                        <button className="al-link" style={{ marginTop: 8 }} onClick={() => onNav("simulador")}>Ver en mapa →</button>
                      </div>
                    </div>
                  );
                })}
                </div>
              ) : emptyState
             ) : (
              /* sin IA → plantillas por colonia con filtros */
              <React.Fragment>
                <div className="al-controls">
                  <div className="al-pills">
                    {pills.map((p) => (
                      <button key={p.k}
                        className={"al-pill" + (filter === p.k ? " on" : "") + (p.k ? " l" + p.k : "")}
                        onClick={() => setFilter(p.k)}>{p.t}</button>
                    ))}
                  </div>
                  <div className="al-search">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
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
              </React.Fragment>
            )}
          </React.Fragment>
        )}

        {/* ---- AUTORIDADES tab ---- */}
        {tab === "autoridades" && (
          <React.Fragment>
            <div className="al-intro-banner glass" style={{marginBottom:24,padding:"14px 18px",borderLeft:"4px solid var(--orange)",borderRadius:"0 14px 14px 0"}}>
              <div style={{fontSize:12.5,fontWeight:600,color:"var(--ink)",marginBottom:4}}>{(aiStatus === "ok" && ai.autoridades && ai.autoridades.length) ? "Recomendaciones redactadas por IA (Groq)" : "Recomendaciones por reglas"} · basadas en el modelo hidrológico actual</div>
              <div style={{fontSize:12,color:"var(--ink-3)",lineHeight:1.55}}>Acciones preventivas derivadas del análisis del riesgo compuesto ({modelState ? modelState.composite : "—"}/100). Ordene por ventana de acción para priorizar.</div>
            </div>

            {loading ? loader
             : (authCards && authCards.length) ? (
            <div className="auth-recs">
              {authCards.map((rec, i) => (
                <div className="auth-rec glass" key={i} style={{borderLeft:`4px solid ${PRIO_COLOR[rec.prio]}`}}>
                  <div className="auth-rec-head">
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span className="auth-rec-icon">{rec.icon}</span>
                      <div>
                        <div className="auth-rec-cat" style={{color:PRIO_COLOR[rec.prio],background:PRIO_BG[rec.prio]}}>{rec.category}</div>
                        <div className="auth-rec-title">{rec.title}</div>
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div className="auth-rec-zone mono">{rec.zone}</div>
                      <div className="auth-rec-window" style={{color:rec.window==="Inmediato"?"var(--red)":rec.window==="Continuo"?"var(--green)":"var(--amber)"}}>
                        {rec.window === "Continuo" ? "🔄" : "⏱"} {rec.window}
                      </div>
                    </div>
                  </div>
                  <div className="auth-rec-detail">{rec.detail}</div>
                  <div className="auth-rec-footer">
                    <span className="auth-prio-badge" style={{color:PRIO_COLOR[rec.prio],background:PRIO_BG[rec.prio]}}>
                      {rec.prio === 3 ? "Prioridad Alta" : rec.prio === 2 ? "Prioridad Media" : "Monitoreo"}
                    </span>
                    <button className="al-link" onClick={() => onNav("simulador")}>Ver en mapa →</button>
                  </div>
                </div>
              ))}
            </div>
             ) : emptyState}

            <div className="auth-disclaimer glass" style={{marginTop:24}}>
              <span style={{fontSize:16}}>⚠️</span>
              <span style={{fontSize:12,color:"var(--ink-3)",lineHeight:1.55}}>
                Estas recomendaciones son generadas automáticamente por el modelo de IA y deben ser validadas por personal de <b style={{color:"var(--ink)"}}>Protección Civil</b> antes de ejecutarse.
              </span>
            </div>
          </React.Fragment>
        )}
      </div>
    </section>
  );
}

/* ===================== TRANSPARENCIA ===================== */
function TranspMetric({ k, v, sub, accent, pulse }) {
  return (
    <div className="tm glass">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="tm-v mono" style={accent ? { color: accent } : {}}>{v}</div>
        {pulse && <span style={{width:8,height:8,borderRadius:"50%",background:"var(--green)",boxShadow:"0 0 8px var(--green)",animation:"blink 1.6s ease-in-out infinite",display:"inline-block"}} />}
      </div>
      <div className="tm-k">{k}</div>
      {sub && <div className="tm-sub">{sub}</div>}
    </div>
  );
}

function TransparenciaSection() {
  const [open, setOpen] = React.useState(false);
  const confFill = (h) => {
    const colors = ["#22c55e","#eab308","#f97316"];
    const c = colors[h.conf];
    const a = h.edgeFade < 0.5 ? 0.35 : 0.62;
    return c + Math.round(a * 255).toString(16).padStart(2,"0");
  };
  const confLegend = [
    { color: "#22c55e", label: "Datos reales (~70%)" },
    { color: "#eab308", label: "Datos inferidos por IA (~20%)" },
    { color: "#f97316", label: "Alta incertidumbre (~10%)" },
  ];
  const steps = [
    { n:1, t:"Imputación espacial",        d:"Colonias sin sensor se rellenan con un modelo entrenado en topografía, drenaje y eventos históricos." },
    { n:2, t:"Scoring H3",                  d:"Cada hexágono recibe un puntaje de riesgo físico cruzado con la vulnerabilidad social del INEGI." },
    { n:3, t:"Actualización en tiempo real", d:"El radar y las estaciones del SMN recalibran el modelo cada 2 minutos." },
  ];
  return (
    <section className="section sec-transp">
      <div className="sec-inner">
        <div className="sec-head">
          <div className="eyebrow"><span className="tick" style={{background:"var(--green)"}}/>Transparencia del modelo</div>
          <h2 className="sec-title">Qué es dato y qué es estimación</h2>
          <p className="sec-desc">Distinguimos con claridad las mediciones reales de las inferencias del modelo de IA.</p>
        </div>
        <div className="tr-2col">
          <div className="tr-left">
            <div style={{fontWeight:600,fontSize:13,marginBottom:12,color:"var(--ink-2)"}}>Cobertura del modelo</div>
            <div className="tr-map glass"><SVGHexMap fillFn={confFill} strokeFn={() => "rgba(255,255,255,0.04)"} /></div>
            <div className="tr-conf-legend">
              {confLegend.map((l, i) => (
                <div className="cl-row" key={i}><span className="cl-sw" style={{background:l.color}} />{l.label}</div>
              ))}
            </div>
            <div className="tr-stats glass">
              <div className="trs"><b className="mono" style={{color:"#22c55e"}}>312</b><span>colonias con datos reales</span></div>
              <div className="trs"><b className="mono" style={{color:"#eab308"}}>47</b><span>inferidas por IA</span></div>
              <div className="trs"><b className="mono" style={{color:"#f97316"}}>11</b><span>alta incertidumbre</span></div>
            </div>
          </div>
          <div className="tr-right">
            <div className="tr-metrics">
              <TranspMetric v="0.23"      k="MAE del modelo"        sub="inundaciones / hex / hora" />
              <TranspMetric v="84%"       k="Precisión histórica"   sub="validación 2015–2024" accent="var(--cyan)" />
              <TranspMetric v="hace 4 min" k="Última actualización" sub="radar + estaciones SMN" pulse />
              <TranspMetric v="5"          k="Fuentes de datos"     sub="CONAGUA · SMN · CDMX · INEGI · OSM" />
            </div>
            <div className="tr-disclaimer">
              <div className="trd-ic">⚠️</div>
              <div>
                <b>Este modelo es una herramienta de apoyo.</b>
                <div style={{color:"var(--ink-3)",marginTop:4,fontSize:12,lineHeight:1.55}}>No debe utilizarse como única fuente para decisiones de evacuación sin validación de Protección Civil.</div>
              </div>
            </div>
            <div className={"tr-acc glass" + (open ? " open" : "")}>
              <div className="tr-acc-head" onClick={() => setOpen(!open)}>
                <span>¿Cómo funciona el modelo de IA?</span>
                <svg className="chev" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="tr-acc-body">
                <div className="tr-acc-inner" style={{paddingTop:16}}>
                  <div className="tr-steps-row">
                    {steps.map((s, i) => (
                      <React.Fragment key={s.n}>
                        <div className="tr-step-card">
                          <div className="tr-step-num mono">{s.n}</div>
                          <div className="tr-step-t">{s.t}</div>
                          <div className="tr-step-d">{s.d}</div>
                        </div>
                        {i < steps.length - 1 && (
                          <svg className="tr-step-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
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
