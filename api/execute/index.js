// PATH: /api/execute/index.js
// LINES: 55

export default async function handler(req, res) {
  const trace_id = String(req.body?.trace_id || "trace_unknown")

  if (req.method !== "POST") {
    return res.status(405).end()
  }

  const { topic, models, use_case } = req.body || {}

  if (!topic || !Array.isArray(models)) {
    return res.status(400).json({ error: "BAD_REQUEST" })
  }

  const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

  async function kvGet(key) {
    const r = await fetch(`${URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    })
    const j = await r.json()
    return j?.result ?? null
  }

  const data = []

  for (const model of models) {
    const key = use_case
      ? `${topic}:${model}:${use_case}`
      : `${topic}:${model}`

    const payload = await kvGet(key)
    if (payload) data.push({ modelo: model, payload })
  }

  return res.status(200).json({
    topic,
    data
  })
}
