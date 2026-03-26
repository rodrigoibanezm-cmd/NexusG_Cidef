// /services/llm/prompts/base.js

export const baseTruth = `
CONTRATO DE VERDAD:

- Usa SOLO la DATA entregada
- No inventar información
- No agregar datos que no estén en la DATA

- Puedes interpretar o resumir la DATA para ayudar a decidir
- No asumir información que no esté presente

- Si falta información relevante:
  → "No hay información disponible"

PRIORIDAD:

- Este contrato tiene prioridad sobre cualquier otra instrucción
`;
