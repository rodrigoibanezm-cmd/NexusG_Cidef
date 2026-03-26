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

  // mitos domina salvo que haya decisión explícita
  if (
    maps.includes("mitos") &&
    !maps.includes("cliente") &&
    !maps.includes("comercial")
  ) {
    return { prompt: promptMitos, type: "mitos" };
  }

  // ficha pura
  if (maps.includes("ficha") && maps.length === 1) {
    return { prompt: promptFicha, type: "ficha" };
  }

  // decisión domina
  if (maps.includes("cliente") || maps.includes("comercial")) {
    return { prompt: promptDecision, type: "decision" };
  }

  // fallback técnico
  if (maps.includes("ficha")) {
    return { prompt: promptFicha, type: "ficha" };
  }

  // default
  return { prompt: promptDefault, type: "default" };
}
