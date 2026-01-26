// PATH: lib/intake/detectors/intake_detectors.ts
// LINES: 65

import { IntakeInput, Detection } from "../types/intake_types";

export function runDetectors(input: IntakeInput): Detection[] {
  const detections: Detection[] = [];
  const text = input.text.toLowerCase();

  if (text.includes("precio") || text.includes("valor")) {
    detections.push({ type: "intent", value: "consulta_precio", confidence: "alta", evidence: "Mención a precio/valor" });
  }

  if (text.includes("hoy") || text.includes("ahora")) {
    detections.push({ type: "urgency", value: "alta", confidence: "media", evidence: "Lenguaje temporal inmediato" });
  }

  if (text.includes("cotizar") || text.includes("financiamiento")) {
    detections.push({ type: "buy_stage", value: "consideracion_avanzada", confidence: "alta", evidence: "Solicitud típica de etapa media/alta" });
  }

  if (text.includes("demanda") || text.includes("reclamo")) {
    detections.push({ type: "risk", value: "legal_o_reputacional", confidence: "media", evidence: "Lenguaje asociado a conflicto" });
  }

  if (detections.length === 0) {
    detections.push({ type: "unknown", value: "sin_senal_clara", confidence: "baja", evidence: "No se detectan patrones conocidos" });
  }

  return detections;
}
