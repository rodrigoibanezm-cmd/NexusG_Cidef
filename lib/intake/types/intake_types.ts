// PATH: lib/intake/types/intake_types.ts
// LINES: 54

export type Channel = "web" | "whatsapp" | "chat" | "unknown";

export type Actor = "cliente" | "vendedor" | "sistema" | "unknown";

export interface IntakeInput {
  text: string;
  channel?: Channel;
  actor?: Actor;
  model_hint?: string | null;
  context?: Record<string, unknown>;
}

export type DetectionType = "intent" | "urgency" | "buy_stage" | "risk" | "unknown";

export interface Detection {
  type: DetectionType;
  value: string;
  confidence: "alta" | "media" | "baja";
  evidence: string;
}

export interface IntakeDecision {
  route: "venta" | "informacion" | "derivacion" | "bloqueo";
  reason: string;
}

export interface IntakeResult {
  input: IntakeInput;
  detections: Detection[];
  result: IntakeDecision;
  meta: {
    version: string;
    timestamp: string;
  };
}
