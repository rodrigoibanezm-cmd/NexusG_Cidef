export default async function handler(req, res) {
  const hasUpstash =
    !!process.env.UPSTASH_REDIS_REST_URL &&
    !!process.env.UPSTASH_REDIS_REST_TOKEN;

  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  res.status(200).json({
    ok: true,
    upstash: hasUpstash,
    openai: hasOpenAI,
    ts: new Date().toISOString(),
  });
}
