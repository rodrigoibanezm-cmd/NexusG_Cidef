export default async function handler(req, res) {
  const hasKV =
    !!process.env.KV_REST_API_URL &&
    !!process.env.KV_REST_API_TOKEN;

  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  res.status(200).json({
    ok: true,
    kv: hasKV,
    openai: hasOpenAI,
    ts: new Date().toISOString(),
  });
}
