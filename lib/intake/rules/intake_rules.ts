// PATH: lib/intake/rules/intake_rules.ts
// LINES: 72

import { Model, Topic, Intent, DecisionState, OperationMode } from "../types/intake_types"

/* -------------------------
 * Diccionario de paths (V1)
 * ------------------------- */

const PATHS_BY_INTENT: Record<Intent, string[]> = {
  seguridad: ["seguridad"],
  espacio: ["espacio"],
  consumo: ["consumo"],
  garantia: ["garantia"],
  ev: ["ev"],
  precio: ["precio", "valor"],
  financiamiento: ["financiamiento"],
  postventa: ["postventa"],
  tecnologia: ["tecnologia"],
  otro: []
}

export type IntakeRulesOutput = {
  operation_mode: OperationMode
  need_critical: boolean
  decision_state: DecisionState
  critical_question: string | null
  paths: string[]
  keys: string[]
}

export function applyIntakeRules(params: {
  models: Model[]
  topic: Topic
  intent: Intent
}): IntakeRulesOutput {
  const { models, topic, intent } = params

  const operation_mode: OperationMode = models.length > 1 ? "multi_model" : "single_model"

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
    operation_mode,
    need_critical,
    decision_state,
    critical_question,
    paths,
    keys
  }
}
