//api/chat.js

import { callLLM } from "../services/llm/callLLM.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const { message } = req.body || {};

  if (!message) {
    return res.status(400).json({ error: "validation_error" });
  }

  try {
    let messages = [
      {
        role: "system",
        content: `
Sigue estrictamente:
- instrucciones.md
- decide.md
- execute.md
- contrato de verdad

Nunca inventes datos.
Usa tools cuando sea necesario.
`,
      },
      {
        role: "user",
        content: message,
      },
    ];

    const protocol = req.headers["x-forwarded-proto"] || "https";
    const baseUrl = `${protocol}://${req.headers.host}`;

    let steps = 0;

    while (steps++ < 10) {
      const llmResponse = await callLLM(messages);

      if (!llmResponse) {
        return res.status(500).json({ error: "llm_error" });
      }

      // CRÍTICO: guardar mensaje del LLM en contexto
      messages.push(llmResponse);

      // respuesta final
      if (!llmResponse.tool_calls || llmResponse.tool_calls.length === 0) {
        return res.status(200).json({
          content: llmResponse.content || "",
        });
      }

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
