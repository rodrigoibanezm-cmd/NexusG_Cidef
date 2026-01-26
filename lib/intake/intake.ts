// PATH: lib/intake/intake.ts
// LINES: 109

// Intake / Router — V1 FINAL (con soporte multi-modelo)
// Clasifica y rutea. NO contenido. NO Upstash. NO rules.

export type { Model, Topic, Intent, DecisionState, Confidence, OperationMode, IntakeResult } from "./types/intake_types"

import type { DecisionState, OperationMode, IntakeResult } from "./types/intake_types"
import { PATHS_BY_INTENT } from "./rules/intake_rules"
import {
  normalize,
  detectModels,
  detectTopic,
  detectIntent,
  detectOffScope,
  confidenceFor
} from "./detectors/intake_detectors"

type IntakeInput = {
  trace_id: string
  user_id: string
  message: string
}

/* -------------------------
 * Intake principal
 * ------------------------- */

export function intake(input: IntakeInput): IntakeResult {
  const { trace_id, user_id } = input
  const text = normalize(input.message)

  // 1) Off-scope
  if (detectOffScope(text)) {
    return {
      trace_id,
      user_id,

      operation_mode: "single_model",
      models: [],
      primary_model: null,

      topic: null,
      intent: "otro",

      confidence: "baja",
      decision_state: "OFF_SCOPE",

      keys: [],
      paths: [],

      need_critical: false,
      critical_question: null
    }
  }

  // 2) Detectores base
  const { models, primary } = detectModels(text)
  const topic = detectTopic(text)
  const intent = detectIntent(text)

  const operation_mode: OperationMode = models.length > 1 ? "multi_model" : "single_model"
  const confidence = confidenceFor(models, topic)

  // 3) Need critical (solo por falta de modelo(s) o topic)
  const need_critical = models.length === 0 || topic === null

  // 4) Estado preliminar (intake)
  // Nota: el orquestador puede cambiar el estado final según datos reales.
  const decision_state: DecisionState = need_critical ? "NO_DATA" : "OK"

  // 5) Pregunta crítica (una sola, cerrada)
  const critical_question = need_critical
    ? models.length === 0
      ? "¿Qué modelo estás viendo? (T5, T5 EVO, T5L, T5 EVO HEV, Foton V9 o S50 EV)"
      : "¿Qué tema quieres? (ficha, comercial, cliente o mitos)"
    : null

  // 6) Paths
  const paths = PATHS_BY_INTENT[intent] ?? []

  // 7) Keys (refs simbólicas topic:model; se resuelven a keys reales en orquestador)
  const keys: string[] = []
  if (!need_critical && topic) {
    for (const m of models) keys.push(`${topic}:${m}`)
  }

  return {
    trace_id,
    user_id,

    operation_mode,
    models,
    primary_model: primary,

    topic,
    intent,

    confidence,
    decision_state,

    keys,
    paths,

    need_critical,
    critical_question
  }
}
