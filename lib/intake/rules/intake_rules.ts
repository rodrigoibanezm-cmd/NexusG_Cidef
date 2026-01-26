// PATH: lib/intake/rules/intake_rules.ts
// LINES: 30

import { Intent } from "../types/intake_types.js"

/* -------------------------
 * Diccionario de paths (V1)
 * ------------------------- */

export const PATHS_BY_INTENT: Record<Intent, string[]> = {
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
 * Asignaciones de modelo por intención
 * ------------------------- */
export const MODEL_BY_INTENT: Record<Intent, string | undefined> = {
  cliente_taxi_uber: "S50 EV" // Regla explícita: taxi/Uber → S50 EV
}
