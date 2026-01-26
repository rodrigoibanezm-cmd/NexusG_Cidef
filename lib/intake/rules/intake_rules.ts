// PATH: lib/intake/rules/intake_rules.ts
// LINES: ~120

import {
  IntakeInput,
  Detection,
  IntakeDecision
} from "../types/intake_types";

export function applyRules(
  _input: IntakeInput,
  detections: Detection[]
): IntakeDecision {
  const hasRisk = detections.some(d => d.type === "risk");
  if (hasRisk) {
    return {
      route: "derivacion",
      reason: "Riesgo detectado, requiere manejo humano"
    };
  }

  const hasBuyIntent = detections.some(
    d => d.type === "intent" && d.value === "consulta_precio"
  );

  if (hasBuyIntent) {
    return {
      route: "venta",
      reason: "Señal clara de intención comercial"
    };
  }

  const hasAdvancedStage = detections.some(
    d => d.type === "buy_stage"
  );

  if (hasAdvancedStage) {
    return {
      route: "venta",
      reason: "Cliente en etapa de consideración avanzada"
    };
  }

  return {
    route: "informacion",
    reason: "Sin señales suficientes para venta directa"
  };
}
