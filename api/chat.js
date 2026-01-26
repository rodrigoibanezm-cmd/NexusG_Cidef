export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    body = JSON.parse(body);
  }

  const user_id = body?.user_id;
  const text = body?.text;

  if (!user_id || !text) {
    res.status(400).json({ error: "missing user_id or text" });
    return;
  }

  const UPS_URL = process.env.UPSTASH_REDIS_REST_URL;
  const UPS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  async function getKey(key) {
    const r = await fetch(`${UPS_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${UPS_TOKEN}` }
    });
    const j = await r.json();
    return j?.result ? JSON.parse(j.result) : null;
  }

  const keymap = await getKey("cidef:keymap:v1");

  const context = {};
  await Promise.all(
    Object.entries(keymap).map(async ([alias, key]) => {
      context[alias] = await getKey(key);
    })
  );

  res.status(200).json({
    user_id,
    input: text,
    context
  });
}
