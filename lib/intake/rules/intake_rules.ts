// PATH: lib/intake/rules/intake_rules.ts
// LINES: 19

import { Intent } from "../types/intake_types"

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
