// PATH: lib/orchestrator/key_selector_v1.ts
// LINES: 70

import type { KeymapV1 } from "./orchestrator_v1.js";

export type KeyFlagsResult = {
  keys_used: string[];
  has_ficha: boolean;
  has_comercial: boolean;
  has_cliente: boolean;
  has_mitos: boolean;
};

/**
 * Selecciona las keys y flags relevantes según intención y topic.
 * Solo devuelve las keys necesarias para la pregunta actual.
 */
export function selectKeysAndFlags(args: {
  intent: string | null;
  topic: string | null;
  model: string | null;
  keymap: KeymapV1;
}): KeyFlagsResult {
  const { intent, topic, model, keymap } = args;

  // Mapeo de intención → bucket
  const intentBucketMap: Record<string, string[]> = {
    comercial: ["comercial"],
    ficha: ["ficha"],
    cliente: ["cliente"],
    mitos: ["mitos"],
  };

  const buckets = intentBucketMap[intent ?? ""] ?? ["ficha", "comercial"];

  const keys: string[] = [];

  // Selección de keys
  for (const bucket of buckets) {
    if (bucket === "mitos") {
      // Mitología depende de topic, no de modelo
      const key =
        topic && keymap.layers?.mitos?.[topic] ? keymap.layers.mitos[topic] : null;
      if (key) keys.push(key);
    } else {
      const key = model && keymap.layers?.[bucket]?.[model] ? keymap.layers[bucket][model] : null;
      if (key) keys.push(key);
    }
  }

  return {
    keys_used: keys,
    has_ficha: buckets.includes("ficha") && !!(model && keymap.layers?.ficha?.[model]),
    has_comercial: buckets.includes("comercial") && !!(model && keymap.layers?.comercial?.[model]),
    has_cliente: buckets.includes("cliente") && !!(model && keymap.layers?.cliente?.[model]),
    has_mitos: buckets.includes("mitos") && !!(topic && keymap.layers?.mitos?.[topic]),
  };
}
