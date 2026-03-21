// /services/llm/render.js

import { callLLM } from "./callLLM.js";

/* =========================
   Compactación inteligente
   ========================= */

function compactDataSafe(data) {
  try {
    const keys = [
      "motor",
      "potencia",
      "torque",
      "transmision",
      "traccion",
      "dimension",
      "maletero",
      "version",
    ];

    const reduced = (data || []).map((d) => ({
      modelo: d.modelo,
      payload: d.payload
        ? Object.fromEntries(
            Object.entries(d.payload).filter(([k]) =>
              keys.some((x) => k.toLowerCase().includes(x))
            )
          )
        : null,
    }));

    const s = JSON.stringify(reduced);
    return s.length > 4000 ? s.slice(0, 4000) : s;
  } catch {
    return "[]";
  }
}

/* =========================
   Post-procesado
   ========================= */

function postFormat(raw) {
  if (!raw) return { intent: "interpretacion", content: "No hay información disponible." };

  const cleaned = raw
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);

  let intent = "interpretacion";

  if (lines[0] === "MODE: FICHA") intent = "ficha";
  if (lines[0] === "MODE: INTERPRETACION") intent = "interpretacion";

  const body = lines.slice(1).join("\n").trim();

  // 👉 FICHA: NO tocar estructura
  if (intent === "ficha") {
    return { intent, content: body };
  }

  // 👉 INTERPRETACIÓN: asegurar bullets cortos
  const bullets = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("-") || l.startsWith("*"))
    .slice(0, 5);

  return {
    intent,
    content: bullets.length ? bullets.join("\n") : body,
  };
}

/* =========================
   Render principal
   ========================= */

export async function render(data, message) {
  try {
    const compactData = compactDataSafe(data);

    const prompt = `
Eres un sistema de respuesta automotriz.

Debes responder en UNO de estos modos:

=========================
MODO FICHA
=========================
Si el usuario pide datos (ficha, características, especificaciones):

Primera línea EXACTA:
MODE: FICHA

Luego:
- Título
- Secciones
- Bullets
- SIN interpretación
- SIN prosa

=========================
MODO INTERPRETACION
=========================
Si el usuario pide análisis (uso, cliente ideal, recomendación):

Primera línea EXACTA:
MODE: INTERPRETACION

Luego:
- Máximo 4-5 bullets
- Cortos
- Sin prosa larga

=========================
REGLAS
=========================
- NO inventar datos
- usar SOLO la información entregada
- NO mencionar JSON
- NO mezclar modos

Pregunta:
${message}

Información:
${compactData}
`;

    const out = await callLLM(prompt);

    const { content } = postFormat(out);

    return content || "No hay información disponible.";
  } catch (err) {
    console.error("RENDER_ERROR:", err);
    return "No hay información disponible.";
  }
}
