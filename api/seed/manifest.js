export const config = {
  api: { bodyParser: false } // CLAVE
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { key } = req.query;
  if (!key) return res.status(400).json({ error: "missing key" });

  // Leer body crudo
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString("utf8");

  const r = await fetch(
    `${process.env.UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json"
      },
      body
    }
  );

  const txt = await r.text();
  return res.status(200).send(txt);
}
