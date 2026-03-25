// /services/llm/render.js

import { callLLM } from "./callLLM.js";

export async function render({ message, data }) {
  if (!data) {
    return "No hay información disponible";
  }

  const renderPrompt = `
Responde usando SOLO la información entregada.

=========================
REGLAS
=========================

- Prohibido inventar
- Prohibido usar conocimiento externo
- Si falta información → "No hay información disponible"

=========================
FORMATO (OBLIGATORIO)
=========================

Elegir SOLO un modo:

1) FICHA (si la pregunta es técnica)
- encabezados markdown (##)
- bullets
- sin interpretación

2) INTERPRETACIÓN (si es recomendación/uso)
- máximo 5 bullets
- directo a valor
- sin explicación larga

Prohibido:
- mezclar modos
- escribir párrafos largos
- repetir información

=========================
DATA
=========================

Cada item tiene:
- modelo
- payload (información real)

Usa SOLO payload.

DATA:
${JSON.stringify(data)}
`;

  const response = await callLLM([
    { role: "system", content: renderPrompt },
    { role: "user", content: message },
  ]);

  if (!response || !response.content) {
    return "No hay información disponible";
  }

  return response.content;
}
