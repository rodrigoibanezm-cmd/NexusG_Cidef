// /api/chat.js

import { callLLM } from "../services/llm/callLLM.js";
import { systemPrompt } from "../services/llm/systemPrompt.js";
import { runTool } from "../services/tools/runTool.js";

export default async function handler(req, res) {
  // CORS
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
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
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
          message: llmResponse.content || "No hay información disponible.",
        });
      }

      // ejecutar tools
      for (const toolCall of llmResponse.tool_calls) {
        const { name, arguments: argsString } = toolCall.function;

        let args = {};
        try {
          args = JSON.parse(argsString || "{}");
        } catch {
          return res.status(500).json({ error: "invalid_tool_args" });
        }

        let result;

        try {
          result = await runTool({
            name,
            args,
            baseUrl,
          });
        } catch (err) {
          console.error("TOOL_ERROR:", err.message);

          return res.status(500).json({
            error: err.message || "tool_error",
          });
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
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
