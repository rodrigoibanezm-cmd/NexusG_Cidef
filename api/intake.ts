// /api/intake.ts
// Intake / Router — V1 FINAL
// Clasifica y rutea. NO contenido. NO Upstash. NO rules.

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

type IntakeInput = {
  trace_id: string
  user_id: string
  message: string
}

/* -------------------------
 * Utilidades
 * ------------------------- */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

const MODEL_ALIASES: Record<Exclude<Model, null>, string[]> = {
  t5: ["t5"],
  t5_evo: ["t5 evo", "t5-evo", "t5evo"],
  t5l: ["t5l", "t5 l"],
  t5_evo_hev: ["t5 evo hev", "t5-evo-hev", "t5 hev"],
  foton_v9: ["foton v9", "v9"],
  s50_ev: ["s50 ev", "s50"]
}

function detectModel(text: string): { model: Model; conflict: boolean } {
  const hits: Exclude<Model, null>[] = []
  for (const model in MODEL_ALIASES) {
    const aliases = MODEL_ALIASES[model as Exclude<Model, null>]
    if (aliases.some(a => text.includes(a))) {
      hits.push(model as Exclude<Model, null>)
    }
  }
  if (hits.length > 1) return { model: null, conflict: true }
  if (hits.length === 1) return { model: hits[0], conflict: false }
  return { model: null, conflict: false }
}

function detectTopic(text: string): Topic {
  if (/(ficha|especifica|motor|hp|kw|autonomia|medida|airbag|adas|consumo)/.test(text)) return "ficha"
  if (/(vender|argumento|decir|precio|valor|oferta|financiamiento)/.test(text)) return "comercial"
  if (/(familia|uso|hijos|ciudad|viaje|perfil)/.test(text)) return "cliente"
  if (/(mito|verdad|es cierto|dicen que|china|ev)/.test(text)) return "mitos"
  return null
}

function detectIntent(text: string): Intent {
  if (/(seguridad|airbag|adas|freno)/.test(text)) return "seguridad"
  if (/(espacio|maletero|habitabilidad)/.test(text)) return "espacio"
  if (/(consumo|rendimiento|km\/l|kwh)/.test(text)) return "consumo"
  if (/(garantia|garantía)/.test(text)) return "garantia"
  if (/(ev|electrico|eléctrico|bateria|carga)/.test(text)) return "ev"
  if (/(precio|valor|costo)/.test(text)) return "precio"
  if (/(financiamiento|credito|leasing)/.test(text)) return "financiamiento"
  if (/(postventa|servicio|repuestos)/.test(text)) return "postventa"
  if (/(pantalla|tecnologia|conectividad)/.test(text)) return "tecnologia"
  return "otro"
}

function detectOffScope(text: string): boolean {
  return !/(auto|vehiculo|vehículo|motor|marca|modelo|venta)/.test(text)
}

function confidenceFor(model: Model, topic: Topic): Confidence {
  if (model && topic) return "alta"
  if (model || topic) return "media"
  return "baja"
}

/* -------------------------
 * Diccionario de paths
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

/* -------------------------
 * Intake principal
 * ------------------------- */

export function intake(input: IntakeInput): IntakeResult {
  const { trace_id, user_id } = input
  const text = normalize(input.message)

  if (detectOffScope(text)) {
    return {
      trace_id,
      user_id,
      model: null,
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

  const modelHit = detectModel(text)
  if (modelHit.conflict) {
    return {
      trace_id,
      user_id,
      model: null,
      topic: null,
      intent: "otro",
      confidence: "baja",
      decision_state: "CONFLICT",
      keys: [],
      paths: [],
      need_critical: false,
      critical_question: null
    }
  }

  const model = modelHit.model
  const topic = detectTopic(text)
  const intent = detectIntent(text)

  const confidence = confidenceFor(model, topic)
  const need_critical = model === null || topic === null

  const decision_state: DecisionState =
    need_critical ? "NO_DATA" : "OK"

  const critical_question = need_critical
    ? "¿Qué modelo estás viendo? (T5, T5 EVO, T5L, T5 EVO HEV, Foton V9 o S50 EV)"
    : null

  // Resolución de keys/paths (sin fetch)
  const keys: string[] = []
  const paths = PATHS_BY_INTENT[intent] ?? []

  if (model && topic) {
    keys.push(`${topic}:${model}`) // el orquestador lo traduce vía manifest/keymap
  }

  return {
    trace_id,
    user_id,
    model,
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
