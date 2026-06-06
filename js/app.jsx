// ============================================================
// FloodSense — App root: multi-section layout
// ============================================================
const Ga = window.FloodGeo;

function App() {
  const [section,     setSection]    = React.useState("inicio");

  // sim mode: "manual" = libre (default), "realtime" = bloquea params y usa datos reales
  const [simMode,     setSimMode]    = React.useState("manual");

  // simulation parameters (only active in "manual" mode)
  const [drainage,    setDrainage]   = React.useState("basico");
  const [soilSat,     setSoilSat]    = React.useState("normal");
  const [canalLevel,  setCanalLevel] = React.useState("normal");

  // rain & conditions. Default is a moderate SIMULATION (map alive); EN VIVO switches to real.
  const [rainMmh,     setRainMmh]    = React.useState(35);
  const [isManual,    setIsManual]   = React.useState(false);
  const [condMode,    setCondMode]   = React.useState("real");

  // real spatial rain per zone (teammate JSON or Open-Meteo multi-point)
  const [liveZoneRain, setLiveZoneRain] = React.useState(null);
  const [zoneSrc,      setZoneSrc]      = React.useState("");

  // backend ML externo (AquaInfer · Railway); null = fallback transparente
  const [backendZones, setBackendZones] = React.useState(null);

  // recomendaciones por IA (Groq) — viven en App para persistir entre secciones
  const [aiRecs,       setAiRecs]       = React.useState(null);
  const [aiRecsStatus, setAiRecsStatus] = React.useState("idle"); // idle | loading | ok | fallback

  // animation
  const [hour,        setHour]       = React.useState(0);
  const [scenario,    setScenario]   = React.useState("esperado");
  const [playing,     setPlaying]    = React.useState(false);

  // map selection
  const [selected,    setSelected]   = React.useState(null);

  // live weather (Open-Meteo)
  const [liveWx,      setLiveWx]     = React.useState(null);
  const [wxStatus,    setWxStatus]   = React.useState("loading"); // loading | ok | error

  // mobile simulador bottom-sheet: null (closed) | "clima" | "params"
  const [mobileTab,   setMobileTab]  = React.useState(null);

  // toast
  const [toast,       setToast]      = React.useState(null);

  const playRef = React.useRef(0);
  const lastTs  = React.useRef(0);

  // fetch live data on mount + refresh every 5 min
  React.useEffect(() => {
    let alive = true;
    const load = () => {
      // 1-point detail for the weather widget + 6h forecast
      Ga.fetchLiveWeather()
        .then((w) => { if (alive) { setLiveWx(w); setWxStatus("ok"); } })
        .catch(() => { if (alive) setWxStatus("error"); });
      // spatial rain per zone: prefer teammate JSON, fallback to Open-Meteo multi-point
      Ga.fetchLiveState()
        .then((s) => { if (alive) { setLiveZoneRain(s.rain); setZoneSrc("equipo"); } })
        .catch(() => Ga.fetchZoneRain()
          .then((z) => { if (alive) { setLiveZoneRain(z); setZoneSrc("open-meteo"); } })
          .catch(() => {}));
      // backend ML externo (AquaInfer) — reintenta cada ciclo (reconexión automática)
      Ga.fetchBackendState().then((zones) => {
        if (!alive) return;
        if (zones && Object.keys(zones).length) {
          setBackendZones(zones);
          console.log("✅ Backend AquaInfer conectado:", Object.keys(zones).length, "zonas");
        } else {
          setBackendZones(null);
          console.log("⚠️ Backend no disponible, usando Open-Meteo + modelo simulado");
        }
      });
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // EN VIVO: drive the global rain number from the real spatial average
  React.useEffect(() => {
    if (simMode !== "realtime") return;
    if (liveZoneRain) {
      const cdmx = Ga.ZONES.filter((z) => !z.edo).map((z) => liveZoneRain[z.name] || 0);
      const avg = cdmx.length ? cdmx.reduce((a, b) => a + b, 0) / cdmx.length : 0;
      setRainMmh(Math.round(avg * 10) / 10);
    } else if (liveWx) {
      setRainMmh(Math.round((liveWx.precip || 0) * 10) / 10);
    }
    setIsManual(false);
  }, [simMode, liveZoneRain, liveWx]);

  // build simParams only when in manual mode
  const simParams = simMode === "manual"
    ? { drainage, soilSat, canalLevel }
    : null;

  // spatial rain only feeds the model in EN VIVO (real); manual mode is uniform
  const zoneRain = simMode === "realtime" ? liveZoneRain : null;
  // el backend ML manda solo en EN VIVO; en simulación el usuario explora escenarios libremente
  const effBackend = simMode === "realtime" ? backendZones : null;

  const modelState = React.useMemo(
    () => Ga.computeState(rainMmh, hour, scenario, simParams, zoneRain, effBackend),
    [rainMmh, hour, scenario, simMode, drainage, soilSat, canalLevel, liveZoneRain, backendZones]
  );

  // fuente del RIESGO que se ve en el mapa: backend ML real o modelo simulado
  const dataSource = (simMode === "realtime" && backendZones) ? "backend-ml" : "simulado";

  // REAL state for the Inicio KPIs — always live data, never the simulator's params
  const realRain = React.useMemo(() => {
    if (liveZoneRain) {
      const cdmx = Ga.ZONES.filter((z) => !z.edo).map((z) => liveZoneRain[z.name] || 0);
      return cdmx.length ? Math.round((cdmx.reduce((a, b) => a + b, 0) / cdmx.length) * 10) / 10 : 0;
    }
    return liveWx ? Math.round((liveWx.precip || 0) * 10) / 10 : 0;
  }, [liveZoneRain, liveWx]);

  const realState = React.useMemo(
    () => Ga.computeState(realRain, 1.5, "esperado", null, liveZoneRain),
    [realRain, liveZoneRain]
  );

  // Alertas = riesgo PREVISTO para las próximas horas: usa el pico del pronóstico
  // (o la lluvia simulada si es mayor), no el instantáneo — así son útiles aunque ahora no llueva.
  const forecastPeak = (liveWx && liveWx.forecast && liveWx.forecast.length)
    ? Math.max(0, ...liveWx.forecast.map((f) => f.precip || 0))
    : 0;
  const alertRain = Math.max(rainMmh || 0, forecastPeak);
  const alertState = React.useMemo(
    () => Ga.computeState(alertRain, 3, scenario, simParams, null),
    [alertRain, scenario, simMode, drainage, soilSat, canalLevel]
  );

  // payload enriquecido para el LLM (incluye elevación y susceptibilidad por zona)
  const buildRecsPayload = () => {
    const nivel = (s) => s >= 80 ? 5 : s >= 60 ? 4 : s >= 40 ? 3 : s >= 20 ? 2 : 1;
    const zs = (alertState && alertState.zoneScores) ? alertState.zoneScores : [];
    const zonas = zs.slice(0, 14).map((z) => ({
      zona: z.zone.short,
      alcaldia: z.zone.name,
      nivel_riesgo: nivel(z.score),
      vuln: Math.round(z.zone.vuln * 100) / 100,
      rain_mmh: Math.round(alertRain * 10) / 10,
      elevacion_m: z.zone.elev,
      susceptibilidad_fisica: Math.round(z.zone.sus * 100) / 100,
    }));
    return { contexto: { indice_compuesto: alertState ? alertState.composite : 0, lluvia_prevista_mmh: Math.round(alertRain) }, zonas };
  };

  const fetchRecs = () => {
    setAiRecsStatus("loading");
    fetch("/api/recommendations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRecsPayload()),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d && d.ok && ((d.ciudadanos && d.ciudadanos.length) || (d.autoridades && d.autoridades.length))) {
          setAiRecs(d); setAiRecsStatus("ok");
        } else { setAiRecsStatus("fallback"); }
      })
      .catch(() => setAiRecsStatus("fallback"));
  };

  // genera la primera vez que entras a Alertas; luego persiste (regenera con el botón)
  React.useEffect(() => {
    if (section === "alertas" && aiRecsStatus === "idle") fetchRecs();
  }, [section, aiRecsStatus]);

  // editing rain or any param drops out of EN VIVO into Simulación
  const onSetRain = (v) => { setRainMmh(v); setIsManual(true); setSimMode("manual"); };
  const onSetCond = (m) => { setCondMode(m); };

  // EN VIVO toggle: realtime sigue datos reales y RESETEA los parámetros a su preset
  const onSetSimMode = (m) => {
    setSimMode(m);
    if (m === "realtime") {
      setIsManual(false); setCondMode("real");
      setDrainage("basico"); setSoilSat("normal"); setCanalLevel("normal");
    }
  };

  // switch to manual mode when user edits any param
  const setDrainageM   = (v) => { setDrainage(v);   setSimMode("manual"); };
  const setSoilSatM    = (v) => { setSoilSat(v);    setSimMode("manual"); };
  const setCanalLevelM = (v) => { setCanalLevel(v); setSimMode("manual"); };

  // play animation
  React.useEffect(() => {
    if (!playing) { cancelAnimationFrame(playRef.current); lastTs.current = 0; return; }
    const step = (ts) => {
      if (!lastTs.current) lastTs.current = ts;
      const dt = Math.min(0.05, (ts - lastTs.current) / 1000);
      lastTs.current = ts;
      setHour((h) => { const nh = h + dt * (6 / 9); if (nh >= 6) { setPlaying(false); return 6; } return nh; });
      playRef.current = requestAnimationFrame(step);
    };
    playRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(playRef.current);
  }, [playing]);

  const togglePlay = () => {
    setPlaying((p) => { if (!p && hour >= 5.98) { setHour(0); } lastTs.current = 0; return !p; });
  };

  const onExport = () => {
    setToast({ stage: "gen", msg: "Generando reporte PDF · 3 colonias prioritarias…" });
    setTimeout(() => {
      setToast({ stage: "done", msg: "Reporte listo · FloodSense_CDMX_17h20.pdf" });
      setTimeout(() => setToast(null), 2300);
    }, 1900);
  };

  const onShare = () => {
    try { navigator.clipboard.writeText(window.location.href); } catch (e) { /* noop */ }
    setToast({ stage: "done", msg: "Enlace de la app copiado al portapapeles." });
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="app-root">
      <Navbar active={section} onNav={setSection} onShare={onShare} />

      <div className="content-area">

        {/* ---- INICIO ---- */}
        {section === "inicio" && (
          <HeroSection modelState={modelState} realState={realState} realRain={realRain}
            scenario={scenario} onNav={setSection} liveWx={liveWx} wxStatus={wxStatus} />
        )}

        {/* ---- SIMULADOR ---- */}
        {section === "simulador" && (
          <div className="sec-simulador">
            {/* mobile-only bottom-sheet triggers */}
            <div className="mobile-sim-tabs">
              <button className={mobileTab === "clima" ? "on" : ""}
                onClick={() => setMobileTab(mobileTab === "clima" ? null : "clima")}>
                🌧️ Clima {mobileTab === "clima" ? "▾" : "▴"}
              </button>
              <button className={mobileTab === "params" ? "on" : ""}
                onClick={() => setMobileTab(mobileTab === "params" ? null : "params")}>
                ⚙️ Parámetros {mobileTab === "params" ? "▾" : "▴"}
              </button>
            </div>

            <aside className={"col-left" + (mobileTab !== "clima" ? " mob-hidden" : "")}>
              <LeftPanel rainMmh={rainMmh} condMode={condMode} setCondMode={onSetCond}
                scenario={scenario} hour={hour} liveWx={liveWx} wxStatus={wxStatus}
                dataSource={dataSource} />
            </aside>

            <main className="col-map">
              <LeafletMap modelState={modelState} condMode={condMode}
                selected={selected} onSelect={setSelected} />

              {/* floating EN VIVO / simulación toggle */}
              <SimControl simMode={simMode} setSimMode={onSetSimMode} />

              <TimeSlider hour={hour} setHour={setHour} playing={playing}
                togglePlay={togglePlay} scenario={scenario} setScenario={setScenario} />

              {toast && (
                <div className="toast frost show">
                  {toast.stage === "gen"
                    ? <span className="spin" />
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  <span style={{ color: toast.stage === "done" ? "var(--ink)" : "var(--ink-2)" }}>{toast.msg}</span>
                </div>
              )}
            </main>

            <aside className={"col-right" + (mobileTab !== "params" ? " mob-hidden" : "")}>
              <RightPanel
                rainMmh={rainMmh} setRain={onSetRain} isManual={isManual}
                condMode={condMode} modelState={modelState}
                playing={playing} onSimulate={togglePlay}
                simMode={simMode} zoneSrc={zoneSrc}
                drainage={drainage}    setDrainage={setDrainageM}
                soilSat={soilSat}      setSoilSat={setSoilSatM}
                canalLevel={canalLevel} setCanalLevel={setCanalLevelM}
              />
            </aside>
          </div>
        )}

        {/* ---- ALERTAS ---- */}
        {section === "alertas" && (
          <AlertasSection onNav={setSection} modelState={alertState}
            ai={aiRecs} aiStatus={aiRecsStatus} onRegen={fetchRecs} />
        )}

        {/* ---- TRANSPARENCIA ---- */}
        {section === "transparencia" && (
          <TransparenciaSection />
        )}
      </div>

      {/* global toast for non-simulador sections */}
      {section !== "simulador" && toast && (
        <div className="toast frost show" style={{ bottom: 32 }}>
          {toast.stage === "gen"
            ? <span className="spin" />
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          <span style={{ color: toast.stage === "done" ? "var(--ink)" : "var(--ink-2)" }}>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
