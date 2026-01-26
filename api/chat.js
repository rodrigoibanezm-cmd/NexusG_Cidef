export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { user_id, text } = req.body || {};
  if (!user_id || !text) {
    return res.status(400).json({ error: "missing user_id or text" });
  }

  const UPS_URL = process.env.UPSTASH_REDIS_REST_URL;
  const UPS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  async function getKey(key) {
    const r = await fetch(`${UPS_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${UPS_TOKEN}` }
    });
    if (!r.ok) throw new Error(`Upstash error ${r.status}`);
    const j = await r.json();
    return j?.result ? JSON.parse(j.result) : null;
  }

  // 1) cargar keymap
  const keymap = await getKey("cidef:keymap:v1");

  // 2) cargar todas las keys
  const data = {};
  for (const [alias, key] of Object.entries(keymap)) {
    data[alias] = await getKey(key);
  }

  // 3) devolver todo al GPT
  return res.status(200).json({
    user_id,
    input: text,
    context: data
  });
}
