// /services/llm/decide.js

import { callLLM } from "./callLLM.js";

export async function decide(message) {
  const prompt = `
Responde SOLO JSON válido. No agregues texto.

Formato:
{"topic":"...","models":[]}

Capas válidas:
cliente | comercial | ficha | mitos

Usuario:
${message}
`;

  const raw = await callLLM(prompt);

  // 🔥 limpieza básica (clave)
  const cleaned = raw
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);

    if (!parsed.topic) throw new Error();

    return parsed;
  } catch {
    return {
      topic: "ficha",
      models: ["t5"]
    };
  }
}
