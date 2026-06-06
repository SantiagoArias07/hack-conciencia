// ============================================================
// FloodSense — LeafletMap: real CartoDB Dark Matter tiles
// with an H3 hex risk overlay (Section 2 · Simulador)
// ============================================================
const { useRef, useEffect, useState } = React;
const G = window.FloodGeo;

function LeafletMap({ modelState, condMode, selected, onSelect }) {
  const elRef      = useRef(null);
  const mapRef     = useRef(null);
  const polysRef   = useRef([]);
  const hoverRef   = useRef(null);
  const selRef     = useRef(null);
  const [hover, setHover] = useState(null);
  const [ready, setReady] = useState(false);

  const findHex = (latlng) => {
    let bi = -1, bd = 1e9;
    const cl = Math.cos(latlng.lat * Math.PI / 180);
    for (let i = 0; i < G.HEXES.length; i++) {
      const h = G.HEXES[i]; if (h.edgeFade < 0.05) continue;
      const dx = (h.lng - latlng.lng) * cl, dy = h.lat - latlng.lat;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; bi = i; }
    }
    return (bi >= 0 && Math.sqrt(bd) < 0.011) ? bi : -1;
  };

  useEffect(() => {
    const map = L.map(elRef.current, {
      center: G.MAP_CENTER, zoom: G.MAP_ZOOM, minZoom: 10, maxZoom: 14,
      zoomControl: false, scrollWheelZoom: true, attributionControl: false,
      doubleClickZoom: true, zoomSnap: 0.25, fadeAnimation: true,
    });
    mapRef.current = map;
    map.setMaxBounds([[19.02, -99.55], [19.78, -98.70]]);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd", maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomleft" }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    polysRef.current = G.HEXES.map((h) =>
      L.polygon(h.vertsLL, {
        interactive: false, stroke: true, weight: 0.6,
        color: "rgba(255,255,255,0.05)", fillColor: "#1e4066", fillOpacity: 0.12,
        className: "hexpoly", lineJoin: "round",
      }).addTo(layer)
    );

    hoverRef.current = L.polygon([G.HEXES[0].vertsLL], {
      interactive: false, fill: false, color: "#ffffff", weight: 1.6, opacity: 0,
    }).addTo(map);
    selRef.current = L.polygon([G.HEXES[0].vertsLL], {
      interactive: false, fill: false, color: "#00d4ff", weight: 2.2, opacity: 0,
      className: "sel-outline",
    }).addTo(map);

    map.on("mousemove", (e) => {
      const i = findHex(e.latlng);
      if (i < 0) { hoverRef.current.setStyle({ opacity: 0 }); setHover(null); return; }
      hoverRef.current.setLatLngs(G.HEXES[i].vertsLL).setStyle({ opacity: 0.85 });
      setHover({ hexId: i, x: e.containerPoint.x, y: e.containerPoint.y });
    });
    map.on("mouseout", () => { hoverRef.current.setStyle({ opacity: 0 }); setHover(null); });
    map.on("click", (e) => {
      const i = findHex(e.latlng);
      onSelect(i < 0 ? null : G.HEXES[i]);
    });

    setReady(true);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(elRef.current);
    setTimeout(() => map.invalidateSize(), 120);
    return () => { ro.disconnect(); map.remove(); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const risks = modelState.risks;
    const polys = polysRef.current;
    for (let i = 0; i < polys.length; i++) {
      const el = polys[i] && polys[i]._path; if (!el) continue;
      const r = risks[i], lvl = G.riskLevel(r);
      el.setAttribute("fill", G.hexFill(r));
      el.setAttribute("fill-opacity", "1");
      el.setAttribute("stroke", lvl >= 2 ? "rgba(255,255,255,0.16)" : lvl === 1 ? "rgba(120,200,220,0.13)" : "rgba(120,160,200,0.06)");
      if (lvl === 3) el.classList.add("alto"); else el.classList.remove("alto");
    }
  }, [modelState, ready]);

  useEffect(() => {
    if (!ready || !selRef.current) return;
    if (selected) selRef.current.setLatLngs(selected.vertsLL).setStyle({ opacity: 1 });
    else selRef.current.setStyle({ opacity: 0 });
  }, [selected, ready]);

  const tipHex = hover ? G.HEXES[hover.hexId] : null;
  const tipR   = tipHex ? modelState.risks[tipHex.id] : 0;
  const tipLvl = G.riskLevel(tipR);

  // pinned info card for the clicked hex
  const selR   = selected ? modelState.risks[selected.id] : 0;
  const selLvl = G.riskLevel(selR);

  return (
    <div className="lmap-wrap" style={{ cursor: hover ? "pointer" : "grab" }}>
      <div ref={elRef} className="lmap" />

      {selected && (
        <div className="hexinfo frost">
          <button className="hexinfo-x" onClick={() => onSelect(null)} aria-label="cerrar">×</button>
          <div className="hexinfo-eyebrow">
            <span className="hexinfo-pin" />
            {selected.zone.edo ? "Edo. de México" : "Alcaldía · CDMX"}
          </div>
          <div className="hexinfo-name">{selected.zone.short}</div>
          <div className="hexinfo-badge" style={{ background: G.LEVEL_COLORS[selLvl] + "22", color: G.LEVEL_COLORS[selLvl] }}>
            {G.LEVEL_NAMES[selLvl]} · {Math.round(selR * 100)}%
          </div>
          <div className="hexinfo-bar"><i style={{ width: Math.round(selR * 100) + "%", background: G.LEVEL_COLORS[selLvl] }} /></div>
          <div className="hexinfo-rows">
            <div className="hexinfo-row"><span>Elevación</span><b>{selected.zone.elev} m</b></div>
            <div className="hexinfo-row"><span>Susceptibilidad</span><b>{Math.round(selected.sus * 100)}%</b></div>
            <div className="hexinfo-row"><span>Vulnerabilidad</span><b>{Math.round(selected.vuln * 100)}%</b></div>
          </div>
          <div className="hexinfo-src">
            <span className="d" style={{ background: selected.conf === 0 ? "var(--green)" : selected.conf === 1 ? "#fbbf24" : "#fb923c" }} />
            {selected.conf === 0 ? "Dato de sensor real" : selected.conf === 1 ? "Inferido por modelo IA" : "Alta incertidumbre"}
          </div>
        </div>
      )}

      {tipHex && (
        <div className="hextip frost show" style={{ left: hover.x, top: hover.y - 6 }}>
          <div className="ht-name">
            <span>{tipHex.zone.short}</span>
            <span className="ht-badge" style={{ background: G.LEVEL_COLORS[tipLvl] + "22", color: G.LEVEL_COLORS[tipLvl] }}>
              {G.LEVEL_NAMES[tipLvl].toUpperCase()}
            </span>
          </div>
          <div className="ht-row"><span>Riesgo de inundación</span><b>{Math.round(tipR * 100)}%</b></div>
          <div className="ht-row"><span>Elevación</span><b>{tipHex.zone.elev} m</b></div>
          <div className="ht-row"><span>Vulnerabilidad social</span><b>{Math.round(tipHex.vuln * 100)}%</b></div>
          <div className="ht-bar"><i style={{ width: Math.round(tipR * 100) + "%", background: G.LEVEL_COLORS[tipLvl] }} /></div>
          <div className="ht-src">
            <span className="d" style={{ background: tipHex.zone.edo ? "var(--ink-3)" : "var(--cyan)" }} />
            {tipHex.zone.edo ? "Edo. de México · contexto de cuenca" : "Colonia inferida por modelo IA"}
          </div>
        </div>
      )}

      <div className="legend frost">
        <div className="lh">Riesgo de inundación</div>
        {[0, 1, 2, 3].map((l) => (
          <div className="lrow" key={l}>
            <span className="lsw" style={{ background: G.LEVEL_COLORS[l], boxShadow: l === 3 ? "0 0 8px rgba(239,68,68,.6)" : "none" }} />
            {G.LEVEL_NAMES[l]}
          </div>
        ))}
      </div>

      <div className="map-status">
        <div className="map-chip frost">
          <span className="mono" style={{ color: "var(--ink-2)" }}>Malla hex · 532</span>
        </div>
        <div className={"map-chip frost" + (condMode === "hist" ? " hist" : "")}>
          <span className={"live" + (condMode === "hist" ? " hide" : "")} />
          <span className="mono" style={{ color: "var(--ink-2)" }}>
            {condMode === "hist" ? "Histórico" : "CartoDB · Dark Matter"}
          </span>
        </div>
      </div>
    </div>
  );
}

window.LeafletMap = LeafletMap;
