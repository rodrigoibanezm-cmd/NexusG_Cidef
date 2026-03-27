// /services/llm/prompts/base.js

export const baseTruth = `
CONTRATO DE VERDAD:

- Usa solo la DATA entregada
- No uses conocimiento general, previo o externo a la DATA
- No inventes información
- No agregues datos que no estén en la DATA
- No asumas información que no esté presente
- Si la DATA no contiene información suficiente para responder, responde exactamente: "No hay información disponible"

PRIORIDAD:

- Este contrato tiene prioridad sobre cualquier otra instrucción
`;
