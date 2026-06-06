// ============================================================
// FloodSense — Serverless (Vercel) · recomendaciones por LLM (Groq)
// La API key vive en process.env.GROQ_API_KEY (NUNCA en el cliente).
// Si no hay key o Groq falla, responde { ok:false } y el frontend
// cae automáticamente a las recomendaciones por plantilla.
// ============================================================

const SYSTEM_PROMPT = `Eres el analista de FloodSense, un sistema de alerta temprana de inundaciones para la Ciudad de México. Analizas el estado de riesgo por zona y redactas recomendaciones claras, PERSONALIZADAS y bien fundamentadas. Debes demostrar que entiendes los datos del mapa: cita la lluvia (mm/h) y di si es intensa o torrencial, la vulnerabilidad social, y el riesgo estructural de la zona.

Contexto del sistema:
- Temporada de lluvias en CDMX (junio-septiembre).
- Zonas de alto riesgo estructural: Iztapalapa, Tláhuac, Xochimilco (cuencas bajas, drenaje limitado). Nezahualcóyotl/Ecatepec/Chimalhuacán (cuenca cerrada, Río de los Remedios).
- Lluvia intensa: mayor a 10 mm/h. Lluvia torrencial: mayor a 30 mm/h.
- nivel_riesgo va de 1 (muy bajo) a 5 (muy alto).
- vuln es vulnerabilidad social de 0 a 1 (1 = más vulnerable).

Recibirás un JSON con "contexto" (lluvia, índice compuesto) y "zonas" (cada una: zona, alcaldia, nivel_riesgo, vuln, rain_mmh).

GENERA UNA RECOMENDACIÓN POR CADA ZONA con nivel_riesgo >= 3 (en ambas listas), más acciones transversales para autoridades. Apunta a entre 5 y 10 elementos por lista cuando haya suficientes zonas. Cada tarjeta debe ser DISTINTA y específica de su zona — nada genérico, nada repetido como "Evacúa ahora" en todas.

CIUDADANOS — objeto { "zona", "nivel", "titulo", "mensaje" }:
- "titulo": acción principal corta (2-5 palabras), ej. "Evita Eje 8 Sur hoy".
- "mensaje": 2 frases claras y empáticas que EXPLICAN por qué (menciona la lluvia y el riesgo de la zona) y dan pasos concretos: rutas/avenidas a evitar, no estacionar en zonas bajas, subir pertenencias, preparar documentos en bolsa, cargar el celular, tener número de emergencias. Lenguaje sencillo, sin tecnicismos.

AUTORIDADES — objeto { "zona", "categoria", "titulo", "detalle", "ventana", "prioridad" }:
- "detalle": 2-3 frases técnicas y específicas: qué recurso desplegar, dónde exactamente, por qué según los datos (lluvia mm/h, vulnerabilidad, infraestructura), y con qué dependencia coordinar (SACMEX, Protección Civil CDMX, SMN, CONAGUA, alcaldía, Cruz Roja, DIF).
- "categoria" en MAYÚSCULAS, 1-2 palabras (PROTOCOLO, DESPLIEGUE, CANALES, INFRAESTRUCTURA, ALERTAMIENTO, ALBERGUES, MONITOREO, EVACUACIÓN).
- "ventana": tiempo para actuar ("Inmediato", "1 hora", "2 horas", "Continuo").
- "prioridad": 3 = alta, 2 = media, 1 = monitoreo. Usa 3 cuando nivel_riesgo >= 4 y vuln >= 0.7.

Reglas:
- Nunca inventes zonas que no estén en los datos.
- Si NINGUNA zona tiene nivel_riesgo >= 3, devuelve ambas listas vacías.
- Ordena de mayor a menor prioridad/nivel.

Devuelve SOLO un objeto JSON válido (sin texto extra) con esta forma EXACTA:
{
  "ciudadanos": [ { "zona": string, "nivel": number, "titulo": string, "mensaje": string } ],
  "autoridades": [ { "zona": string, "categoria": string, "titulo": string, "detalle": string, "ventana": string, "prioridad": number } ]
}`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, reason: "method" });
    return;
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    // sin key configurada → el frontend usará plantillas
    res.status(200).json({ ok: false, reason: "no_key" });
    return;
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    res.status(200).json({ ok: false, reason: "bad_body" });
    return;
  }

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  try {
    const groq = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        max_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(body) },
        ],
      }),
    });

    if (!groq.ok) {
      const txt = await groq.text().catch(() => "");
      res.status(200).json({ ok: false, reason: "groq_http", status: groq.status, detail: txt.slice(0, 300) });
      return;
    }

    const data = await groq.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "{}";

    let parsed;
    try { parsed = JSON.parse(content); } catch (e) {
      res.status(200).json({ ok: false, reason: "parse" });
      return;
    }

    res.status(200).json({
      ok: true,
      model,
      ciudadanos: Array.isArray(parsed.ciudadanos) ? parsed.ciudadanos.slice(0, 10) : [],
      autoridades: Array.isArray(parsed.autoridades) ? parsed.autoridades.slice(0, 10) : [],
    });
  } catch (e) {
    res.status(200).json({ ok: false, reason: "exception", detail: String(e).slice(0, 200) });
  }
}
