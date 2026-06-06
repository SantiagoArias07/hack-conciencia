// ============================================================
// FloodSense — Serverless (Vercel) · recomendaciones por LLM (Groq)
// La API key vive en process.env.GROQ_API_KEY (NUNCA en el cliente).
// Si no hay key o Groq falla, responde { ok:false } y el frontend
// cae automáticamente a las recomendaciones por plantilla.
// ============================================================

const SYSTEM_PROMPT = `Eres el analista de FloodSense, sistema de alerta de inundaciones para CDMX. Redactas recomendaciones PERSONALIZADAS por zona y demuestras que entiendes los datos (cita lluvia mm/h, susceptibilidad, vulnerabilidad).

Contexto:
- Alto riesgo estructural: Iztapalapa, Tláhuac, Xochimilco (cuencas bajas, drenaje limitado); Neza/Ecatepec/Chimalhuacán (cuenca cerrada, Río de los Remedios).
- Lluvia intensa >10 mm/h; torrencial >30 mm/h. nivel_riesgo 1-5. vuln 0-1 (1=más vulnerable). susceptibilidad_fisica 0-1 (alta=cuenca baja/drenaje deficiente; baja=terreno elevado).

Recibes JSON {contexto, zonas:[{zona,alcaldia,nivel_riesgo,vuln,rain_mmh,elevacion_m,susceptibilidad_fisica}]}.

CUÁNDO alertar:
- Incluye una zona SOLO si su nivel_riesgo >= 3. Susceptibilidad alta SIN lluvia NO es alerta; si lluvia ~0 (<3) y nivel<=2, omítela y nunca digas "evacúa".
- Si NINGUNA zona tiene nivel_riesgo >= 3, devuelve {"ciudadanos":[],"autoridades":[]}.
- Incluye SIEMPRE todas las rojas (nivel>=4); si hay pocas, agrega naranjas (nivel 3).

PERSONALIZA y VARÍA:
- Cita la lluvia real y di si es intensa/torrencial. Si susceptibilidad>=0.8: menciona drenaje deficiente/cuenca baja/lecho lacustre. Si elevación alta con riesgo medio: di que está elevado, peligro menor, mantener la calma.
- Varía la ESTRUCTURA de cada mensaje (unos por la acción, otros por la geografía de la zona, otros por el tiempo). NO empieces todas igual ni con "La lluvia en tu zona es de X". Cada título único; nunca repitas frases.

CIUDADANOS {zona,nivel,titulo,mensaje}: titulo=acción corta (2-5 palabras); mensaje=2 frases sencillas que explican por qué y dan pasos concretos (rutas a evitar, no estacionar en zonas bajas, subir pertenencias, documentos en bolsa, cargar el celular).
AUTORIDADES {zona,categoria,titulo,detalle,ventana,prioridad}: detalle=2-3 frases técnicas (qué recurso, dónde, por qué, con qué dependencia: SACMEX/Protección Civil/SMN/CONAGUA/alcaldía/Cruz Roja/DIF); categoria MAYÚSCULAS 1-2 palabras (PROTOCOLO,DESPLIEGUE,CANALES,INFRAESTRUCTURA,ALERTAMIENTO,ALBERGUES,MONITOREO,EVACUACIÓN); ventana="Inmediato"/"1 hora"/"2 horas"/"Continuo"; prioridad 1-3 (3 si nivel>=4 y vuln>=0.7).

Nunca inventes zonas fuera de los datos. Ordena por prioridad/nivel desc. Máximo 8 por lista.
Devuelve SOLO JSON válido: {"ciudadanos":[{"zona","nivel","titulo","mensaje"}],"autoridades":[{"zona","categoria","titulo","detalle","ventana","prioridad"}]}`;

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
        temperature: 0.7,
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
