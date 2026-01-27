// PATH: api/debug_orch.ts
// LINES: 100

import { intake } from "../lib/intake/intake.js";
import { getJson } from "../lib/upstash/client.js";
import { orchestratorV1 } from "../lib/orchestrator/orchestrator_v1.js";
import { curatorSemanticV1 } from "../lib/curation/semantic/curator_semantic_v1.js";
import { renderBulletsV1 } from "../lib/render/render_bullets_v1.js";
import { curatorFormV1 } from "../lib/curation/form/curator_form_v1.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const user_id = body?.user_id;
  const text = body?.text;
  const trace_id = body?.trace_id ?? "debug";

  if (!user_id || !text) return res.status(400).json({ error: "missing user_id or text" });

  const flags: Record<string, any> = {};

  // 1️⃣ Intake
  const intakeResult = intake({ trace_id, user_id, message: text });
  flags.intake_done = true;

  // 2️⃣ Config y Keymap
  const router_config = (await getJson("cidef:router_config:v1")) ?? {};
  const keymap = (await getJson("cidef:keymap:v1")) ?? {};
  flags.config_loaded = true;

  // 3️⃣ Orquestador
  const op = await orchestratorV1({ intake: intakeResult, keymap, router_config });
  flags.orchestrator_done = true;
  flags.op_decision = op.decision_state_final;

  // 4️⃣ Curator Semantic
  const sem = curatorSemanticV1(op);
  flags.semantic_done = true;
  flags.semantic_state = sem.decision_state_final;

  // 5️⃣ Render Bullets (limitados)
  let rendered: string[] = [];
  try {
    rendered = renderBulletsV1({ ...op, decision_state_final: sem.decision_state_final });
    flags.render_done = true;
    flags.render_count = rendered.length;
  } catch (e) {
    flags.render_error = true;
    flags.render_error_msg = String(e);
  }

  // 6️⃣ Curator Form (validación ligera)
  let form: any = null;
  try {
    form = curatorFormV1({ title: "DEBUG_TITLE", bullets: rendered });
    flags.form_done = form.ok;
    if (!form.ok) flags.form_blocked_reason = form.blocked_reason;
  } catch (e) {
    flags.form_error = true;
    flags.form_error_msg = String(e);
  }

  return res.status(200).json({
    trace_id,
    intake: intakeResult,
    op_decision: op.decision_state_final,
    keys_used: op.keys_used,
    has_ficha: Boolean(op.ficha),
    has_comercial: Boolean(op.comercial),
    has_cliente: Boolean(op.cliente),
    has_mitos: Boolean(op.mitos),
    flags,
    rendered,
    form_output: form,
  });
}
