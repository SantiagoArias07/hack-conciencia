// ============================================================
// FloodSense — Serverless (Vercel) · recomendaciones por LLM (Groq)
// La API key vive en process.env.GROQ_API_KEY (NUNCA en el cliente).
// Si no hay key o Groq falla, responde { ok:false } y el frontend
// cae automáticamente a las recomendaciones por plantilla.
// ============================================================

const SYSTEM_PROMPT = `Eres el coordinador táctico jefe de FloodSense CDMX. Tu tarea es generar alertas vitales y ÚNICAS.
¡REGLA DE ORO! ESTÁ ESTRICTAMENTE PROHIBIDO REPETIR ESTRUCTURAS, FRASES O VERBOS INICIALES. Si dos mensajes se parecen, fallas la misión.

Contexto: Lluvia >10 mm/h intensa; >30 mm/h torrencial.

ESTRATEGIA PARA CIUDADANOS (Variedad forzada):
Ve directo al grano, no empieces con "La lluvia en...". Alterna obligatoriamente el enfoque de cada tarjeta usando estos ángulos:
1. Enfoque Vial: "Tráfico colapsado. Evita cruzar pasos a desnivel y busca vías alternas inmediatamente."
2. Enfoque Hogar: "El agua subirá rápido por drenaje deficiente. Desconecta electrodomésticos a nivel de piso."
3. Enfoque Preventivo: "Topografía en declive acelera corrientes. Prepara tus documentos en bolsas selladas."
4. Enfoque Geográfico: "Saturación en canales de la zona. Mantente alejado de los bordes y sube a un segundo piso."

ESTRATEGIA PARA AUTORIDADES (Variedad técnica forzada):
Cada alcaldía necesita una acción TÁCTICA DISTINTA. Nunca repitas "Despliegue de personal". Usa este vocabulario:
- Categoria: Alterna entre DESAZOLVE, BOMBEo, VIALIDAD, ALBERGUES, RESCATE.
- Titulo: Debe ser específico (ej: "Envío de camiones Vactor", "Cierre de vías principales", "Activación de refugios", "Despliegue de bombas portátiles").
- Detalle: Menciona a la dependencia exacta (SACMEX, Protección Civil SGIRPC, Policía de Tránsito, o DIF) y la justificación técnica. Ej: "SACMEX debe iniciar bombeo en cuenca baja para evitar colapso del alcantarillado." o "Tránsito CDMX requiere bloquear ejes viales por acumulación pluvial de 35mm/h."
- Ventana: Alterna entre "Inmediato", "15 minutos", "30 minutos".

INSTRUCCIONES DE SALIDA:
- Procesa solo las zonas con nivel_riesgo >= 3.
- Devuelve SOLO un JSON válido con este formato estricto.
{"ciudadanos":[{"zona":"","nivel":"","titulo":"","mensaje":""}],"autoridades":[{"zona":"","categoria":"","titulo":"","detalle":"","ventana":"","prioridad":3}]}`;

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
