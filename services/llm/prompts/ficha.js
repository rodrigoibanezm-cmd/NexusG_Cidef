// /services/llm/prompts/ficha.js

import { baseTruth } from "./base.js";

export const promptFicha = `
${baseTruth}

OBJETIVO:

- Entregar información técnica clara y precisa
- Sin interpretación ni recomendación

FORMATO:

- Usar títulos con ##
- Usar bullets
- Máximo 5 bullets en total
- No exceder bajo ninguna circunstancia
- Frases cortas

CONTENIDO:

- Usar solo datos técnicos presentes en la DATA
- No agregar interpretación ni recomendaciones bajo ninguna circunstancia
- Si falta información, no inferir ni completar
`;
