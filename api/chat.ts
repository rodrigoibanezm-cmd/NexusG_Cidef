// PATH: api/chat.ts
// LINES: 96

import crypto from "crypto";
import { intake } from "../lib/intake/intake.js";
import { getJson } from "../lib/upstash/client.js";
import { runChatPipelineV1 } from "../lib/pipeline/run_chat_pipeline_v1.js";

function safeParseBody(req: any): any | null {
  const b = req?.body;
  if (b == null) return null;
  if (typeof b === "object") return b;
  if (typeof b === "string") {
    try {
      return JSON.parse(b);
    } catch {
      return null;
    }
  }
  return null;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "POST only" });
    }

    const body = safeParseBody(req);
    if (!body) {
      return res.status(400).json({ error: "invalid json body" });
    }

    const user_id = body?.user_id;
    const text = body?.text;
    const trace_id = body?.trace_id ?? crypto.randomUUID();

    if (!user_id || !text) {
      return res.status(400).json({ error: "missing user_id or text" });
    }

    const intakeResult = intake({
      trace_id,
      user_id,
      message: text,
    });

    // ===== CRITICAL GATE =====
    if (intakeResult?.need_critical === true) {
      const q = intakeResult?.critical_question;
      return res.status(200).json({
        trace_id,
        critical_question:
          typeof q === "string" && q.trim().length
            ? q.trim()
            : "¿Cuál es tu pregunta exacta?",
      });
    }

    // ===== OFF SCOPE GATE =====
    if (intakeResult?.decision_state === "OFF_SCOPE") {
      return res.status(200).json({
        trace_id,
        blocked: true,
        reason: "OFF_SCOPE",
      });
    }

    // ===== CARGA MÍNIMA UPSTASH =====
    const router_config = (await getJson("cidef:router_config:v1")) ?? {};
    const keymap = (await getJson("cidef:keymap:v1")) ?? {};

    const out = await runChatPipelineV1({
      intake: intakeResult,
      keymap,
      router_config,
    });

    return res.status(200).json(out);
  } catch (err) {
    console.error("CHAT_CRASH", err);
    return res.status(500).json({
      error: "chat_crash",
    });
  }
}
