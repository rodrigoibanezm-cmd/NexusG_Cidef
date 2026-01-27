// PATH: /api/decide/index.js
// LINES: ~70
import { decide } from "../../lib/decide/decide.js";

export default async function handler(req, res) {
  const trace_id = String(req.body?.trace_id ?? req.query?.trace_id ?? "trace_unknown");

  if (req.method !== "POST") {
    return res.status(405).json({ trace_id, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST" } });
  }

  const text = String(req.body?.text ?? "");
  if (!text.trim()) {
    return res.status(400).json({ trace_id, error: { code: "BAD_REQUEST", message: "text is required" } });
  }

  const debug =
    req.query?.debug === "true" ||
    req.body?.debug === true ||
    process.env.DECIDE_DEBUG === "true";

  try {
    const out = await decide({ trace_id, text, debug });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({
      trace_id,
      error: { code: "DECIDE_FAILED", message: e?.message ?? "Unknown error" }
    });
  }
}
