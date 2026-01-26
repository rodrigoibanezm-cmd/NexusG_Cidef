// PATH: lib/render/render_bullets_v1.ts
// LINES: 93

import type { DecisionStateFinal } from "../telemetry/log_event_v1.js";

export type JsonOperativo = {
  decision_state_final: DecisionStateFinal;
  model: string | null;

  // Campos típicos (V1). Pueden venir recortados desde Upstash.
  ficha?: Record<string, any> | null;
  comercial?: Record<string, any> | null;
  cliente?: Record<string, any> | null;
  mitos?: Record<string, any> | null;
};

export type RenderedOutput = {
  title: string;
  bullets: string[];
};

function pickModelName(op: JsonOperativo): string {
  return op.model ?? "Modelo";
}

function safeText(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const s = x.replace(/\s+/g, " ").trim();
  return s.length ? s : null;
}

function firstTruthy(obj?: Record<string, any> | null): string | null {
  if (!obj) return null;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const t = safeText(v);
    if (t) return t;
  }
  return null;
}

export function renderBulletsV1(op: JsonOperativo): RenderedOutput {
  const modelName = pickModelName(op);

  // Título corto, sin marketing.
  const title = `Puntos clave — ${modelName}`;

  // V1 minimalista: 3–5 bullets desde lo disponible, sin inventar.
  const bullets: string[] = [];

  const fichaB = firstTruthy(op.ficha);
  if (fichaB) bullets.push(fichaB);

  const comercialB = firstTruthy(op.comercial);
  if (comercialB) bullets.push(comercialB);

  const clienteB = firstTruthy(op.cliente);
  if (clienteB) bullets.push(clienteB);

  const mitosB = firstTruthy(op.mitos);
  if (mitosB) bullets.push(mitosB);

  // Garantiza 3–5 sin inventar: si faltan, duplica NO; solo recorta a 5.
  // Si quedan <3, el curator semántico debe haber marcado OK_PARCIAL/NO_DATA.
  return { title, bullets: bullets.slice(0, 5) };
}
