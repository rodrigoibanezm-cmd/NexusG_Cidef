// /services/llm/promptSelector.js

import { promptDecision } from "./prompts/decision.js";
import { promptFicha } from "./prompts/ficha.js";
import { promptMitos } from "./prompts/mitos.js";
import { promptDefault } from "./prompts/default.js";

// =========================
// SELECTOR DE PROMPT
// =========================

export function getPrompt(mapsInput) {
  const maps = Array.isArray(mapsInput) ? mapsInput : [];

  if (maps.includes("mitos")) {
    return { prompt: promptMitos, type: "mitos" };
  }

  if (maps.includes("ficha") && maps.length === 1) {
    return { prompt: promptFicha, type: "ficha" };
  }

  if (maps.includes("cliente") || maps.includes("comercial")) {
    return { prompt: promptDecision, type: "decision" };
  }

  if (maps.includes("ficha")) {
    return { prompt: promptFicha, type: "ficha" };
  }

  return { prompt: promptDefault, type: "default" };
}
