// /services/llm/decide.js

import { callLLM } from "./callLLM.js";

export async function decide(message) {
  const prompt = `
Analiza la pregunta del usuario y decide qué pedir al backend.

Capas válidas:
- cliente
- comercial
- ficha
- mitos

Responde SOLO en JSON válido (sin texto extra):

{
  "topic": "...",
  "models": []
}

Usuario:
${message}
`;

  const raw = await callLLM(prompt);

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.topic) throw new Error("invalid");
    return parsed;
  } catch {
    // fallback mínimo (no romper flujo)
    return {
      topic: "ficha",
      models: ["t5"]
    };
  }
}
