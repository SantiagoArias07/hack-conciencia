// ============================================================
// FloodSense — App root: multi-section layout
// ============================================================
const Ga = window.FloodGeo;

function App() {
  const [section,   setSection]   = React.useState("inicio");
  const [rainMmh,   setRainMmh]   = React.useState(34);
  const [isManual,  setIsManual]  = React.useState(false);
  const [hour,      setHour]      = React.useState(0);
  const [scenario,  setScenario]  = React.useState("esperado");
  const [condMode,  setCondMode]  = React.useState("real");
  const [selected,  setSelected]  = React.useState(null);
  const [playing,   setPlaying]   = React.useState(false);
  const [toast,     setToast]     = React.useState(null);
  const playRef  = React.useRef(0);
  const lastTs   = React.useRef(0);

  const modelState = React.useMemo(
    () => Ga.computeState(rainMmh, hour, scenario),
    [rainMmh, hour, scenario]
  );

  const onSetRain = (v) => { setRainMmh(v); setIsManual(true); };
  const onSetCond = (m) => { setCondMode(m); setIsManual(false); setRainMmh(m === "hist" ? 12 : 34); };

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

  const showToast = (msg, stage) => {
    setToast({ stage, msg });
    setTimeout(() => setToast(null), stage === "gen" ? 1900 : 2500);
  };

  const onExport = () => {
    setToast({ stage: "gen", msg: "Generando reporte PDF · 3 colonias prioritarias…" });
    setTimeout(() => { setToast({ stage: "done", msg: "Reporte listo · FloodSense_CDMX_17h20.pdf" }); setTimeout(() => setToast(null), 2300); }, 1900);
  };

  const onShare = () => {
    setToast({ stage: "done", msg: "Enlace de alerta copiado al portapapeles." });
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="app-root">
      <Navbar active={section} onNav={setSection} onShare={onShare} />

      <div className="content-area">
        {section === "inicio" && (
          <HeroSection modelState={modelState} rainMmh={rainMmh} scenario={scenario} onNav={setSection} />
        )}

        {section === "simulador" && (
          <div className="sec-simulador">
            <aside className="col-left">
              <LeftPanel rainMmh={rainMmh} condMode={condMode} setCondMode={onSetCond} scenario={scenario} hour={hour} />
            </aside>
            <main className="col-map">
              <LeafletMap modelState={modelState} condMode={condMode} selected={selected} onSelect={setSelected} />
              <TimeSlider hour={hour} setHour={setHour} playing={playing} togglePlay={togglePlay} scenario={scenario} setScenario={setScenario} />
              {toast && (
                <div className="toast frost show">
                  {toast.stage === "gen"
                    ? <span className="spin" />
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  <span style={{ color: toast.stage === "done" ? "var(--ink)" : "var(--ink-2)" }}>{toast.msg}</span>
                </div>
              )}
            </main>
            <aside className="col-right">
              <RightPanel rainMmh={rainMmh} setRain={onSetRain} isManual={isManual} condMode={condMode} modelState={modelState} onExport={onExport} />
            </aside>
          </div>
        )}

        {section === "alertas" && (
          <AlertasSection onNav={setSection} />
        )}

        {section === "transparencia" && (
          <TransparenciaSection />
        )}
      </div>

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
