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

  // rain & conditions
  const [rainMmh,     setRainMmh]    = React.useState(34);
  const [isManual,    setIsManual]   = React.useState(false);
  const [condMode,    setCondMode]   = React.useState("real");

  // animation
  const [hour,        setHour]       = React.useState(0);
  const [scenario,    setScenario]   = React.useState("esperado");
  const [playing,     setPlaying]    = React.useState(false);

  // map selection
  const [selected,    setSelected]   = React.useState(null);

  // live weather (Open-Meteo)
  const [liveWx,      setLiveWx]     = React.useState(null);
  const [wxStatus,    setWxStatus]   = React.useState("loading"); // loading | ok | error

  // mobile simulador tab: "clima" | "params"
  const [mobileTab,   setMobileTab]  = React.useState("params");

  // toast
  const [toast,       setToast]      = React.useState(null);

  const playRef = React.useRef(0);
  const lastTs  = React.useRef(0);

  // fetch live weather on mount + refresh every 5 min
  React.useEffect(() => {
    let alive = true;
    const load = () => {
      Ga.fetchLiveWeather()
        .then((w) => { if (alive) { setLiveWx(w); setWxStatus("ok"); } })
        .catch(() => { if (alive) setWxStatus("error"); });
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // in EN VIVO (realtime) mode, sync rain to live precipitation
  React.useEffect(() => {
    if (simMode === "realtime" && condMode === "real" && liveWx) {
      setRainMmh(Math.round((liveWx.precip || 0) * 10) / 10);
      setIsManual(false);
    }
  }, [simMode, condMode, liveWx]);

  // build simParams only when in manual mode
  const simParams = simMode === "manual"
    ? { drainage, soilSat, canalLevel }
    : null;

  const modelState = React.useMemo(
    () => Ga.computeState(rainMmh, hour, scenario, simParams),
    [rainMmh, hour, scenario, simMode, drainage, soilSat, canalLevel]
  );

  const onSetRain = (v) => { setRainMmh(v); setIsManual(true); };
  const onSetCond = (m) => { setCondMode(m); setIsManual(false); setRainMmh(m === "hist" ? 12 : 34); };

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
    setToast({ stage: "done", msg: "Enlace de alerta copiado al portapapeles." });
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="app-root">
      <Navbar active={section} onNav={setSection} onShare={onShare} />

      <div className="content-area">

        {/* ---- INICIO ---- */}
        {section === "inicio" && (
          <HeroSection modelState={modelState} rainMmh={rainMmh} scenario={scenario}
            onNav={setSection} liveWx={liveWx} wxStatus={wxStatus} />
        )}

        {/* ---- SIMULADOR ---- */}
        {section === "simulador" && (
          <div className="sec-simulador">
            {/* mobile-only tab switcher */}
            <div className="mobile-sim-tabs">
              <button className={mobileTab === "clima" ? "on" : ""} onClick={() => setMobileTab("clima")}>
                🌧️ Clima
              </button>
              <button className={mobileTab === "params" ? "on" : ""} onClick={() => setMobileTab("params")}>
                ⚙️ Parámetros
              </button>
            </div>

            <aside className={"col-left" + (mobileTab !== "clima" ? " mob-hidden" : "")}>
              <LeftPanel rainMmh={rainMmh} condMode={condMode} setCondMode={onSetCond}
                scenario={scenario} hour={hour} liveWx={liveWx} wxStatus={wxStatus} />
            </aside>

            <main className="col-map">
              <LeafletMap modelState={modelState} condMode={condMode}
                selected={selected} onSelect={setSelected} />

              {/* floating EN VIVO / simulación toggle */}
              <SimControl simMode={simMode} setSimMode={setSimMode} />

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
                simMode={simMode}
                drainage={drainage}    setDrainage={setDrainageM}
                soilSat={soilSat}      setSoilSat={setSoilSatM}
                canalLevel={canalLevel} setCanalLevel={setCanalLevelM}
              />
            </aside>
          </div>
        )}

        {/* ---- ALERTAS ---- */}
        {section === "alertas" && (
          <AlertasSection onNav={setSection} modelState={modelState} simParams={simParams} />
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
