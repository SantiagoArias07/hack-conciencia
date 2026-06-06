// ============================================================
// FloodSense — Left & Right panels, time slider, gauges
// ============================================================
const Gp = window.FloodGeo;

function pad2(n) { return n < 10 ? "0" + n : "" + n; }
window.pad2 = pad2; // share with sections.jsx

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
function LeftPanel({ rainMmh, condMode, setCondMode, scenario, hour }) {
  const wx = condMode === "hist"
    ? { temp: 21, feels: 20, hum: 64, wind: 9,  dir: "N",  cond: "Parcialmente nublado", sub: "Promedio histórico · junio" }
    : { temp: 18, feels: 16, hum: 82, wind: 14, dir: "NE", cond: "Lluvia moderada",       sub: "Sensación 16° · presión 1014 hPa" };

  const fillPct = Math.min(100, (rainMmh / 80) * 100);
  const rainTag = rainMmh >= 50
    ? { t: "TORRENCIAL", c: "var(--red)",    bg: "rgba(239,68,68,.14)" }
    : rainMmh >= 25
    ? { t: "FUERTE",     c: "var(--amber)",  bg: "rgba(245,158,11,.14)" }
    : rainMmh >= 7.5
    ? { t: "MODERADA",   c: "var(--cyan)",   bg: "rgba(0,212,255,.12)" }
    : { t: "LIGERA",     c: "var(--ink-2)",  bg: "rgba(255,255,255,.06)" };

  const sm = Gp.SCEN[scenario].mult;
  const baseFc = condMode === "hist" ? [10, 13, 16, 12, 8, 5] : [34, 41, 47, 38, 24, 14];
  const fc = baseFc.map((v) => Math.max(0, Math.round(v * sm)));
  const fcMax = Math.max(...fc, 1);
  const curHourIdx = Math.min(5, Math.floor(hour));

  return (
    <React.Fragment>
      <div className="panel-head">
        <div className="eyebrow"><span className="tick" style={{ background: "var(--cyan)" }} />Condiciones actuales</div>
      </div>
      <div className="divider" />
      <div className="scroll" style={{ flex: 1 }}>
        <div className="wx">
          <div className="wx-top">
            <div className="wx-temp mono">{wx.temp}<span className="deg">°C</span></div>
            <div className="wx-cond">
              <div className="c1">{wx.cond}</div>
              <div className="c2">{wx.sub}</div>
            </div>
          </div>
          <div className="wx-grid">
            <div className="wx-cell"><div className="k">Sensación</div><div className="v mono">{wx.feels}°</div></div>
            <div className="wx-cell"><div className="k">Humedad</div><div className="v mono">{wx.hum}<small>%</small></div></div>
            <div className="wx-cell"><div className="k">Viento</div><div className="v mono">{wx.wind}<small> km/h {wx.dir}</small></div></div>
            <div className="wx-cell"><div className="k">Presión</div><div className="v mono">{condMode === "hist" ? 1018 : 1014}<small> hPa</small></div></div>
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
          <div className="eyebrow" style={{ marginBottom: 9 }}><span className="tick" style={{ background: "var(--cyan)" }} />Datos inferidos por IA</div>
          <div className="ai-stat">
            <div className="glow" />
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div className="big mono">47</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>colonias<br />sin sensor</div>
            </div>
            <div className="lbl">Completadas por el modelo a partir de topografía, drenaje y <b>radar meteorológico</b>.</div>
            <div className="conf">
              <span className="ct">Confianza del modelo</span>
              <div className="track"><i style={{ width: "87%" }} /></div>
              <span className="pct mono">87%</span>
            </div>
          </div>
        </div>

        <div className="section-pad" style={{ paddingTop: 4 }}>
          <div className="eyebrow" style={{ marginBottom: 9 }}><span className="tick" style={{ background: "var(--ink-3)" }} />Fuente de datos</div>
          <div className="toggle-row">
            <div className={"toggle-opt" + (condMode === "real" ? " on" : "")} onClick={() => setCondMode("real")}>Condiciones reales</div>
            <div className={"toggle-opt hist" + (condMode === "hist" ? " on" : "")} onClick={() => setCondMode("hist")}>Históricas</div>
          </div>
          <div className="toggle-cap">
            <span className="dot" style={{ background: condMode === "real" ? "var(--green)" : "var(--ink-3)", boxShadow: condMode === "real" ? "0 0 6px var(--green)" : "none" }} />
            {condMode === "real" ? "API CONAGUA + radar · actualizado hace 2 min" : "Serie histórica 2015–2024 · misma fecha"}
          </div>
        </div>

        <div className="divider" />

        <div className="section-pad">
          <div className="eyebrow" style={{ marginBottom: 4 }}><span className="tick" style={{ background: "var(--cyan)" }} />Pronóstico · 6 horas</div>
          <div className="fc">
            {fc.map((v, i) => {
              const lvl = v >= 45 ? 3 : v >= 25 ? 2 : v >= 8 ? 1 : 0;
              const col = lvl === 3 ? "#ef4444" : lvl === 2 ? "#f59e0b" : lvl === 1 ? "#22d3ee" : "#3b6";
              const ic  = v >= 45 ? "⛈" : v >= 25 ? "🌧" : v >= 8 ? "🌦" : "🌤";
              const active = i === curHourIdx;
              return (
                <div className="fc-h" key={i}>
                  <div className="fc-ic">{ic}</div>
                  <div className="fc-spark" style={{ outline: active ? "1px solid rgba(0,212,255,.5)" : "none", boxShadow: active ? "0 0 10px rgba(0,212,255,.25)" : "none" }}>
                    <i style={{ height: Math.max(8, (v / fcMax) * 38) + "px", background: col, boxShadow: `0 0 6px ${col}66` }} />
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

/* ===================== ARC GAUGE ===================== */
function ArcGauge({ value }) {
  const cx = 52, cy = 52, r = 42;
  const START = -135, SWEEP = 270;
  const f = Math.max(0, Math.min(1, value / 100));
  const endDeg = START + SWEEP * f;
  const col = value >= 72 ? "#ef4444" : value >= 45 ? "#f59e0b" : "#22d3ee";
  return (
    <div className="arc">
      <svg width="104" height="104" viewBox="0 0 104 104">
        <path d={arcPath(cx, cy, r, START, START + SWEEP)} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="9" strokeLinecap="round" />
        <path d={arcPath(cx, cy, r, START, endDeg)} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 5px ${col}aa)`, transition: "all .35s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div className="num">
        <b className="mono" style={{ color: col }}>{value}</b>
        <span>/ 100</span>
      </div>
    </div>
  );
}

/* ===================== RIGHT PANEL ===================== */
function RightPanel({ rainMmh, setRain, isManual, condMode, modelState, onExport }) {
  const [tab, setTab] = React.useState("ciudadanos");
  const comp  = modelState.composite;
  const ranks = modelState.zoneScores.slice(0, 3);
  const scoreOf = (name) => { const z = modelState.zoneScores.find(z => z.zone.name === name); return z ? z.score : 0; };

  const compLabel = comp >= 72
    ? { t: "Riesgo alto",  c: "var(--red)",   bg: "rgba(239,68,68,.14)" }
    : comp >= 45
    ? { t: "Riesgo medio", c: "var(--amber)", bg: "rgba(245,158,11,.14)" }
    : { t: "Riesgo bajo",  c: "var(--cyan)",  bg: "rgba(0,212,255,.12)" };

  const top = ranks[0];
  const cards = [
    (() => {
      const lvl = top ? (top.score >= 72 ? 3 : top.score >= 50 ? 2 : 1) : 2;
      return {
        lvl,
        icon: lvl >= 3 ? "🔴" : lvl >= 2 ? "🟡" : "🟢",
        cls: lvl >= 3 ? "red" : lvl >= 2 ? "amber" : "green",
        title: `${top ? top.zone.short : "Iztapalapa"} — Eje 8 Sur`,
        body: lvl >= 3
          ? "Evita circular después de las 6 pm. Riesgo de encharcamiento severo en pasos a desnivel."
          : lvl >= 2 ? "Precaución en avenidas; posibles encharcamientos en las próximas horas."
          : "Condiciones estables. Sin afectaciones previstas en vialidades.",
      };
    })(),
    (() => {
      const s = scoreOf("Xochimilco"); const lvl = s >= 72 ? 3 : s >= 50 ? 2 : 1;
      return {
        lvl, icon: lvl >= 3 ? "🔴" : lvl >= 2 ? "🟡" : "🟢", cls: lvl >= 3 ? "red" : lvl >= 2 ? "amber" : "green",
        title: "Xochimilco — zona de canales",
        body: lvl >= 2 ? "Canales con nivel elevado. Monitorea actualizaciones cada 30 min." : "Niveles normales en canales. Sin alerta activa.",
      };
    })(),
    (() => {
      const s = scoreOf("Coyoacán"); const lvl = s >= 72 ? 3 : s >= 50 ? 2 : 1;
      return {
        lvl, icon: lvl >= 3 ? "🔴" : lvl >= 2 ? "🟡" : "🟢", cls: lvl >= 3 ? "red" : lvl >= 2 ? "amber" : "green",
        title: "Coyoacán — Centro",
        body: lvl >= 2 ? "Vigilancia preventiva. Mantente atento a avisos oficiales." : "Riesgo bajo. Condiciones normales.",
      };
    })(),
  ];

  const ventana = (s) => s >= 80 ? "1 h" : s >= 66 ? "2 h" : s >= 52 ? "3 h" : "4 h+";

  return (
    <React.Fragment>
      <div className="rp-head">
        <div className="eyebrow" style={{ marginBottom: 8 }}><span className="tick" style={{ background: "var(--cyan)" }} />Nivel de lluvia</div>
        <div className="rain-num mono">{Math.round(rainMmh)}<small> mm/h</small></div>
        <div className="slider-wrap">
          <input type="range" className="rng" min="0" max="80" step="1" value={rainMmh}
            style={{ "--p": (rainMmh / 80 * 100) + "%" }}
            onChange={(e) => setRain(parseFloat(e.target.value))} />
          <div className="rng-scale mono"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span></div>
          <div className="rng-mode">
            {isManual
              ? <React.Fragment><span className="b">● Simulación manual</span> · anula el tiempo real</React.Fragment>
              : condMode === "hist"
              ? <React.Fragment>Sincronizado con promedio histórico</React.Fragment>
              : <React.Fragment>Sincronizado con condiciones en vivo</React.Fragment>}
          </div>
        </div>
      </div>

      <div className="divider" style={{ marginTop: 14 }} />

      <div className="rp-head" style={{ paddingBottom: 0, paddingTop: 14 }}>
        <div className="eyebrow"><span className="tick" style={{ background: "var(--amber)" }} />Índice de riesgo compuesto</div>
      </div>
      <div className="gauge">
        <ArcGauge value={comp} />
        <div className="meta">
          <div className="gt">Riesgo físico × Vulnerabilidad social</div>
          <span className="gbadge" style={{ color: compLabel.c, background: compLabel.bg }}>{compLabel.t}</span>
          <div className="gd">Probabilidad de inundación ponderada por exposición de la población.</div>
        </div>
      </div>

      <div className="divider" />

      <div className="rtabs">
        <button className={tab === "ciudadanos" ? "on" : ""} onClick={() => setTab("ciudadanos")}>
          <span className="dotb" style={{ background: "var(--blue)" }} />Ciudadanos
          {cards.filter(c => c.lvl >= 2).length > 0 && <span className="tnum">{cards.filter(c => c.lvl >= 2).length}</span>}
        </button>
        <button className={tab === "autoridades" ? "on" : ""} onClick={() => setTab("autoridades")}>
          <span className="dotb" style={{ background: "var(--amber)" }} />Autoridades
        </button>
      </div>

      <div className="scroll" style={{ flex: 1 }}>
        {tab === "ciudadanos" ? (
          <div className="alerts" style={{ paddingTop: 10 }}>
            {cards.map((c, i) => (
              <div className={"alert " + c.cls} key={i}>
                <div className="ai">{c.icon}</div>
                <div className="ac"><div className="a1">{c.title}</div><div className="a2">{c.body}</div></div>
              </div>
            ))}
          </div>
        ) : (
          <React.Fragment>
            <div className="aut-lead">Top 3 colonias para despliegue preventivo de recursos.</div>
            <div className="rank">
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
            <button className="btn-pdf" onClick={onExport}>
              Exportar reporte PDF
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#021016" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </React.Fragment>
        )}
      </div>
    </React.Fragment>
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
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="#021016"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="#021016"><path d="M7 4.5l12 7.5-12 7.5z" /></svg>}
        </button>
        <div className="tb-scrub">
          <div className="tb-labels">
            <span className="now"><span className="d" />Ahora · 17:20</span>
            <span>{clock} · proyección</span>
            <span>+6 horas</span>
          </div>
          <div className="tb-track-wrap">
            <div className="tb-track" />
            <div className="tb-fill" style={{ width: pct + "%" }} />
            <div className="tb-ticks">{[0, 1, 2, 3, 4, 5, 6].map(i => <div className="tb-tick" key={i} />)}</div>
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

Object.assign(window, { LeftPanel, RightPanel, TimeSlider });
