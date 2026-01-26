// PATH: lib/pipeline/run_chat_pipeline_v1.ts
// LINES: 99

import { orchestratorV1 } from "../orchestrator/orchestrator_v1.js";
import { curatorSemanticV1 } from "../curation/semantic/curator_semantic_v1.js";
import { renderBulletsV1 } from "../render/render_bullets_v1.js";
import { curatorFormV1 } from "../curation/form/curator_form_v1.js";
import { logEventV1 } from "../telemetry/log_event_v1.js";

type IntakeResult = {
  trace_id: string;
  user_id: string;

  // gates
  need_critical?: boolean;
  critical_question?: string | null;
  decision_state?: "OK" | "OFF_SCOPE";

  // routing hints
  models?: string[];
  topic?: string | null;
  intent?: string | null;
};

type KeymapV1 = any;
type RouterConfigV1 = any;

export type ChatResponse =
  | { trace_id: string; critical_question: string }
  | { trace_id: string; blocked: true; reason: string }
  | { trace_id: string; title: string; bullets: string[] };

export async function runChatPipelineV1(args: {
  intake: IntakeResult;
  keymap: KeymapV1;
  router_config: RouterConfigV1;
}): Promise<ChatResponse> {
  const { intake, keymap, router_config } = args;

  // CRITICAL ya debería haber sido cortado en /api/chat.
  if (intake.need_critical && intake.critical_question) {
    return { trace_id: intake.trace_id, critical_question: intake.critical_question };
  }

  if (intake.decision_state === "OFF_SCOPE") {
    await logEventV1({
      trace_id: intake.trace_id,
      user_id: intake.user_id,
      decision_state_final: "OFF_SCOPE",
      models: intake.models ?? [],
      topic: intake.topic ?? null,
      intent: intake.intent ?? null,
      keys_used: [],
      paths_used: [],
      partial: false,
      blocked_reason: "OFF_SCOPE",
    });
    return { trace_id: intake.trace_id, blocked: true, reason: "OFF_SCOPE" };
  }

  const op = await orchestratorV1({ intake, keymap, router_config });

  const sem = curatorSemanticV1(op);
  if (sem.decision_state_final === "NO_DATA" || sem.decision_state_final === "CONFLICT") {
    await logEventV1({
      trace_id: intake.trace_id,
      user_id: intake.user_id,
      decision_state_final: sem.decision_state_final,
      models: intake.models ?? [],
      topic: intake.topic ?? null,
      intent: intake.intent ?? null,
      keys_used: op.keys_used ?? [],
      paths_used: op.paths_used ?? [],
      partial: sem.partial,
      blocked_reason: sem.blocked_reason,
    });
    return { trace_id: intake.trace_id, blocked: true, reason: sem.decision_state_final };
  }

  const rendered = renderBulletsV1({ ...op, decision_state_final: sem.decision_state_final });

  const form = curatorFormV1(rendered);
  if (!form.ok) {
    await logEventV1({
      trace_id: intake.trace_id,
      user_id: intake.user_id,
      decision_state_final: "CONFLICT",
      models: intake.models ?? [],
      topic: intake.topic ?? null,
      intent: intake.intent ?? null,
      keys_used: op.keys_used ?? [],
      paths_used: op.paths_used ?? [],
      partial: true,
      blocked_reason: form.blocked_reason,
    });
    return { trace_id: intake.trace_id, blocked: true, reason: form.blocked_reason };
  }

  await logEventV1({
    trace_id: intake.trace_id,
    user_id: intake.user_id,
    decision_state_final: sem.decision_state_final,
    models: intake.models ?? [],
    topic: intake.topic ?? null,
    intent: intake.intent ?? null,
    keys_used: op.keys_used ?? [],
    paths_used: op.paths_used ?? [],
    partial: sem.partial,
    blocked_reason: null,
  });

  return { trace_id: intake.trace_id, title: form.output.title, bullets: form.output.bullets };
}
