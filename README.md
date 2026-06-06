<div align="center">

# 🌊 FloodSense

### Simulador de riesgo de inundación urbana para la Ciudad de México, potenciado por IA

**▶︎ [VER DEMO EN VIVO — floodsensetec.vercel.app](https://floodsensetec.vercel.app)**

*Inteligencia hidrológica que estima el riesgo de encharcamiento por colonia — incluso donde no hay sensores.*

`React` · `Leaflet` · `Open-Meteo` · `IA para datos limitados`

</div>

---

## 📸 Capturas

> Reemplaza estas imágenes con tus 5 screenshots (déjalas en `docs/screenshots/`).

| Inicio | Simulador |
|:---:|:---:|
| ![Inicio](docs/screenshots/1-inicio.png) | ![Simulador](docs/screenshots/2-simulador.png) |
| **Alertas** | **Transparencia** |
| ![Alertas](docs/screenshots/3-alertas.png) | ![Transparencia](docs/screenshots/4-transparencia.png) |

<div align="center">

**Móvil**

<img src="docs/screenshots/5-movil.png" width="280" alt="Móvil" />

</div>

---

## 🎯 ¿Qué es? (resumen para el equipo)

FloodSense es un **gemelo digital** del riesgo de inundación de CDMX. Sobre un **mapa real** dividido en ~532 hexágonos, un **modelo hidrológico** estima qué tan probable es que cada zona se inunde, combinando lluvia, topografía, drenaje y **vulnerabilidad social**. Lo que lo distingue para el reto *"IA en entornos con datos limitados"*: **rellena con IA la información que falta** (colonias sin sensor) y **muestra con honestidad qué es dato real y qué es estimación**.

La app tiene **4 secciones**:

1. **Inicio** — dashboard con KPIs **reales en vivo** (lluvia actual, colonias en riesgo, ventana de acción) + pronóstico de 6h y mini-mapa.
2. **Simulador** — el corazón. Mapa real con hexágonos de riesgo. Modo **EN VIVO** (datos reales por zona) o **Simulación** (mueves lluvia, drenaje, saturación del suelo y nivel de cauces y ves cómo se inunda la cuenca en el tiempo).
3. **Alertas** — dos vistas: **Ciudadanía** (qué evitar, por colonia) y **Autoridades** (recomendaciones de acción generadas por IA según el riesgo actual).
4. **Transparencia** — mapa de **confianza del modelo** (qué es real, inferido o incierto) y sus métricas.

---

## 🧩 Cómo funciona, sección por sección

### Inicio
Dashboard de monitoreo. Los KPIs **siempre reflejan datos reales** (no se alteran al simular).

> **Técnico:** `HeroSection` recibe un `realState` calculado aparte con `computeState(realRain, …, liveZoneRain)` — desacoplado del estado del simulador. `realRain` es el promedio de las alcaldías CDMX tomado del feed multi-punto de Open-Meteo. El pronóstico de 6h sale de `liveWx.forecast` (hourly de Open-Meteo). Un contador (`useEffect` + `setInterval`) anima la "ventana de acción".

### Simulador (el hero)
Mapa **Leaflet** con tiles reales (CartoDB Dark Matter) y una malla hexagonal encima coloreada por riesgo. Botón **EN VIVO** alterna entre datos reales y simulación; en simulación ajustas 4 variables y una línea de tiempo (Ahora → +6h) con escenarios Optimista/Esperado/Pesimista.

> **Técnico:** `LeafletMap` pinta cada `L.polygon` de forma imperativa según `modelState.risks` (recolorea por mutación del `_path` SVG, sin recrear capas). Hover/click hacen *hit-testing* por cercanía de centroides (`findHex`). El modelo vive en `geo.jsx`: `hexRisk(hex, lluvia, hora, escenario, params)` con respuesta saturante a la lluvia y acumulación temporal exponencial; `computeState()` agrega por zona y produce el índice compuesto, el ranking y el conteo de colonias en alto. La lluvia es **espacial**: cada hexágono usa la lluvia real de su zona (`zoneRain[hex.zone.name]`).

### Alertas
Pestaña **Ciudadanía** (tarjetas por colonia con filtros + buscador) y pestaña **Autoridades** (recomendaciones accionables: activar protocolo, preposicionar bombeo, abrir compuertas, etc.).

> **Técnico:** `generateAuthorityRecs(modelState)` deriva las recomendaciones del `composite` y del `zoneScores` en vivo (reglas por umbral de riesgo + ventana de acción). Se recalcula con `useMemo` cuando cambia el índice. *(Próximo paso: que el texto lo redacte un LLM en vez de plantillas.)*

### Transparencia
Mapa de **confianza** (verde = dato real, amarillo = inferido por IA, naranja = incierto) + métricas del modelo + acordeón "¿cómo funciona la IA?".

> **Técnico:** `SVGHexMap` reusa la misma geometría hexagonal en SVG puro (sin tiles) coloreada por `hex.conf`. Hoy `conf` es sintético; el plan es derivarlo de la distancia al dato real + varianza de imputación (ver `docs/ARQUITECTURA-IA.md`).

---

## 🏗️ Stack y arquitectura

| Capa | Tecnología |
|---|---|
| UI | React 18 (UMD) + JSX compilado **en el navegador** con Babel Standalone |
| Mapa | Leaflet 1.9 + tiles **CartoDB Dark Matter** |
| Datos en vivo | **Open-Meteo** (gratis, sin API key) |
| Hosting | **Vercel** (estático) |
| Backend (equipo) | **Railway** → expone `live_state.json` (contrato JSON) |

> **Técnico:** sin build step — `index.html` carga React/Leaflet por CDN y los `js/*.jsx` con `<script type="text/babel">`. Por eso **debe servirse por HTTP** (no `file://`). `vercel.json` fija `framework:null` y `outputDirectory:"."` para servir la raíz. La app es 100% cliente; el único acoplamiento con backend es un `fetch('live_state.json')`.

---

## 📡 Datos reales y el contrato con el backend

- **Widget de clima + pronóstico:** Open-Meteo, 1 punto (CDMX).
- **Lluvia por colonia (mapa):** Open-Meteo **multi-punto** — una sola llamada con las 20 coordenadas de las alcaldías → lluvia real distinta por zona (*downscaling con datos reales*).
- **Feed del equipo:** si existe `live_state.json` (lo produce el backend en Railway), tiene prioridad; si no, cae a Open-Meteo automáticamente.

> **Técnico:** `fetchLiveWeather()`, `fetchZoneRain()` y `fetchLiveState(url)` en `geo.jsx`. Orden de prioridad: **JSON del equipo → Open-Meteo multi-punto → 1 punto**. Contrato y ejemplo en [`docs/live_state.example.json`](docs/live_state.example.json) (las claves de `zones` deben igualar `ZONES` en `geo.jsx`).

---

## 🤖 IA — cómo se usa (y cómo escalará)

El acto de IA **no** es la simulación hidráulica (eso es física), sino **fusionar datos públicos incompletos e imputar lo que falta con incertidumbre cuantificada**, más un **agente que vuelve usable el dato roto** (CSVs/PDFs de CONAGUA/SMN). Documento completo de arquitectura: **[`docs/ARQUITECTURA-IA.md`](docs/ARQUITECTURA-IA.md)**.

> **Técnico (resumen):** dos IAs separadas — (1) **predictiva** (kriging para lluvia entre pluviómetros, regresión logística regularizada para susceptibilidad, k-NN espacial para vulnerabilidad); (2) **generativa** (agente Claude con JSON Schema que normaliza datasets heterogéneos y narra las recomendaciones). Se mide robustez con **LOO-CV + cobertura del intervalo al 90%** vía enmascaramiento artificial de sensores.

---

## 🚀 Correr localmente

```bash
npm run dev          # = npx serve . --listen 3000
# abre http://localhost:3000
```
> Debe ser por HTTP (no abrir el `.html` directo): Babel necesita poder hacer `fetch` de los `.jsx`.

---

## 📁 Estructura

```
FloodSense.html / index.html   Entrada + todo el CSS (idénticos; index.html para Vercel)
vercel.json                    Config de deploy estático
js/
  geo.jsx        Modelo hidrológico, ZONES, hexágonos, fetch de datos reales
  map.jsx        Mapa Leaflet + overlay de hexágonos + tooltip/ficha
  panels.jsx     Panel izq (clima), panel der (parámetros), slider de tiempo, EN VIVO
  sections.jsx   Navbar + Inicio + Alertas + Transparencia
  svgmap.jsx     Mini-mapa SVG (hero y confianza)
  app.jsx        Estado global y cableado
docs/
  ARQUITECTURA-IA.md        Plan de IA / datos (visión completa)
  live_state.example.json   Contrato backend ↔ frontend
```

---

## 🗺️ Roadmap

- **Ahora:** lluvia real espacial (Open-Meteo 20 pts), modelo por hexágono, alertas IA.
- **Equipo (Railway):** mini-DB + ingesta → `live_state.json` con `vuln` (INEGI) y pluviómetros SACMEX.
- **Visión:** susceptibilidad real desde DEM (HAND/TWI vía Google Earth Engine), validación con SAR, mapa de confianza derivado de incertidumbre real, migración a H3.

---

<div align="center">
<sub>Prototipo de hackathon · CDMX 2026 · Reto: IA para riesgo de inundaciones en entornos con datos limitados</sub>
</div>
