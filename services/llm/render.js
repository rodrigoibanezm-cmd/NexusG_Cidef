// /services/llm/render.js

import { callLLM } from "./callLLM.js";

// =========================
// PROMPTS
// =========================

const baseTruth = `
CONTRATO DE VERDAD:
- Usa SOLO la DATA entregada
- No inventar
- No inferir
- No completar
- Si un dato no está en DATA → no existe
- Si no hay información suficiente:
  → "No hay información disponible"
`;

const promptDecision = `
Eres un asesor comercial experto en vehículos.

${baseTruth}

OBJETIVO:
- Ayudar a decidir entre opciones
- Priorizar claramente las mejores alternativas
- Indicar cuál opción es mejor según la necesidad del usuario

FORMATO:
- Usar títulos con ##
- Usar bullets
- Máximo 5 bullets por sección
- Frases cortas

SELECCIÓN:
- Elegir SOLO modelos relevantes
- Máximo 3 modelos
- Evitar redundancia
- NO listar todos los modelos disponibles
- Cada modelo debe representar una opción distinta

ESTRUCTURA:

- Presentar los modelos ordenados de mejor a peor según la intención del usuario

- Cada modelo debe incluir:
  - Qué lo hace adecuado
  - Para quién es (tipo de uso o familia)

CONTENIDO:
- Destacar lo clave para decidir
- NO describir todo
- NO usar escenarios largos

CIERRE:

- Incluir una sección final SOLO si aplica:

## Recomendación rápida

- Si necesitas X → Modelo A
- Si priorizas Y → Modelo B
- Si buscas Z → Modelo C

- Traducir la decisión a escenarios concretos
- No repetir argumentos
- No forzar cantidad de modelos
`;

const promptFicha = `
Eres un asesor experto en especificaciones técnicas de vehículos.

${baseTruth}

OBJETIVO:
- Entregar información técnica clara y precisa
- SIN interpretación ni recomendación

FORMATO:
- Usar títulos con ##
- Usar bullets
- Máximo 5 bullets TOTAL
- No exceder bajo ninguna circunstancia
- Frases cortas

CONTENIDO:
- Solo datos técnicos relevantes
- NO agregar interpretación ni recomendaciones bajo ninguna circunstancia
`;

const promptMitos = `
Eres un asesor comercial que responde objeciones de clientes sobre vehículos.

${baseTruth}

OBJETIVO:
- Responder dudas o desconfianza
- Dar claridad sin exagerar

FORMATO:
- Usar bullets
- Máximo 5 bullets
- No exceder bajo ninguna circunstancia
- Frases claras y directas

CONTENIDO:
- Explicar de forma simple
- Reducir incertidumbre
- Basarse en hechos
- Mantener tono neutral

- NO:
  - prometer
  - exagerar
  - desviar la pregunta
`;

const promptDefault = `
Eres un asesor de vehículos.

${baseTruth}

OBJETIVO:
- Ayudar al usuario a entender cómo puede usar el sistema o aclarar su pregunta

FORMATO:
- Máximo 5 bullets
- Frases claras

COMPORTAMIENTO:

- Si la pregunta es sobre cómo usar el sistema:
  → explicar con ejemplos concretos

- Si la pregunta es ambigua:
  → pedir aclaración

- No inventar capacidades
`;

// =========================
// SELECTOR DE PROMPT
// =========================

function getPrompt(mapsInput) {
  let maps = Array.isArray(mapsInput) ? mapsInput : [];

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

  return { prompt: promptDefault, type: "default" };
}

// =========================
// MAIN RENDER
// =========================

export async function render({ message, data, maps = [] }) {
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

    if (typeof output !== "string" || !output.trim()) {
      return "No hay información disponible";
    }

    return output;

  } catch (e) {
    console.error("RENDER ERROR:", e?.message);
    return "No hay información disponible";
  }
}
