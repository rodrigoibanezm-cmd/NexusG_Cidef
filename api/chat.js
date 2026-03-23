// /api/chat.js

import { callLLM } from "../services/llm/callLLM.js";

export default async function handler(req, res) {
  // =========================
  // CORS
  // =========================
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const { message } = req.body || {};

  if (!message) {
    return res.status(400).json({ error: "validation_error" });
  }

  try {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const baseUrl = `${protocol}://${req.headers.host}`;

    let messages = [
      {
        role: "system",
        content: `
Sigue estrictamente:
- instrucciones.md
- decide.md
- execute.md
- contrato de verdad

=========================
FORMATO DE RESPUESTA
=========================

1. Si es información factual (ficha, specs):
- usar encabezados markdown (##, ###)
- cada sección con bullets
- sin interpretación
- sin prosa

2. Si es interpretación (recomendación, uso, cliente ideal):
- máximo 5 bullets
- bullets cortos
- directo a valor
- sin prosa larga

- Elige el modo según la intención principal del usuario.
- elegir SOLO un modo (ficha o interpretación)
- NO mezclar ambos en la misma respuesta

=========================
USO DE TOOLS (OBLIGATORIO)
=========================

- Si la respuesta requiere datos del negocio → SIEMPRE usar tools
- Nunca responder sin backend si hay datos verificables
- Si hay un objeto de dominio (modelo, producto, categoría) → backend obligatorio

SECUENCIA:

1. decideMaps si necesitas conocer qué datos existen
2. analizar los mapas recibidos
3. executePayload si necesitas datos completos
4. responder SOLO con esa información

PROHIBIDO:

- responder sin usar tools cuando se requieren datos
- saltarse decideMaps si no tienes contexto
- usar conocimiento previo
- inventar o completar información

- Si ningún mapa aplica → no llamar a executePayload
- Si todos los datos devueltos son null → responder exactamente:
  "No hay información disponible."

=========================
REGLAS CRÍTICAS
=========================

- usar SOLO datos del backend
- NO inventar
- NO usar conocimiento externo
- NO completar vacíos
- NO mencionar JSON ni backend
`,
      },
      {
        role: "user",
        content: message,
      },
    ];

    let steps = 0;

    while (steps++ < 10) {
      const llmResponse = await callLLM(messages);

      if (!llmResponse) {
        return res.status(500).json({ error: "llm_error" });
      }

      messages.push(llmResponse);

      // respuesta final
      if (!llmResponse.tool_calls || llmResponse.tool_calls.length === 0) {
        return res.status(200).json({
          content: llmResponse.content || "",
        });
      }

      // ejecutar tools
      for (const toolCall of llmResponse.tool_calls) {
        const { name, arguments: argsString } = toolCall.function;

        if (!["decideMaps", "executePayload"].includes(name)) {
          return res.status(500).json({ error: "unknown_tool" });
        }

        let args = {};
        try {
          args = JSON.parse(argsString || "{}");
        } catch {
          return res.status(500).json({ error: "invalid_tool_args" });
        }

        let toolResult = null;

        if (name === "decideMaps") {
          const r = await fetch(`${baseUrl}/api/decide`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requested_maps: args.requested_maps || [],
            }),
          });

          if (!r.ok) {
            return res.status(500).json({ error: "decide_http_error" });
          }

          toolResult = await r.json();
        }

        if (name === "executePayload") {
          const r = await fetch(`${baseUrl}/api/execute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topic: args.topic,
              models: args.models || [],
            }),
          });

          if (!r.ok) {
            return res.status(500).json({ error: "execute_http_error" });
          }

          toolResult = await r.json();
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }
    }

    return res.status(500).json({ error: "tool_loop_limit" });

  } catch (err) {
    console.error("CHAT_ERROR:", err);

    return res.status(500).json({
      error: "backend_error",
    });
  }
}
