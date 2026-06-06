// ============================================================
// FloodSense — Serverless (Vercel) · recomendaciones por LLM (Groq)
// La API key vive en process.env.GROQ_API_KEY (NUNCA en el cliente).
// Si no hay key o Groq falla, responde { ok:false } y el frontend
// cae automáticamente a las recomendaciones por plantilla.
// ============================================================

const SYSTEM_PROMPT = `Eres el analista de FloodSense, sistema de alerta de inundaciones para CDMX. Redactas recomendaciones ALTAMENTE PERSONALIZADAS por zona. Demuestra que entiendes los datos (cita lluvia mm/h, susceptibilidad, vulnerabilidad).

Contexto:
- Alto riesgo estructural: Iztapalapa, Tláhuac, Xochimilco (cuencas bajas, drenaje limitado); Neza/Ecatepec (Río de los Remedios).
- Lluvia: >10 mm/h intensa; >30 mm/h torrencial. Nivel_riesgo 1-5.

Reglas ESTRICTAS:
1. Incluye una zona SOLO si su nivel_riesgo >= 3.
2. NUNCA uses la misma estructura de frase dos veces. Evita repetir "La lluvia intensa en X causa inundaciones". Usa sinónimos: precipitaciones, acumulación pluvial, tormenta.
3. PERSONALIZA: Menciona la susceptibilidad de la zona (ej. "por ser cuenca baja", "debido a topografía en declive", "saturación de drenaje").
4. ACCIONES: "Evacúa" solo para nivel 4 o 5. Para nivel 3 usa "Precaución", "Resguarda", "Evita tránsito".

EJEMPLOS DE VARIEDAD ESPERADA (¡Imita este nivel de variedad, no copies el texto!):
- "Riesgo de encharcamiento severo": "Las precipitaciones de 15mm/h rebasarán la capacidad del drenaje. Resguarda tus pertenencias en el segundo piso."
- "Peligro en pasos a desnivel": "Debido a la vulnerabilidad de la zona, evita cruzar puentes hundidos. Desconecta la energía eléctrica."
- "Alerta por saturación lacustre": "La zona baja presenta alta susceptibilidad. Ten a la mano tus documentos en bolsas de plástico."

Devuelve SOLO un JSON válido:
{
  "ciudadanos": [
    {"zona": "Nombre", "nivel": "Alto", "titulo": "Acción directa (2-4 palabras)", "mensaje": "Explicación única basada en los datos (2 frases)."}
  ],
  "autoridades": [
    {"zona": "Nombre", "categoria": "DESPLIEGUE", "titulo": "Acción técnica", "detalle": "Dependencia y razón", "ventana": "Inmediato", "prioridad": 3}
  ]
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

  // 8b-instant: ~5x más cupo diario que 70b (clave para no agotar el free tier) y más rápido.
  // Para mayor calidad y si hay presupuesto: GROQ_MODEL=llama-3.3-70b-versatile
  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

  try {
    const groq = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.85, // Subimos de 0.7 a 0.85 para más creatividad
        presence_penalty: 0.4, // Obliga al modelo a buscar palabras nuevas
        frequency_penalty: 0.4, 
        max_tokens: 2800,
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
      ciudadanos: Array.isArray(parsed.ciudadanos) ? parsed.ciudadanos.slice(0, 14) : [],
      autoridades: Array.isArray(parsed.autoridades) ? parsed.autoridades.slice(0, 14) : [],
    });
  } catch (e) {
    res.status(200).json({ ok: false, reason: "exception", detail: String(e).slice(0, 200) });
  }
}
