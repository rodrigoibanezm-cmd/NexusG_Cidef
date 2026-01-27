// PATH: api/debug_orch.ts
// LINES: 68

import { intake } from "../lib/intake/intake.js";
import { getJson } from "../lib/upstash/client.js";
import { orchestratorV1 } from "../lib/orchestrator/orchestrator_v1.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const user_id = body?.user_id;
  const text = body?.text;
  const trace_id = body?.trace_id ?? "debug";

  if (!user_id || !text) return res.status(400).json({ error: "missing user_id or text" });

  const intakeResult = intake({ trace_id, user_id, message: text });

  const router_config = (await getJson("cidef:router_config:v1")) ?? {};
  const keymap = (await getJson("cidef:keymap:v1")) ?? {};

  const op = await orchestratorV1({ intake: intakeResult, keymap, router_config });

  return res.status(200).json({
    trace_id,
    intake: intakeResult,
    op_decision: op.decision_state_final,
    keys_used: op.keys_used,
    has_ficha: Boolean(op.ficha),
    has_comercial: Boolean(op.comercial),
    has_cliente: Boolean(op.cliente),
    has_mitos: Boolean(op.mitos),
  });
}
