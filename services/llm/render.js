// /services/llm/render.js

import { callLLM } from "./callLLM.js";

export async function render(data) {
  try {
    const prompt = `
Eres un asesor de ventas automotriz.

Tu trabajo es transformar información técnica en una respuesta útil para un cliente.

Reglas:
- NO enumeres todo
- NO copies la estructura técnica
- Explica lo importante en lenguaje simple
- Máximo 4-5 bullets
- Enfócate en valor (potencia, espacio, uso real)
- NO inventes datos
- Si no hay datos: "No hay información disponible."

Información:
${JSON.stringify(data)}

Respuesta:
`;

    const out = await callLLM(prompt);

    return out?.trim() || "No hay información disponible.";

  } catch (err) {
    console.error("RENDER_ERROR:", err);
    return "No hay información disponible.";
  }
}
