// PATH: lib/intake/types/intake_types.ts
// LINES: 59

export type Model =
  | "t5"
  | "t5_evo"
  | "t5l"
  | "t5_evo_hev"
  | "foton_v9"
  | "s50_ev"

export type Topic = "ficha" | "comercial" | "cliente" | "mitos" | null

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

export type DecisionState = "OK" | "OK_PARCIAL" | "NO_DATA" | "CONFLICT" | "OFF_SCOPE"
export type Confidence = "alta" | "media" | "baja"
export type OperationMode = "single_model" | "multi_model"

export type IntakeResult = {
  trace_id: string
  user_id: string

  operation_mode: OperationMode
  models: Model[]
  primary_model: Model | null

  topic: Topic
  intent: Intent

  confidence: Confidence
  decision_state: DecisionState

  // NOTA V1: keys aquí son "refs" simbólicas (topic:model).
  // El orquestador las resuelve a keys reales vía manifest/keymap.
  keys: string[]
  paths: string[]

  need_critical: boolean
  critical_question: string | null
}

export type IntakeInput = {
  trace_id: string
  user_id: string
  message: string
}

export type ModelAliases = Record<Model, string[]>
