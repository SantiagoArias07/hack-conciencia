// ============================================================
// FloodSense — Left panel, Right panel (params), Time slider, SimControl
// ============================================================
const Gp = window.FloodGeo;

function pad2(n) { return n < 10 ? "0" + n : "" + n; }
window.pad2 = pad2;

function polar(cx, cy, r, deg) {
  const a = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arcPath(cx, cy, r, startDeg, endDeg) {
  const s = polar(cx, cy, r, endDeg);
  const e = polar(cx, cy, r, startDeg);
  const large = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

/* ===================== LEFT PANEL ===================== */
function LeftPanel({ rainMmh, condMode, setCondMode, scenario, hour, liveWx, wxStatus }) {
  const live = condMode === "real" && liveWx;
  const wx = condMode === "hist"
    ? { temp: 21, feels: 20, hum: 64, wind: 9,  dir: "",   cond: "Parcialmente nublado", sub: "Promedio histórico · junio", pres: 1018 }
    : live
    ? { temp: liveWx.temp, feels: liveWx.feels, hum: liveWx.humidity, wind: liveWx.wind, dir: "",
        cond: liveWx.cond, sub: "Datos en vivo · Open-Meteo", pres: liveWx.pressure }
    : { temp: 18, feels: 16, hum: 82, wind: 14, dir: "NE", cond: "Lluvia moderada",       sub: "Sensación 16° · presión 1014 hPa", pres: 1014 };

  const fillPct = Math.min(100, rainMmh);
  const rainTag = rainMmh >= 50
    ? { t: "TORRENCIAL", c: "var(--red)",    bg: "rgba(239,68,68,.14)" }
    : rainMmh >= 25
    ? { t: "FUERTE",     c: "var(--orange)", bg: "rgba(249,115,22,.14)" }
    : rainMmh >= 7.5
    ? { t: "MODERADA",   c: "var(--cyan)",   bg: "rgba(0,212,255,.12)" }
    : { t: "LIGERA",     c: "var(--ink-2)",  bg: "rgba(255,255,255,.06)" };

  const sm = Gp.SCEN[scenario].mult;
  const liveFc = live && liveWx.forecast && liveWx.forecast.length >= 6
    ? liveWx.forecast.map((f) => f.precip)
    : null;
  const baseFc = liveFc || (condMode === "hist" ? [10, 13, 16, 12, 8, 5] : [34, 41, 47, 38, 24, 14]);
  const fc = baseFc.map((v) => Math.max(0, Math.round(v * sm)));
  const fcMax = Math.max(...fc, 1);
  const curHourIdx = Math.min(5, Math.floor(hour));

  return (
    <React.Fragment>
      <div className="panel-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="eyebrow"><span className="tick" style={{ background: "var(--cyan)" }} />Condiciones actuales</div>
        {condMode === "real" && (
          <span className="wx-live-badge">
            <span className="wx-live-dot" style={{ background: wxStatus === "ok" ? "var(--green)" : wxStatus === "error" ? "var(--amber)" : "var(--ink-3)" }} />
            {wxStatus === "ok" ? "EN VIVO" : wxStatus === "error" ? "SIN SEÑAL" : "···"}
          </span>
        )}
      </div>
      <div className="divider" />
      <div className="scroll" style={{ flex: 1 }}>
        <div className="wx">
          <div className="wx-top">
            <div className="wx-temp mono">{wx.temp}<span className="deg">°C</span></div>
            <div className="wx-cond"><div className="c1">{wx.cond}</div><div className="c2">{wx.sub}</div></div>
          </div>
          <div className="wx-grid">
            <div className="wx-cell"><div className="k">Sensación</div><div className="v mono">{wx.feels}°</div></div>
            <div className="wx-cell"><div className="k">Humedad</div><div className="v mono">{wx.hum}<small>%</small></div></div>
            <div className="wx-cell"><div className="k">Viento</div><div className="v mono">{wx.wind}<small> km/h {wx.dir}</small></div></div>
            <div className="wx-cell"><div className="k">Presión</div><div className="v mono">{wx.pres}<small> hPa</small></div></div>
          </div>
          <div className="rain-gauge">
            <div className="rg-bar"><div className="rg-fill" style={{ height: fillPct + "%" }} /></div>
            <div className="rg-meta">
              <div>
                <div className="k">Intensidad de lluvia</div>
                <div className="rg-val mono">{Math.round(rainMmh)}<small> mm/h</small></div>
              </div>
              <div className="rg-tag" style={{ color: rainTag.c, background: rainTag.bg }}>{rainTag.t}</div>
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="section-pad">
          <div className="eyebrow" style={{ marginBottom: 10 }}><span className="tick" style={{ background: "var(--cyan)" }} />Datos inferidos por IA</div>
          <div className="ai-stat">
            <div className="glow" />
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div className="big mono">47</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>colonias<br />sin sensor</div>
            </div>
            <div className="lbl" style={{ marginTop: 8 }}>Completadas por el modelo a partir de topografía, drenaje y <b>radar meteorológico</b>.</div>
            <div className="conf" style={{ marginTop: 12 }}>
              <span className="ct">Confianza del modelo</span>
              <div className="track"><i style={{ width: "87%" }} /></div>
              <span className="pct mono">87%</span>
            </div>
          </div>
        </div>

        {/* live data source (read-only — el modo real/simulación se controla con EN VIVO en el mapa) */}
        <div className="section-pad" style={{ paddingTop: 4 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}><span className="tick" style={{ background: "var(--ink-4)" }} />Fuente de datos</div>
          <div className="toggle-cap" style={{ marginTop: 0 }}>
            <span className="dot" style={{ background: wxStatus === "ok" ? "var(--green)" : "var(--amber)", boxShadow: wxStatus === "ok" ? "0 0 6px var(--green)" : "none" }} />
            Open-Meteo · modelos globales (incl. SMN) · {wxStatus === "ok" ? "en vivo" : "conectando…"}
          </div>
        </div>

        <div className="divider" />

        <div className="section-pad">
          <div className="eyebrow" style={{ marginBottom: 6 }}><span className="tick" style={{ background: "var(--cyan)" }} />Pronóstico · 6 horas{liveFc ? " · en vivo" : ""}</div>
          <div className="fc">
            {fc.map((v, i) => {
              const lvl = v >= 45 ? 3 : v >= 25 ? 2 : v >= 8 ? 1 : 0;
              const col = lvl === 3 ? "#ef4444" : lvl === 2 ? "#f97316" : lvl === 1 ? "#22d3ee" : "#3db";
              const ic  = v >= 45 ? "⛈" : v >= 25 ? "🌧" : v >= 8 ? "🌦" : "🌤";
              const active = i === curHourIdx;
              return (
                <div className="fc-h" key={i}>
                  <div className="fc-ic">{ic}</div>
                  <div className="fc-spark" style={{ outline: active ? "1px solid rgba(0,212,255,.5)" : "none", boxShadow: active ? "0 0 10px rgba(0,212,255,.2)" : "none" }}>
                    <i style={{ height: Math.max(8, (v / fcMax) * 38) + "px", background: col }} />
                  </div>
                  <div className="fc-mm mono" style={{ color: col }}>{v}</div>
                  <div className="fc-t mono">+{i + 1}h</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

/* ===================== PARAM PICKER ===================== */
// Always clickable — picking a value calls onChange, which drops the app out of EN VIVO.
function ParamPicker({ options, labels, colors, value, onChange }) {
  return (
    <div className="param-picker">
      {options.map((opt, i) => {
        const active = value === opt;
        const col = colors ? colors[i] : "var(--cyan)";
        return (
          <button key={opt}
            className={"pp-btn" + (active ? " on" : "")}
            style={active ? { color: col, borderColor: col, background: col + "1a" } : {}}
            onClick={() => onChange(opt)}>
            {labels[i]}
          </button>
        );
      })}
    </div>
  );
}

/* ===================== ARC GAUGE ===================== */
function ArcGauge({ value }) {
  const cx = 52, cy = 52, r = 42;
  const START = -135, SWEEP = 270;
  const f = Math.max(0, Math.min(1, value / 100));
  const endDeg = START + SWEEP * f;
  const col = value >= 72 ? "#ef4444" : value >= 45 ? "#f97316" : "#22d3ee";
  return (
    <div className="arc">
      <svg width="104" height="104" viewBox="0 0 104 104">
        <path d={arcPath(cx, cy, r, START, START + SWEEP)} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="9" strokeLinecap="round" />
        <path d={arcPath(cx, cy, r, START, endDeg)} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${col}bb)`, transition: "all .35s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div className="num">
        <b className="mono" style={{ color: col }}>{value}</b>
        <span>/ 100</span>
      </div>
    </div>
  );
}

/* ===================== RIGHT PANEL — SIMULATION PARAMS ===================== */
function RightPanel({ rainMmh, setRain, isManual, condMode, modelState, playing, onSimulate, simMode, zoneSrc, drainage, setDrainage, soilSat, setSoilSat, canalLevel, setCanalLevel }) {
  const locked = simMode === "realtime";
  const comp = modelState.composite;
  const compLabel = comp >= 72
    ? { t: "Riesgo alto",  c: "var(--red)",    bg: "rgba(239,68,68,.14)" }
    : comp >= 45
    ? { t: "Riesgo medio", c: "var(--orange)", bg: "rgba(249,115,22,.14)" }
    : { t: "Riesgo bajo",  c: "var(--cyan)",   bg: "rgba(0,212,255,.12)" };

  const ranks = modelState.zoneScores.slice(0, 3);
  const ventana = (s) => s >= 80 ? "1 h" : s >= 66 ? "2 h" : s >= 52 ? "3 h" : "4 h+";

  const drainColors  = ["#22c55e","#3b82f6","#f59e0b","#ef4444"];
  const soilColors   = ["#f59e0b","#3b82f6","#ef4444"];
  const canalColors  = ["#22c55e","#f97316","#ef4444"];

  return (
    <React.Fragment>
      {/* section header */}
      <div className="panel-head">
        <div className="eyebrow"><span className="tick" style={{ background: "var(--orange)" }} />Parámetros de simulación</div>
        {locked && <div className="sim-lock-badge">TIEMPO REAL</div>}
      </div>
      <div className="divider" />

      <div className="scroll" style={{ flex: 1 }}>
        {/* Rain intensity */}
        <div className="rp-head">
          <div className="param-label-row">
            <span className="param-lbl">Lluvia</span>
            <span className="rain-num-sm mono" style={{ color: "var(--cyan)" }}>{Math.round(rainMmh)}<small> mm/h</small></span>
          </div>
          <div className="slider-wrap">
            <input type="range" className="rng" min="0" max="100" step="1" value={rainMmh}
              style={{ "--p": rainMmh + "%" }}
              onChange={(e) => setRain(parseFloat(e.target.value))} />
            <div className="rng-scale mono"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
            <div className="rng-mode">
              {locked
                ? <React.Fragment><span className="b" style={{ color: "var(--green)" }}>● En vivo</span> · {zoneSrc === "equipo" ? "datos del equipo" : "Open-Meteo · 20 puntos"}</React.Fragment>
                : <React.Fragment><span className="b">● Modo simulación</span> · ajusta libremente</React.Fragment>}
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* Alcantarillado */}
        <div className="param-block">
          <div className="param-label-row">
            <span className="param-lbl">Alcantarillado</span>
            <span className="param-note">{locked ? "—" : ["Excelente","Bueno","Básico","Deficiente"][["excelente","bueno","basico","deficiente"].indexOf(drainage)]}</span>
          </div>
          <ParamPicker
            options={["excelente","bueno","basico","deficiente"]}
            labels={["Excelente","Bueno","Básico","Deficiente"]}
            colors={drainColors}
            value={drainage} onChange={setDrainage} locked={locked} />
          <div className="param-hint">Condición de la red de drenaje urbano</div>
        </div>

        <div className="divider" />

        {/* Saturación del suelo */}
        <div className="param-block">
          <div className="param-label-row">
            <span className="param-lbl">Saturación del suelo</span>
            <span className="param-note">{locked ? "—" : ["Seco","Normal","Saturado"][["seco","normal","saturado"].indexOf(soilSat)]}</span>
          </div>
          <ParamPicker
            options={["seco","normal","saturado"]}
            labels={["Seco","Normal","Saturado"]}
            colors={soilColors}
            value={soilSat} onChange={setSoilSat} locked={locked} />
          <div className="param-hint">Capacidad de absorción del terreno</div>
        </div>

        <div className="divider" />

        {/* Nivel en cauces */}
        <div className="param-block">
          <div className="param-label-row">
            <span className="param-lbl">Nivel en cauces</span>
            <span className="param-note">{locked ? "—" : ["Normal","Elevado","Crítico"][["normal","elevado","critico"].indexOf(canalLevel)]}</span>
          </div>
          <ParamPicker
            options={["normal","elevado","critico"]}
            labels={["Normal","Elevado","Crítico"]}
            colors={canalColors}
            value={canalLevel} onChange={setCanalLevel} locked={locked} />
          <div className="param-hint">Ríos, canales y cuerpos de agua urbanos</div>
        </div>

        <div className="divider" />

        {/* Composite risk gauge */}
        <div className="rp-head" style={{ paddingBottom: 0, paddingTop: 14 }}>
          <div className="eyebrow"><span className="tick" style={{ background: "var(--orange)" }} />Índice de riesgo compuesto</div>
        </div>
        <div className="gauge">
          <ArcGauge value={comp} />
          <div className="meta">
            <div className="gt">Riesgo físico × Vulnerabilidad social</div>
            <span className="gbadge" style={{ color: compLabel.c, background: compLabel.bg }}>{compLabel.t}</span>
            <div className="gd">Resultado combinado de todos los parámetros de simulación.</div>
          </div>
        </div>

        <div className="divider" />

        {/* Top 3 zones summary */}
        <div className="rank" style={{ paddingTop: 10 }}>
          <div className="eyebrow" style={{ padding: "0 6px 8px" }}><span className="tick" style={{ background: "var(--red)" }} />Zonas prioritarias</div>
          {ranks.map((z, i) => {
            const lvl = z.score >= 72 ? 3 : z.score >= 50 ? 2 : 1;
            const col = Gp.LEVEL_COLORS[lvl];
            return (
              <div className="rrow" key={z.zone.name}>
                <div className="rn">{i + 1}</div>
                <div className="rbody">
                  <div className="rname"><span>{z.zone.short}</span><span className="rscore mono" style={{ color: col }}>{z.score}</span></div>
                  <div className="rtrack"><i style={{ width: z.score + "%", background: col, boxShadow: `0 0 6px ${col}88` }} /></div>
                </div>
                <div className="rwin mono">Ventana: {ventana(z.score)}</div>
              </div>
            );
          })}
        </div>

        {/* Simulate button */}
        <button className="btn-simulate" onClick={onSimulate} style={{ margin: "4px 18px 16px" }}>
          {playing
            ? <React.Fragment>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg>
                Pausar simulación
              </React.Fragment>
            : <React.Fragment>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5l12 7.5-12 7.5z"/></svg>
                Iniciar simulación →
              </React.Fragment>}
        </button>
      </div>
    </React.Fragment>
  );
}

/* ===================== SIM CONTROL BAR (center map, top) ===================== */
function SimControl({ simMode, setSimMode }) {
  const isLive = simMode === "realtime";
  const toggle = () => setSimMode(isLive ? "manual" : "realtime");
  return (
    <div className="simbar frost">
      <button className={"enlive-btn" + (isLive ? " on" : "")} onClick={toggle}>
        <span className="enlive-dot" style={{
          background: isLive ? "var(--red)" : "var(--ink-3)",
          boxShadow: isLive ? "0 0 8px var(--red)" : "none",
          animation: isLive ? "blink 1.6s ease-in-out infinite" : "none",
        }} />
        EN VIVO
      </button>
      <span className="simbar-hint">
        {isLive
          ? "Datos reales · parámetros bloqueados"
          : "Modo simulación · ajusta los parámetros →"}
      </span>
    </div>
  );
}

/* ===================== TIME SLIDER ===================== */
const NOW_MIN = 17 * 60 + 20;
function TimeSlider({ hour, setHour, playing, togglePlay, scenario, setScenario }) {
  const pct  = hour / 6 * 100;
  const tMin = NOW_MIN + Math.round(hour * 60);
  const clock = `${pad2(Math.floor(tMin / 60) % 24)}:${pad2(tMin % 60)}`;
  const hourLabel = hour < 0.08 ? "Ahora" : `+${hour.toFixed(1)} h`;

  const scenarios = ["optimista", "esperado", "pesimista"];
  const scenIdx   = scenarios.indexOf(scenario);
  const scenColor  = scenario === "optimista" ? "rgba(52,211,153,.22)" : scenario === "pesimista" ? "rgba(239,68,68,.22)" : "rgba(0,212,255,.22)";
  const scenBorder = scenario === "optimista" ? "rgba(52,211,153,.5)"  : scenario === "pesimista" ? "rgba(239,68,68,.5)"  : "rgba(0,212,255,.5)";

  return (
    <div className="timebar frost">
      <div className="tb-row">
        <button className="tb-play" onClick={togglePlay} aria-label="play">
          {playing
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#021016"><rect x="6" y="5" width="4" height="14" rx="1.5" /><rect x="14" y="5" width="4" height="14" rx="1.5" /></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="#021016"><path d="M7 4.5l12 7.5-12 7.5z" /></svg>}
        </button>
        <div className="tb-scrub">
          <div className="tb-labels">
            <span className="now"><span className="d" />Ahora · 17:20</span>
            <span>{clock} · proyección</span>
            <span>+6 h</span>
          </div>
          <div className="tb-track-wrap">
            <div className="tb-track" />
            <div className="tb-fill" style={{ width: pct + "%" }} />
            <div className="tb-ticks">{[0,1,2,3,4,5,6].map(i => <div className="tb-tick" key={i} />)}</div>
            <div className="tb-knob" style={{ left: pct + "%" }} />
            <input className="tb-range" type="range" min="0" max="6" step="0.05" value={hour}
              onChange={(e) => setHour(parseFloat(e.target.value))} />
          </div>
        </div>
        <div className="tb-hour mono">{hourLabel}</div>
      </div>
      <div className="tb-scen">
        <div className="scen-pill" style={{ left: `calc(${scenIdx * 33.333}% + 3px)`, width: "calc(33.333% - 6px)", background: scenColor, border: `1px solid ${scenBorder}` }} />
        {scenarios.map(s => (
          <button key={s} className={scenario === s ? "on" : ""} onClick={() => setScenario(s)}>
            {Gp.SCEN[s].label}<span className="sdesc">{Gp.SCEN[s].desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { LeftPanel, RightPanel, TimeSlider, SimControl, ParamPicker, ArcGauge });
