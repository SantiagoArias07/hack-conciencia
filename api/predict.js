// ============================================================
// FloodSense — Serverless proxy (Vercel) hacia el backend ML (Railway)
// El frontend llama a /api/predict (mismo origen → SIN CORS).
// Este proxy llama a Railway server-to-server (los servidores no tienen CORS).
// Si Railway no responde / no está desplegado → { ok:false, zones:null } y el
// frontend cae al modelo simulado de forma transparente.
// Cambia la URL con la env var BACKEND_PREDICT_URL si el endpoint cambia.
// ============================================================

const PREDICT_URL = process.env.BACKEND_PREDICT_URL
  || "https://hackatonagentes-conciencia-production.up.railway.app/predict";

export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000); // timeout 6s
    const r = await fetch(PREDICT_URL, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
    });
    clearTimeout(timer);

    if (!r.ok) {
      res.status(200).json({ ok: false, reason: "backend_http_" + r.status, zones: null });
      return;
    }
    const data = await r.json();
    if (!data || !data.zones || typeof data.zones !== "object") {
      res.status(200).json({ ok: false, reason: "no_zones", zones: null });
      return;
    }
    // passthrough con la forma que espera fetchBackendState()
    res.status(200).json({ ok: true, timestamp: data.timestamp || null, zones: data.zones });
  } catch (e) {
    res.status(200).json({ ok: false, reason: "unreachable", zones: null });
  }
}
