///// /services/llm/render.js

import { callLLM } from "./callLLM.js";

/* =========================
   Post-procesado mínimo
   ========================= */

function postFormat(raw) {
  if (!raw) {
    return "No hay información disponible.";
  }

  const cleaned = raw
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const firstLine = (lines[0] || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .trim();

  const isFicha = firstLine === "MODE:FICHA";
  const hasMode = firstLine.startsWith("MODE:");

  const body = hasMode
    ? lines.slice(1).join("\n").trim()
    : lines.join("\n").trim();

  // 👉 FICHA: no tocar estructura
  if (isFicha) {
    return body;
  }

  // 👉 INTERPRETACIÓN: limitar bullets
  const bullets = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("-") || l.startsWith("*"))
    .slice(0, 5);

  return bullets.length ? bullets.join("\n") : body;
}

/* =========================
   Render principal
   ========================= */

export async function render(data, message) {
  try {
    const prompt = `
Eres un sistema de respuesta automotriz de Cidef.

Contexto:
- "Mage" es un modelo de vehículo.
- NO es un concepto de fantasía.

Responde en español latino neutro, sin modismos regionales.

Debes responder en UNO de estos modos:

=========================
MODO FICHA
=========================
Si el usuario pide datos (ficha, características, especificaciones):

Primera línea EXACTA:
MODE: FICHA

Luego:
- Usa encabezados markdown reales (##, ###)
- Cada sección con su propio encabezado
- Luego bullets debajo
- NO escribir "Secciones:" ni "Bullets:"
- SIN interpretación
- SIN prosa
- SOLO datos

Ejemplo de formato:

## MAGE

### Motor
- dato
- dato

### Dimensiones
- dato

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
- Enfocado en valor

=========================
REGLAS CRÍTICAS
=========================
- NO inventar datos
- usar SOLO la información entregada
- NO usar conocimiento externo
- NO completar con conocimiento general
- NO mencionar JSON
- NO mezclar modos

SI no hay información suficiente:
→ responde EXACTAMENTE:
No hay información disponible.

Pregunta:
${message}

Información (FUENTE ÚNICA):
${JSON.stringify(data)}
`;

    const out = await callLLM(prompt);

    return postFormat(out);

  } catch (err) {
    console.error("RENDER_ERROR:", err);
    return "Error procesando respuesta.";
  }
}
