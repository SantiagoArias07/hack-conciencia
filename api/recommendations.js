// ============================================================
// FloodSense — Serverless (Vercel) · recomendaciones por LLM (Groq)
// La API key vive en process.env.GROQ_API_KEY (NUNCA en el cliente).
// Si no hay key o Groq falla, responde { ok:false } y el frontend
// cae automáticamente a las recomendaciones por plantilla.
// ============================================================

const SYSTEM_PROMPT = `Eres el asistente de FloodSense, un sistema de alerta temprana de inundaciones para la Ciudad de México. Generas recomendaciones a partir de datos de riesgo por zona.

Contexto del sistema:
- Temporada de lluvias en CDMX (junio-septiembre).
- Zonas de alto riesgo estructural: Iztapalapa, Tláhuac, Xochimilco (cuencas bajas, drenaje limitado).
- Lluvia intensa se define como mayor a 10 mm/h. Lluvia torrencial mayor a 30 mm/h.
- nivel_riesgo va de 1 (muy bajo) a 5 (muy alto).
- vuln es vulnerabilidad social de 0 a 1 (1 = más vulnerable).

Recibirás un JSON con "contexto" (lluvia, índice compuesto) y "zonas" (cada una: zona, alcaldia, nivel_riesgo, vuln, rain_mmh).

Reglas para tus mensajes:
- Ciudadanos: lenguaje simple, acción concreta, máximo 15 palabras por mensaje.
- Autoridades: técnico, específico, incluye ventana de tiempo para actuar.
- Si nivel_riesgo >= 4 y vuln >= 0.7: prioridad máxima.
- Nunca inventes zonas que no estén en los datos.
- Si no hay zonas en riesgo (todas con nivel_riesgo <= 2), devuelve listas vacías.

Devuelve SOLO un objeto JSON válido con esta forma EXACTA (sin texto extra):
{
  "ciudadanos": [ { "zona": string, "nivel": number, "mensaje": string } ],
  "autoridades": [ { "zona": string, "categoria": string, "titulo": string, "detalle": string, "ventana": string, "prioridad": number } ]
}
- "categoria" en MAYÚSCULAS, 1-2 palabras (ej. PROTOCOLO, DESPLIEGUE, CANALES, ALERTAMIENTO, ALBERGUES, MONITOREO).
- "prioridad": 3 = alta, 2 = media, 1 = monitoreo.
- Máximo 4 elementos por lista, ordenados de mayor a menor prioridad/nivel.`;

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
        temperature: 0.4,
        max_tokens: 1200,
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
      ciudadanos: Array.isArray(parsed.ciudadanos) ? parsed.ciudadanos.slice(0, 4) : [],
      autoridades: Array.isArray(parsed.autoridades) ? parsed.autoridades.slice(0, 4) : [],
    });
  } catch (e) {
    res.status(200).json({ ok: false, reason: "exception", detail: String(e).slice(0, 200) });
  }
}
