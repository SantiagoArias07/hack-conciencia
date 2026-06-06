<div align="center">

# FloodSense

### Simulador de riesgo de inundación urbana para la Ciudad de México, potenciado por IA

**▶︎ [VER DEMO EN VIVO — floodsensetec.vercel.app](https://floodsensetec.vercel.app)**

*Inteligencia hidrológica que estima el riesgo de encharcamiento por colonia — incluso donde no hay sensores.*

`React` · `Leaflet` · `Open-Meteo` · `IA para datos limitados`

</div>

---

## Preview

<div align="center">
    <img src="https://github.com/user-attachments/assets/20973993-56d0-4d24-a52f-bc2f98bed581"        
  width="48%" alt="Home" />       
    <img src="https://github.com/user-attachments/assets/bafa0d60-b778-4f00-9420-86a51fc5f05b" 
  width="48%" alt="Subject" />         
    <br/><br/>                       
    <img src="https://github.com/user-attachments/assets/557ab959-923d-49e1-8d5b-02b071a7c164"        
  width="48%" alt="Tasks" />         
    <img src="https://github.com/user-attachments/assets/b9e7c522-f666-4b29-8843-ece4eb3d91a9" 
  width="48%" alt="Planner" />
</div>

---

<div align="center">

![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=flat-square&logo=leaflet&logoColor=white)
![Open-Meteo](https://img.shields.io/badge/Open--Meteo-live%20data-FF6B35?style=flat-square)
![Vercel](https://img.shields.io/badge/deploy-Vercel-000000?style=flat-square&logo=vercel)
![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)
![Status](https://img.shields.io/badge/status-prototype-f59e0b?style=flat-square)

</div>

## Contenido

- [Descripción](#descripción)
- [El problema](#el-problema)
- [Características](#características)
- [Cómo usarlo](#cómo-usarlo)
- [Arquitectura](#arquitectura)
- [El modelo de riesgo](#el-modelo-de-riesgo)
- [Inteligencia artificial](#inteligencia-artificial)
- [Datos y contrato de API](#datos-y-contrato-de-api)
- [Stack tecnológico](#stack-tecnológico)
- [Instalación local](#instalación-local)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Roadmap](#roadmap)
- [Equipo](#equipo)
- [Licencia](#licencia)

---

## Descripción

**FloodSense** es un **gemelo digital del riesgo de inundación urbana** para la Ciudad de México. Sobre un mapa real dividido en **~532 hexágonos**, un modelo hidrológico estima la probabilidad de encharcamiento de cada zona combinando **lluvia, topografía, drenaje y vulnerabilidad social**, y permite **simular escenarios** en una línea de tiempo de 6 horas.

Su propuesta de valor frente al reto *"IA para la predicción de inundaciones en entornos con datos limitados"* es doble:

1. **Rellena con IA la información que falta** — estima el riesgo incluso en colonias sin sensor.
2. **Es honesto con la incertidumbre** — distingue visualmente qué es dato real, qué es inferido y qué es incierto.

---

## El problema

La CDMX sufre inundaciones cada vez más frecuentes, pero la gestión del riesgo choca con un obstáculo: **los datos hidrometeorológicos, hidráulicos y de vulnerabilidad son escasos, fragmentados y de baja resolución**. Las herramientas tradicionales exigen datos densos y limpios que la ciudad simplemente no tiene de forma homogénea.

FloodSense ataca ese vacío: en lugar de fingir precisión, **modela el riesgo con los datos disponibles, imputa lo ausente y comunica la confianza** — convirtiéndose en una herramienta de apoyo a la decisión para ciudadanía y autoridades.

---

## Características

| | |
|---|---|
| 🗺️ **Mapa real interactivo** | Tiles reales (CartoDB Dark Matter) con una malla hexagonal de riesgo superpuesta; hover y click muestran la ficha de cada zona. |
| 🌧️ **Lluvia real y espacial** | Lluvia en vivo distinta por alcaldía vía Open-Meteo multi-punto (*downscaling con datos reales*). |
| 🎛️ **Simulador de escenarios** | Ajusta lluvia, alcantarillado, saturación del suelo y nivel de cauces; reproduce la inundación en el tiempo (Ahora → +6 h) con escenarios Optimista / Esperado / Pesimista. |
| 🔴 **Modo EN VIVO** | Alterna entre datos reales (parámetros bloqueados) y simulación libre con un toque. |
| 🚨 **Alertas duales** | Vista para **ciudadanía** (qué evitar por colonia) y para **autoridades** (recomendaciones de acción generadas según el riesgo actual). |
| 🔍 **Transparencia del modelo** | Mapa de confianza (real / inferido / incierto) y métricas — diferenciador clave del reto. |
| 📱 **Responsive** | Layout de 3 paneles en escritorio; mapa a pantalla casi completa con paneles desplegables en móvil. |

---

## Cómo usarlo

1. Abre la **[demo en vivo](https://floodsensetec.vercel.app)**.
2. En **Inicio** ves el estado real de la cuenca (KPIs y pronóstico en vivo).
3. Entra al **Simulador**:
   - Deja **EN VIVO** activado para ver la lluvia real por zona.
   - Desactívalo y mueve los parámetros para **simular una tormenta**; arrastra la línea de tiempo y observa cómo se inunda la cuenca.
4. Revisa **Alertas** (ciudadanía / autoridades) y **Transparencia** (qué tan confiable es cada dato).

---

## Arquitectura

```
┌──────────────────────────────────────────────────────────────────┐
│  FUENTES DE DATOS                                                  │
│  Open-Meteo (1 + 20 puntos)  ·  live_state.json (backend·Railway)  │
└───────────────────────────────┬──────────────────────────────────┘
                                │  fetch()   prioridad:
                                │  JSON equipo → Open-Meteo multi → 1 punto
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  geo.jsx — MOTOR                                                   │
│  ZONES · buildHexes() (~532 hex) · hexRisk() · computeState()      │
└───────────────────────────────┬──────────────────────────────────┘
                                │  modelState { risks[], composite, zoneScores }
                                ▼
┌──────────────┬───────────────┬───────────────┬────────────────────┐
│   Inicio     │  Simulador    │   Alertas     │   Transparencia    │
│ KPIs reales  │ Mapa Leaflet  │ Recs por IA   │ Mapa de confianza  │
└──────────────┴───────────────┴───────────────┴────────────────────┘
```

**Sin build step:** `index.html` carga React y Leaflet por CDN y compila los `js/*.jsx` en el navegador con Babel Standalone. Por eso **debe servirse por HTTP** (no `file://`). La app es 100 % cliente; su único acoplamiento con el backend del equipo es un `fetch('live_state.json')`, lo que permite trabajar frontend y backend en paralelo sin bloqueos.

---

## El modelo de riesgo

Cada hexágono guarda `sus` (susceptibilidad física 0–1), `vuln` (vulnerabilidad social 0–1) y `elev` (elevación). El riesgo se calcula en `hexRisk()`:

```
riesgo = sus × respuesta_lluvia × acumulación_temporal × escenario × (drenaje · suelo · cauces)
```

- **Respuesta a la lluvia** *saturante* — `lluvia / (lluvia + 22)`: pasada cierta intensidad, el riesgo ya no crece linealmente.
- **Acumulación temporal** *exponencial* — la cuenca se llena con las horas, más rápido donde el drenaje es deficiente.
- **Índice compuesto (0–100)** — `computeState()` promedia la ciudad **ponderando por vulnerabilidad social**, y produce el ranking de colonias prioritarias y el conteo en riesgo alto.

> El render del mapa es **imperativo**: `LeafletMap` recolorea el `_path` SVG de cada `L.polygon` según `modelState.risks` sin recrear capas, para que el scrub temporal sea fluido.

---

## Inteligencia artificial

> Documento completo: **[`docs/ARQUITECTURA-IA.md`](docs/ARQUITECTURA-IA.md)**

El acto de IA **no es la simulación hidráulica** (eso es física), sino **fusionar datos públicos incompletos e imputar lo que falta con incertidumbre cuantificada**. Se separan dos roles:

- **IA predictiva (los números):** *kriging* para interpolar lluvia entre pluviómetros, **regresión logística regularizada** para la susceptibilidad física y **k-NN espacial** para la vulnerabilidad — todo con su incertidumbre asociada.
- **IA generativa (un agente Claude):** normaliza datasets heterogéneos y rotos (CSVs/PDFs de CONAGUA/SMN) a un esquema común vía **JSON Schema**, y redacta las recomendaciones para autoridades y ciudadanía. **Nunca inventa un número.**

La robustez se mide con **validación cruzada Leave-One-Out + cobertura del intervalo al 90 %** mediante enmascaramiento artificial de sensores (ocultar estaciones que sí existen, predecir y medir el error).

---

## Datos y contrato de API

| Entrada | Fuente | Frecuencia |
|---|---|---|
| Clima + pronóstico 6 h | Open-Meteo (1 punto, CDMX) | en vivo |
| Lluvia por colonia | Open-Meteo (20 puntos, 1 llamada) | en vivo |
| Lluvia / vulnerabilidad por zona | `live_state.json` (backend del equipo) | configurable |

El frontend resuelve la fuente por **prioridad automática**: `live_state.json` → Open-Meteo multi-punto → 1 punto. El contrato y un ejemplo están en **[`docs/live_state.example.json`](docs/live_state.example.json)** (las claves de `zones` deben coincidir con `ZONES` en `geo.jsx`).

```jsonc
{
  "updated": "2026-06-05T20:30:00-06:00",
  "zones": {
    "Iztapalapa": { "rain_mmh": 14.2, "soil_sat": "saturado", "conf": 0 }
    // ...
  }
}
```

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| **UI** | React 18 (UMD) + JSX compilado en el navegador con Babel Standalone |
| **Mapa** | Leaflet 1.9 · tiles CartoDB Dark Matter |
| **Datos en vivo** | Open-Meteo API (gratis, sin API key) |
| **Hosting** | Vercel (estático) |
| **Backend (equipo)** | Railway → expone `live_state.json` con CORS |

---

## Instalación local

**Requisitos:** Node.js (cualquier versión LTS) — solo para el servidor estático.

```bash
git clone https://github.com/SantiagoArias07/hack-conciencia.git
cd hack-conciencia
npm run dev            # = npx serve . --listen 3000
```

Abre **http://localhost:3000**.

> ⚠️ Debe servirse por **HTTP**, no abrir el `.html` directo: Babel necesita poder hacer `fetch` de los archivos `.jsx`.

---

## Estructura del proyecto

```
hack-conciencia/
├── index.html / FloodSense.html   Entrada + todo el CSS (idénticos; index.html sirve a Vercel)
├── vercel.json                    Configuración de deploy estático
├── js/
│   ├── geo.jsx        Modelo hidrológico, ZONES, malla de hexágonos, fetch de datos reales
│   ├── map.jsx        Mapa Leaflet + overlay de hexágonos + ficha de zona
│   ├── panels.jsx     Panel de clima, panel de parámetros, línea de tiempo, control EN VIVO
│   ├── sections.jsx   Navbar + Inicio + Alertas + Transparencia
│   ├── svgmap.jsx     Mini-mapa SVG (hero y mapa de confianza)
│   └── app.jsx        Estado global y orquestación
└── docs/
    ├── ARQUITECTURA-IA.md        Plan de IA / datos (visión completa)
    └── live_state.example.json   Contrato backend ↔ frontend
```

---

## Roadmap

- [x] Modelo de riesgo por hexágono + simulador interactivo
- [x] Lluvia real y espacial (Open-Meteo, 20 puntos)
- [x] Alertas con recomendaciones generadas por reglas
- [x] Sección de transparencia / confianza del modelo
- [ ] **Backend (Railway):** mini-BD + ingesta → `live_state.json` con `vuln` (INEGI) y pluviómetros (SACMEX)
- [ ] Recomendaciones redactadas por un LLM (en vez de plantillas)
- [ ] Susceptibilidad real desde DEM (HAND/TWI vía Google Earth Engine)
- [ ] Confianza derivada de incertidumbre real (validación LOO-CV) + migración a H3

---

## Equipo

Proyecto desarrollado para un hackathon en la Ciudad de México (2026) · Reto: *Infraestructura Inteligente y Resiliencia Urbana — IA para la predicción de riesgos por inundaciones en entornos con datos limitados.*

---

## Licencia

Distribuido bajo la licencia **MIT**. Consulta el archivo [`LICENSE`](LICENSE) para más detalles.

<div align="center">
<sub>FloodSense · CDMX 2026 · Hecho con la convicción de que ninguna colonia debería quedarse sin aviso.</sub>
</div>
