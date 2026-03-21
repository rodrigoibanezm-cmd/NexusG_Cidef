// /services/llm/render.js

import { callLLM } from "./callLLM.js";

export async function render(data) {
  try {
    const prompt = `
Eres un asesor de ventas automotriz.

Reglas:
- Usa SOLO la información entregada
- No inventes datos
- Si no hay información: "No hay información disponible."
- No menciones JSON
- No expliques de más

Formato:
- respuesta corta
- clara
- directa

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
