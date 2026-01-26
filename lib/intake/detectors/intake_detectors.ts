// PATH: lib/intake/detectors/intake_detectors.ts
// LINES: 99

import { Model, Topic, Intent, Confidence } from "../types/intake_types"

/* -------------------------
 * Utilidades
 * ------------------------- */

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

export const MODEL_ALIASES: Record<Model, string[]> = {
  t5: ["t5"],
  t5_evo: ["t5 evo", "t5-evo", "t5evo"],
  t5l: ["t5l", "t5 l"],
  t5_evo_hev: ["t5 evo hev", "t5-evo-hev", "t5 hev", "t5evo hev"],
  foton_v9: ["foton v9", "v9"],
  s50_ev: ["s50 ev", "s50"]
}

export function detectModels(text: string): { models: Model[]; primary: Model | null } {
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

export function detectTopic(text: string): Topic {
  // ficha: specs / números / términos técnicos frecuentes
  if (
    /(ficha|especifica|especificacion|motor|hp|kw|nm|autonomia|medida|dimensiones|airbag|adas|consumo|rendimiento)/.test(
      text
    )
  )
    return "ficha"

  // comercial: cómo vender / oferta / precio / financiamiento
  if (/(vender|argumento|decir|discurso|oferta|promocion|precio|valor|financiamiento|credito|leasing)/.test(text))
    return "comercial"

  // cliente: uso / perfil
  if (/(familia|uso|hijos|colegio|ciudad|viaje|perfil|necesito|para mi)/.test(text)) return "cliente"

  // mitos/objeciones
  if (/(mito|verdad|es cierto|dicen que|prejuicio|china|chino|ev|electrico|bateria)/.test(text))
    return "mitos"

  return null
}

export function detectIntent(text: string): Intent {
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

export function detectOffScope(text: string): boolean {
  // Heurística mínima: si no hay señales automotrices/venta, es off-scope.
  return !/(auto|vehiculo|vehículo|motor|marca|modelo|venta|suv|pickup|camioneta|electrico|eléctrico)/.test(text)
}

export function confidenceFor(models: Model[], topic: Topic): Confidence {
  if (models.length > 0 && topic) return "alta"
  if (models.length > 0 || topic) return "media"
  return "baja"
}
