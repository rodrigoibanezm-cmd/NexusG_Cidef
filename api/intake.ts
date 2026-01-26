// api/intake.ts

export type Model =
  | "t5"
  | "t5_evo"
  | "t5l"
  | "t5_evo_hev"
  | "foton_v9"
  | "s50_ev"
  | null

export type Topic =
  | "ficha"
  | "comercial"
  | "cliente"
  | "mitos"
  | null

export type Intent =
  | "seguridad"
  | "espacio"
  | "consumo"
  | "garantia"
  | "ev"
  | "precio"
  | "financiamiento"
  | "postventa"
  | "tecnologia"
  | "otro"

export type DecisionState =
  | "OK"
  | "OK_PARCIAL"
  | "NO_DATA"
  | "CONFLICT"
  | "OFF_SCOPE"

export type Confidence = "alta" | "media" | "baja"

export type IntakeResult = {
  trace_id: string
  user_id: string

  model: Model
  topic: Topic
  intent: Intent

  confidence: Confidence
  decision_state: DecisionState

  keys: string[]
  paths: string[]

  need_critical: boolean
  critical_question: string | null
}

/**
 * Intake / Router
 * - NO consulta Upstash
 * - NO aplica rules
 * - NO genera texto final
 */
export function intakeRouter(params: {
  trace_id: string
  user_id: string
  message: string
}): IntakeResult {
  const { trace_id, user_id } = params

  // TODO: implementar clasificación real
  // Por ahora: placeholder seguro (no responde contenido)

  return {
    trace_id,
    user_id,

    model: null,
    topic: null,
    intent: "otro",

    confidence: "baja",
    decision_state: "NO_DATA",

    keys: [],
    paths: [],

    need_critical: true,
    critical_question:
      "¿Qué modelo estás viendo? (T5, T5 EVO, T5L, T5 EVO HEV, Foton V9 o S50 EV)"
  }
}
