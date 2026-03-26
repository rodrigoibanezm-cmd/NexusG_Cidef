// /services/llm/render.js

import { callLLM } from "./callLLM.js";
import { getPrompt } from "./promptSelector.js";
import { getBehaviorBlock } from "./behaviorService.js";

// =========================
// MAIN RENDER
// =========================

export async function render({
  message,
  data,
  maps = [],
  tenantId = "default",
}) {
  // fallback duro
  if (!data || !Array.isArray(data) || data.length === 0) {
    return "No hay información disponible";
  }

  // =========================
  // PROMPT
  // =========================

  const { prompt, type } = getPrompt(maps);

  // =========================
  // BEHAVIOR
  // =========================

  const behaviorBlock = await getBehaviorBlock(tenantId);

  const systemPrompt = [behaviorBlock, prompt]
    .filter(Boolean)
    .join("\n");

  // =========================
  // LOG INPUT
  // =========================

  console.log("RENDER INPUT:", {
    message_length: message?.length || 0,
    maps,
    data_count: data.length,
    prompt_type: type,
  });

  try {
    const safeData = JSON.stringify(data).slice(0, 12000);

    const res = await callLLM([
      { role: "system", content: systemPrompt },
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

    if (typeof output !== "string" || !output.trim()) {
      return "No hay información disponible";
    }

    return output;

  } catch (e) {
    console.error("RENDER ERROR:", e?.message);
    return "No hay información disponible";
  }
}
