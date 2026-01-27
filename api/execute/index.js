// PATH: /api/execute/index.js
// LINES: ~190

module.exports = async function handler(req, res) {
  const trace_id = String((req.body && req.body.trace_id) || (req.query && req.query.trace_id) || "trace_unknown");

  if (req.method !== "POST") {
    return res.status(405).json({
      trace_id,
      status: "ERROR",
      topic: "ficha",
      data: [],
      missing: [],
      error: { code: "METHOD_NOT_ALLOWED", message: "Use POST" }
    });
  }

  const topic = (req.body && req.body.topic) || null;
  const models = Array.isArray(req.body && req.body.models) ? req.body.models.filter(Boolean) : [];
  const use_case = (req.body && Object.prototype.hasOwnProperty.call(req.body, "use_case")) ? req.body.use_case : null;

  if (!topic || !["comercial", "ficha", "cliente", "mitos"].includes(topic)) {
    return res.status(400).json({
      trace_id,
      status: "ERROR",
      topic: "ficha",
      data: [],
      missing: [],
      error: { code: "BAD_REQUEST", message: "Invalid topic" }
    });
  }

  if (topic !== "mitos" && models.length === 0) {
    return res.status(400).json({
      trace_id,
      status: "ERROR",
      topic,
      data: [],
      missing: [],
      error: { code: "BAD_REQUEST", message: "models is required when topic != mitos" }
    });
  }

  const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!URL || !TOKEN) {
    return res.status(500).json({
      trace_id,
      status: "ERROR",
      topic,
      data: [],
      missing: [],
      error: {
        code: "MISSING_ENV",
        message: "Missing KV_REST_API_URL/KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN)"
      }
    });
  }

  function normalizeSlug(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/[\s\-]+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .replace(/_+/g, "_");
  }

  function resolveKey(nonMitosTopic, modelSlug) {
    if (nonMitosTopic === "ficha") return `cidef:fichas:v1:ft_v1_${modelSlug}`;
    if (nonMitosTopic === "comercial") return `cidef:comercial:v1:comercial_v1_${modelSlug}`;
    if (nonMitosTopic === "cliente") return `cidef:clientes:v1:cliente_v1_${modelSlug}`;
    throw new Error("Invalid non-mitos topic");
  }

  function pickMitosKey(uc) {
    const s = String(uc || "").toLowerCase();
    const hasChina = s.includes("china");
    const hasEv = s.includes("ev") || s.includes("electrico") || s.includes("eléctrico");

    if (hasChina && hasEv) return { key: "cidef:mitos:v1:mitos_v1_ev_china", label: "china_ev" };
    if (hasChina) return { key: "cidef:mitos:v1:mitos_v1_china", label: "china" };
    if (hasEv) return { key: "cidef:mitos:v1:mitos_v1_ev", label: "ev" };
    return null;
  }

  async function kvGetJson(key) {
    const r = await fetch(`${URL}/get/${encodeURIComponent(key)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    if (!r.ok) throw new Error(`KV HTTP ${r.status}`);

    const j = await r.json();
    const raw = j && Object.prototype.hasOwnProperty.call(j, "result") ? j.result : null;
    if (raw == null) return null;

    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
    return raw;
  }

  try {
    const missing = [];
    const data = [];

    if (topic === "mitos") {
      const picked = pickMitosKey(use_case);
      if (!picked) {
        return res.status(400).json({
          trace_id,
          status: "ERROR",
          topic,
          data: [],
          missing: [],
          error: { code: "BAD_REQUEST", message: 'use_case must indicate "china", "ev", or both for topic=mitos' }
        });
      }

      const payload = await kvGetJson(picked.key);
      if (payload == null) {
        missing.push(picked.key);
        return res.status(200).json({
          trace_id,
          status: "NO_DATA",
          topic,
          data: [{ modelo: null, payload: null }],
          missing
        });
      }

      return res.status(200).json({
        trace_id,
        status: "OK",
        topic,
        data: [{ modelo: null, payload }],
        missing: []
      });
    }

    for (const m of models) {
      const slug = normalizeSlug(m);
      const key = resolveKey(topic, slug);

      const payload = await kvGetJson(key);
      if (payload == null) {
        missing.push(key);
        data.push({ modelo: m, payload: null });
      } else {
        data.push({ modelo: m, payload });
      }
    }

    return res.status(200).json({
      trace_id,
      status: missing.length > 0 ? "NO_DATA" : "OK",
      topic,
      data,
      missing
    });
  } catch (e) {
    return res.status(500).json({
      trace_id,
      status: "ERROR",
      topic,
      data: [],
      missing: [],
      error: { code: "EXECUTE_FAILED", message: e && e.message ? e.message : "Unknown error" }
    });
  }
};
