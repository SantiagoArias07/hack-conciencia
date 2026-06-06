# FloodSense — Arquitectura de IA para datos reales sobre la malla hexagonal

> Documento de decisión (no implementado todavía — es el plan). Integra una crítica adversarial:
> la lluvia ya no se basa en IMERG sino en los pluviómetros de SACMEX; las etiquetas de `sus` se
> separan de `vuln`; el LLM de ingesta y la confianza cuantificada se vuelven el núcleo del pitch;
> SAR/IMERG/GNN pasan a visión; y las brechas de datos se declaran como honestidad, no se tapan.

---

## 1. La gran idea (narrativa de pitch)

**FloodSense es un gemelo digital probabilístico de inundación urbana que convierte datos públicos
incompletos y heterogéneos (DEM Copernicus, censo INEGI, OSM, red pluviométrica de SACMEX) en las
entradas por-hexágono del modelo, mostrando explícitamente qué es real, qué es imputado y con cuánta
confianza.** No es otro modelo hidráulico: el acto de IA está en *fusionar fuentes dispares e imputar
lo ausente con incertidumbre cuantificada y auditada* (LOO-CV + cobertura del intervalo al 90%), y en
un agente Claude que vuelve usable el dato que "existe pero está roto" (CSVs y PDFs de CONAGUA/SMN).
En un reto de "datos limitados", la ventaja no es fingir precisión que no podemos probar, sino medir y
mostrar la incertidumbre que nadie más cuantifica.

---

## 2. Mapeo dataset → entrada del modelo

Las entradas son exactamente las que consume el código real: `hex.sus`, `hex.vuln`, `hex.elev`, y los
multiplicadores dinámicos `rainMmh`, `drainage`, `soilSat`, `canalLevel` de `hexRisk()`.

| Entrada de FloodSense | Dataset(s) fuente | Método de IA | Real / Modelado / Imputado | Frecuencia |
|---|---|---|---|---|
| **`sus`** (susceptibilidad física por-hex) | DEM **Copernicus GLO-30** → HAND, TWI, pendiente; **Sentinel-2** → `imperv_frac`; **OSM** → `dist_canal`, `drain_density` | Fusión ponderada + **regresión logística regularizada** (no RF) calibrada con etiqueta **física** (frecuencia de agua SAR), no con reportes ciudadanos | **Modelado** (físico) | Estático (batch) |
| **`vuln`** (vulnerabilidad social por-hex) | **INEGI Censo 2020 por AGEB** (hacinamiento, % sin drenaje, dependencia, marginación) | Join espacial AGEB→hex ponderado por área; índice min-max o PCA; huecos por **k-NN espacial** | **Real** (censal) | Estático |
| **`elev`** (elevación) | DEM Copernicus GLO-30 | Media zonal por hex (`rasterstats`) | **Real** | Estático |
| **`rainMmh`** (lluvia por-hex) | **Pluviómetros SACMEX** primario; **Open-Meteo** respaldo (ya integrado) | **Kriging / IDW** de estaciones a centroides; sigma de kriging por-hex | **Real** cerca de sensor; **Imputado** lejos | En vivo (cron 10-15 min) |
| **`soilSat`** (control sembrado) | API de lluvia antecedente (pluviómetros + Open-Meteo); **ERA5-Land** soil moisture (offline) | Antecedent Precipitation Index → `seco/normal/saturado` | **Modelado** (valor inicial; el usuario lo ajusta) | En vivo |
| **`canalLevel`** (escenario) | — (sin telemetría pública de cárcamos en vivo) | — | **Escenario del usuario — brecha declarada** | Manual |
| **`drainage`** (control sembrado) | OSM `man_made=storm_drain`, `drain_density` | Densidad de drenaje OSM → prior de categoría | **Modelado** (valor inicial) | Estático |
| **`conf_*`** (confianza por-campo) | Todas | Distancia al dato real + varianza de kriging/bootstrap + completitud; validado por **LOO-CV** | **Métrica derivada** | Estático + en vivo |

> **Nota de honestidad:** **IMERG/GPM queda fuera del campo dinámico de lluvia.** A 0.1° (~10 km) y
> hexágonos de ~2.2 km, un píxel IMERG cubre ~40 hexágonos: sería lluvia constante repetida, no lluvia
> por-hex. IMERG solo en visión, para climatología de fondo, nunca como "alta resolución por-hex".

---

## 3. Arquitectura por capas

### (A) Ingesta
- **Estático (offline, 1 vez, versionado):** Python + Google Earth Engine. DEM GLO-30, Sentinel-2,
  INEGI AGEB, OSM (osmnx/Overpass). Salida: `hexes_static.json` con el **mismo shape que `HEXES`**.
- **Dinámico (worker/cron 10-15 min):** fetch de **pluviómetros SACMEX** + **Open-Meteo** → un único
  `live_state.json`. **El frontend nunca llama APIs externas directo.**
- **Agéntico (frontera de datos):** `ingest_agent.py`, agente Claude que normaliza fuentes sucias.

**Regla de borde:** la malla **no es H3** — es axial casera (`R=0.0205`) con hexágonos de borde
degradados (`edgeFade`, filtro `f.nd > 0.135`). El script offline **no reescribe `buildHexes()`**:
exporta los `vertsLL` existentes a GeoJSON y hace `reduceRegions`/`rasterstats` sobre **esos**
polígonos. Hexágonos con `edgeFade < 0.4` reciben `conf = 2` automático.

### (B) Interpretación / normalización con IA
- **Rejilla como denominador común:** cada raster/vector/punto se rebinea a los ~532 hexágonos.
- **Derivación física de `sus`:** HAND (altura sobre el cauce = "cuenca baja/mal drenaje"), TWI (dónde
  converge el agua), pendiente, `imperv_frac` (NDBI/NDVI).
- **Calibración interpretable:** pesos de `sus` con **regresión logística regularizada (L2)**, no RF —
  con 5-6 covariables y etiquetas escasas, RF sobreajusta. Reporta importancias con IC por bootstrap.
- **Normalización de unidades/CRS:** el agente Claude propone mapeo `columna→canónica`, `unidad→SI`,
  detecta `-9999`→nulo, infiere CRS; **código Python valida rangos físicos y ejecuta.**

### (C) Imputación de datos faltantes + incertidumbre (el corazón del reto)

| Caso | Método | Salida de incertidumbre |
|---|---|---|
| `sus`/`vuln` con features faltantes | Logística/RF sobre covariables siempre disponibles | spread de bootstrap → `sigma_sus` |
| **Lluvia** (campo continuo) | **Kriging** (o KED: tendencia=Open-Meteo, residuo=SACMEX) | sigma de kriging → `sigma_rain` |
| `vuln` con AGEBs sin dato | **k-NN espacial** | distancia al vecino |
| Propagación por cuenca | **GNN GraphSAGE** sobre hexágonos contiguos | **Visión, no MVP** |

**Activo más fuerte — enmascaramiento artificial:** se ocultan hexágonos que sí tienen pluviómetro, se
predice, se mide el error. Fabrica muchos ejemplos de "sin dato" desde pocos sensores y produce la
métrica reportable: **LOO-CV RMSE + cobertura del intervalo al 90%**.

### (D) Salida a la simulación por-hex
```
hexes_static.json  →  buildHexes() hace fetch en vez de sampleField() sintético
live_state.json    →  inyecta rain_mmh / valores sembrados de soilSat, drainage
                      hexRisk() y computeState() SIN CAMBIOS — el contrato se respeta
```
El objeto `hex` se extiende sin romper nada (campos nuevos con +):
```
hex = {
  id, lng, lat, vertsLL, zone, edgeFade, noise, R,   // geometría existente, intacta
  sus, vuln, elev,                                   // estático, ahora derivado de física
  + imperv_frac, twi, hand, dist_canal, drain_density,
  + rain_mmh, soil_sat_val,                           // dinámico (canal_level = escenario)
  conf, + conf_sus, conf_vuln, conf_rain,            // confianza REAL por-campo
  + source_flags, sigma_sus, sigma_rain, ts
}
```

---

## 4. Dónde encaja el LLM/agente vs. la IA predictiva

**Principio rector: DOS IAs distintas. El LLM NUNCA inventa un número** (ni lluvia, ni `sus`, ni riesgo).

- **IA predictiva (números) — el motor:** kriging, logística regularizada, RF para imputación, índices
  físicos (HAND/TWI), API de lluvia antecedente. Todo lo cuantitativo.
- **IA generativa (interpretación) — el agente Claude:**
  - **4a. Ingesta agéntica (el diferenciador más fuerte).** Mucho dato público mexicano *existe pero es
    inusable*: CSVs de CONAGUA/SIH con encabezados inconsistentes, PDFs del SMN, shapefiles sin `.prj`,
    encoding roto. Agente Claude con **tool-use + JSON Schema estricto** mapea origen→canónico, unidad→SI,
    `-9999`→nulo. **Después Python valida y ejecuta:** el LLM *propone*, el código *verifica*. Habilita la
    **escalabilidad** (Monterrey = darle al agente las URLs de sus datos abiertos). **Demostrable en vivo:**
    toma un CSV feo real de SIH/CONAGUA y muéstralo normalizándose.
  - **4b. Capa generativa de salida.** El modelo entrega **importancias/SHAP** → Claude las *narra*, no las
    calcula: *"este hexágono es de alto riesgo porque HAND=2m + drenaje deficiente + suelo saturado"*. Con
    RAG sobre protocolos de Protección Civil CDMX, genera recomendaciones ciudadanía vs. autoridades en JSON.

> **Coherencia de demo:** la sección Alertas hoy usa `COLONIAS` hardcodeado con texto inventado. Si el
> pitch dice "ya no es inventado", esto contradice en vivo. **Conectar las tarjetas al ranking real de
> `zoneScores`** o quitar el texto a mano.

---

## 5. Manejo de escasez de datos (el diferenciador) — la TESIS, no una capa

**Cuantifica la escasez con un número:** "N pluviómetros SACMEX para ~1,500 km² del Valle, densidad de 1
cada Z km²; el A% de los hexágonos está a >2 km del sensor más cercano." Ese número justifica toda la IA.

**Método central — separación física vs. social (la fuga que un juez de ML ataca):**
- Las etiquetas de encharcamiento (Locatel/SACMEX) están **sesgadas por reporte ciudadano**,
  proporcional a población = `vuln`. Entrenar `sus` con ellas **contamina `sus` con `vuln`**.
- **Defensa:** etiquetar `sus` con **frecuencia de agua observada por SAR** (física); normalizar reportes
  per cápita antes de validar `vuln`. Reportar la correlación residual `sus`↔`vuln` en Transparencia.

**Cómo se muestra la confianza (sección Transparencia):**
- Hoy `hex.conf` (0/1/2) es **sintético** (`hashNoise`). Se vuelve **real y por-campo**:
  `conf_campo = f(distancia al dato real, sigma de kriging/bootstrap, completitud, source_flags)`.
- `CONF_COLORS`/`CONF_NAMES` ya existen — solo cambia su *origen*.
- **Titular del pitch:** la métrica **LOO-CV RMSE + cobertura al 90%** va primero: *"predecimos lluvia en
  hexágonos sin sensor con RMSE de X mm/h, y nuestro intervalo al 90% captura el valor real el Y% de las
  veces"*. Sin verdad-terreno limpia, **no reclamar "precisión"** — reclamar "incertidumbre cuantificada".

---

## 6. Tiempo real vs. precómputo

| Capa | Naturaleza | Cadencia |
|---|---|---|
| `sus`, `vuln`, `elev`, terreno (HAND/TWI/imperv), `dist_canal` | **Precómputo offline** (`hexes_static.json`) | Meses / por evento |
| Explicaciones por-hex (SHAP narrado) | **Precómputo offline** | Por release |
| Validación SAR / `freq_inundacion` | **Precómputo offline** (PNG/raster) | Por evento |
| `rain_mmh` (SACMEX + Open-Meteo → kriging) | **Tiempo real** (worker/cron) | 10-15 min |
| `soilSat` (API antecedente) | **Tiempo real** (valor sembrado) | Por ciclo |
| `canalLevel`, `drainage` | **Escenario del usuario** | Manual |

**Robustez:** **CONAGUA/SIH se actualiza SEMANALMENTE** → es fuente offline de calibración, NO va en el
loop de minutos. El loop dinámico es **solo SACMEX + Open-Meteo**, con **cache-first + TTL +
stale-while-revalidate** (si una fuente cae, sirve el último snapshot con badge "datos con N min de
antigüedad" y baja `conf_rain`) y **circuit breaker por fuente** → nunca un `null` que rompa `hexRisk()`.

---

## 7. Roadmap

### MVP de hackathon (construible YA, 1-2 días) — 6 entregables
1. **`build_static.py`** offline: DEM Copernicus GLO-30 → **HAND/TWI** (GEE) sobre los `vertsLL`
   exportados → reemplaza `sus` inventado. *"Ya no es inventado, es física del terreno".*
2. **INEGI AGEB → `vuln`** por join areal (`geopandas.overlay`). `conf_vuln = 0`.
3. **OSM (osmnx) → `dist_canal`, `drain_density`** → siembra el control `drainage`.
4. **Lluvia real:** Open-Meteo (ya funciona) + pluviómetros SACMEX, kriging/IDW a centroides →
   `live_state.json` con cache-first y badge de frescura.
5. **Mapa de confianza REAL** en Transparencia: distancia-al-dato + bootstrap, validado con **LOO-CV**.
6. **Agente Claude** parseando **un CSV real feo de SIH/CONAGUA** → JSON contra schema → validación Python.

Frontend: solo cambia el origen de datos de `buildHexes()`. **Cero cambios en `hexRisk()`/`computeState()`.**

**CORTAR del MVP (slide de visión):** SAR/Sentinel-1 en vivo (déjalo como PNG precomputado), IMERG,
RF-kriging near-real-time, GNN, flow-accumulation upstream para canales.

| Dataset | Impacto | Esfuerzo | Decisión |
|---|---|---|---|
| Open-Meteo | Alto | Nulo (ya integrado) | MVP |
| INEGI AGEB → vuln | Alto | Bajo | MVP |
| DEM GLO-30 → HAND/TWI | Muy alto | Bajo (GEE) | MVP |
| Pluviómetros SACMEX | Muy alto | Medio (scraping) | MVP |
| OSM (osmnx) | Medio | Bajo | MVP |
| CSV CONAGUA/SIH (vía agente) | Alto (narrativa) | Bajo-medio | MVP (1 archivo) |
| Sentinel-1 SAR | Alto (validación) | Alto | Visión (PNG) |
| IMERG/GPM | Bajo para por-hex | Medio | Visión (climatología) |

### Visión completa
GNN GraphSAGE para propagación por cuenca; SAR para inundación activa (gemelo digital por evento); InSAR
para subsidencia; RF-kriging near-real-time + Quantile Mapping; nowcasting (ConvLSTM/Kalman); PostGIS +
GeoParquet + Airflow/Prefect; ERA5 para escenarios P10/P50/P90 (hoy `SCEN` fijo); active learning (pedir
datos donde la incertidumbre es máxima); telemetría de cárcamos SACMEX para `canalLevel`; migración a H3 res-8.

---

## 8. Riesgos y mitigación

| Riesgo | Por qué duele | Mitigación |
|---|---|---|
| "Lluvia satelital por-hex" indefendible | IMERG 10 km vs hex 2.2 km | Primario = SACMEX; IMERG solo climatología |
| Fuga `sus`↔`vuln` | Etiquetas sesgadas por población | Etiquetar `sus` con SAR; reportes per cápita; reportar correlación |
| "Hidráulica con barniz de IA" | HAND/TWI son hidrología clásica | Nombrar la IA: fusión + imputación + agente de ingesta |
| Cadencia inconsistente | CONAGUA es semanal | CONAGUA offline; loop = SACMEX + Open-Meteo |
| `canalLevel` sin validación | Sin telemetría pública | Declararlo escenario + brecha conocida |
| Constantes mágicas (`*156`, `DRAIN_MULT`) | Siguen inventadas | Defender como elasticidades calibrables |
| Reclamar "precisión" | Sin verdad-terreno limpia | Reclamar "incertidumbre cuantificada", LOO-CV |
| Decir "H3" cuando no lo es | Malla axial casera | "Malla hexagonal de ~532 celdas, migrable a H3" |
| Incoherencia en Alertas | `COLONIAS` hardcodeado | Conectar a `zoneScores` o quitar texto |
| Agente LLM como vaporware | Si solo se describe | Demostrarlo en vivo con CSV real |

---

**Artefactos nuevos a crear (cuando se implemente):**
- `build_static.py` — offline → `hexes_static.json` (mismo shape que `HEXES`)
- worker `fetch_live.js` / cron — SACMEX + Open-Meteo → `live_state.json`
- `ingest_agent.py` — agente Claude de parseo con JSON Schema + validación Python

*Generado por un panel multi-agente (5 lentes: geoespacial, imputación-ML, ingeniería de datos, LLM/agente,
pragmático-pitch) → síntesis → crítica adversarial → documento final. Los agentes leyeron `geo.jsx` real.*
