// PATH: api/chat.ts
// LINES: 141

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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const body = safeParseBody(req);
  if (!body) return res.status(400).json({ error: "invalid json body" });

  const user_id = body?.user_id;
  const text = body?.text;
  const trace_id =
    body?.trace_id ??
    (globalThis.crypto?.randomUUID?.() || (await import("crypto")).randomUUID());

  if (!user_id || !text) {
    return res.status(400).json({ error: "missing user_id or text" });
  }

  const intakeResult = intake({ trace_id, user_id, message: text });

  if (intakeResult?.need_critical === true) {
    const q = intakeResult?.critical_question;
    if (typeof q === "string" && q.trim().length) {
      return res.status(200).json({ trace_id, critical_question: q.trim() });
    }
    return res
      .status(200)
      .json({ trace_id, critical_question: "¿Cuál es tu pregunta exacta?" });
  }

  if (intakeResult?.decision_state === "OFF_SCOPE") {
    return res.status(200).json({ trace_id, blocked: true, reason: "OFF_SCOPE" });
  }

  // Carga mínima (V1)
const router_config = (await getJson("cidef:router_config:v1")) ?? {};
const keymap = (await getJson("cidef:keymap:v1")) ?? {};

// DEBUG TEMPORAL (pegar AQUÍ)
if (req.query?.debug === "1") {
  return res.status(200).json({
    trace_id,
    intake: intakeResult,
    keymap_ok: Boolean(keymap?.layers?.ficha?.foton_v9),
    key_ficha_foton_v9: keymap?.layers?.ficha?.foton_v9 ?? null,
    key_comercial_foton_v9: keymap?.layers?.comercial?.foton_v9 ?? null,
    router_ok: Boolean(router_config?.paths),
  });
}

// HARD GUARDRAIL: si iba a RAM y falla el action/pipeline, NO hay fallback.
try {
  const out = await runChatPipelineV1({
    intake: intakeResult,
    keymap,
    router_config,
  });


    return res.status(200).json(out);
  } catch (e: any) {
    // FIX 1: Log real para ver el detalle en Vercel (en vez de “silencio”)
    console.error("CHAT_PIPELINE_ERROR", {
      trace_id,
      user_id,
      text,
      intake: intakeResult,
      err: e?.stack || String(e),
    });

    const route = (intakeResult as any)?.route;
    const needs_facts = (intakeResult as any)?.needs_facts === true;

    if (route === "RAM" || needs_facts) {
      return res.status(200).json({
        trace_id,
        error: "RAM_UNAVAILABLE",
        message: "No pude acceder al backend (RAM). Reintenta.",
      });
    }

    // FIX 2: Si no es RAM, tratamos el fallo como NO_DATA (falta de fuente/keys/etc)
    // Esto evita PIPELINE_ERROR cuando la realidad es “no hay datos”.
    return res.status(200).json({
      trace_id,
      blocked: true,
      reason: "NO_DATA",
      message: "No hay información disponible en el sistema para esa pregunta.",
    });
  }
}
