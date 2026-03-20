// /services/llm/decide.js

import { callLLM } from "./callLLM.js";

export async function decide(message) {
  try {
    const prompt = `
Responde SOLO JSON válido.

Formato:
{"topic":"...","models":[]}

Opciones topic:
cliente | comercial | ficha | mitos

Usuario:
${message}
`;

    const raw = await callLLM(prompt);

    const cleaned = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    if (!parsed.topic) throw new Error();

    return parsed;

  } catch (err) {
    console.error("DECIDE_ERROR:", err);

    return {
      topic: "ficha",
      models: ["t5"]
    };
  }
}
