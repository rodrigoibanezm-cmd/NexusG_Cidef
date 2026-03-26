// /services/llm/render.js

import { callLLM } from "./callLLM.js";
import { getPrompt } from "./promptSelector.js";

// =========================
// MAIN RENDER
// =========================

export async function render({ message, data, maps = [] }) {
  // fallback duro
  if (!data || !Array.isArray(data) || data.length === 0) {
    return "No hay información disponible";
  }

  const { prompt, type } = getPrompt(maps);

  console.log("RENDER INPUT:", {
    message_length: message?.length || 0,
    maps,
    data_count: data.length,
    prompt_type: type,
  });

  try {
    // limitar payload
    const safeData = JSON.stringify(data).slice(0, 12000);

    const res = await callLLM([
      { role: "system", content: prompt },
      {
        role: "user",
        content: `
MENSAJE:
${message}

DATA:
${safeData}
`,
      },
    ]);

    const output = res?.content;

    console.log("RENDER OUTPUT LENGTH:", output?.length);

    // fallback output
    if (typeof output !== "string" || !output.trim()) {
      return "No hay información disponible";
    }

    return output;

  } catch (e) {
    console.error("RENDER ERROR:", e?.message);
    return "No hay información disponible";
  }
}
