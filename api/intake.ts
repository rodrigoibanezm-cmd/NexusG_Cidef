// /api/intake.ts
// Intake / Router — V1 FINAL (con soporte multi-modelo)
// Clasifica y rutea. NO contenido. NO Upstash. NO rules.

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

const MODEL_ALIASES: Record<Model, string[]> = {
  t5: ["t5"],
  t5_evo: ["t5 evo", "t5-evo", "t5evo"],
  t5l: ["t5l", "t5 l"],
  t5_evo_hev: ["t5 evo hev", "t5-evo-hev", "t5 hev", "t5evo hev"],
  foton_v9: ["foton v9", "v9"],
  s50_ev: ["s50 ev", "s50"]
}

function detectModels(text: string): { models: Model[]; primary: Model | null } {
  const hits: { model: Model; idx: number }[] = []

  for (const model of Object.keys(MODEL_ALIASES) as Model[]) {
    const aliases = MODEL_ALIASES[model]
    for (const a of aliases) {
      const idx = text.indexOf(a)
      if (idx >= 0) {
        hits.push({ model, idx })
        break // un hit por modelo basta
      }
    }
  }

  if (hits.length === 0) return { models: [], primary: null }

  // dedupe + ordenar por aparición
  const seen = new Set<Model>()
  const ordered = hits
    .sort((x, y) => x.idx - y.idx)
    .map(h => h.model)
    .filter(m => (seen.has(m) ? false : (seen.add(m), true)))

  const primary = ordered[0] ?? null
  return { models: ordered, primary }
}

function detectTopic(text: string): Topic {
  // ficha: specs / números / términos técnicos frecuentes
  if (/(ficha|especifica|especificacion|motor|hp|kw|nm|autonomia|medida|dimensiones|airbag|adas|consumo|rendimiento)/.test(text))
    return "ficha"

  // comercial: cómo vender / oferta / precio / financiamiento
  if (/(vender|argumento|decir|discurso|oferta|promocion|precio|valor|financiamiento|credito|leasing)/.test(text))
    return "comercial"

  // cliente: uso / perfil
  if (/(familia|uso|hijos|colegio|ciudad|viaje|perfil|necesito|para mi)/.test(text))
    return "cliente"

  // mitos/objeciones
  if (/(mito|verdad|es cierto|dicen que|prejuicio|china|chino|ev|electrico|bateria)/.test(text))
    return "mitos"

  return null
}

function detectIntent(text: string): Intent {
  if (/(seguridad|airbag|adas|freno|isofix)/.test(text)) return "seguridad"
  if (/(espacio|maletero|habitabilidad|3 fila|tercera fila)/.test(text)) return "espacio"
  if (/(consumo|rendimiento|km\/l|kwh|litro)/.test(text)) return "consumo"
  if (/(garantia|garantía)/.test(text)) return "garantia"
  if (/(ev|electrico|eléctrico|bateria|batería|carga|cargador)/.test(text)) return "ev"
  if (/(precio|valor|costo|cuanto sale)/.test(text)) return "precio"
  if (/(financiamiento|credito|crédito|leasing|cuotas)/.test(text)) return "financiamiento"
  if (/(postventa|servicio|mantencion|mantención|repuestos|taller)/.test(text)) return "postventa"
  if (/(pantalla|tecnologia|tecnología|conectividad|carplay|android auto)/.test(text)) return "tecnologia"
  return "otro"
}

function detectOffScope(text: string): boolean {
  // Heurística mínima: si no hay señales automotrices/venta, es off-scope.
  return !/(auto|vehiculo|vehículo|motor|marca|modelo|venta|suv|pickup|camioneta|electrico|eléctrico)/.test(text)
}

function confidenceFor(models: Model[], topic: Topic): Confidence {
  if (models.length > 0 && topic) return "alta"
  if (models.length > 0 || topic) return "media"
  return "baja"
}

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
