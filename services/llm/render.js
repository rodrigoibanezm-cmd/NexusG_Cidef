// /services/llm/render.js

import { callLLM } from "./callLLM.js";

export async function render({ message, data }) {
  // =========================
  // Fallback sin data
  // =========================
  if (!data) {
    return "No hay información disponible";
  }

  // =========================
  // Prompt de render (aislado)
  // =========================
  const renderPrompt = `
Responde usando SOLO la información entregada.

Reglas:
- No inventar
- No usar conocimiento externo
- Si falta información: "No hay información disponible"

Formato:

Modo ficha:
- encabezados markdown
- bullets
- sin interpretación

Modo interpretación:
- máximo 5 bullets
- directo a valor

Reglas:
- Elegir un modo dominante
- técnica → ficha
- decisión → interpretación
- mantener estructura clara

DATA:
${JSON.stringify(data)}
`;

  // =========================
  // LLM render
  // =========================
  const response = await callLLM([
    { role: "system", content: renderPrompt },
    { role: "user", content: message },
  ]);

  if (!response || !response.content) {
    return "No hay información disponible";
  }

  return response.content;
}
