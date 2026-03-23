import {
  createTrace,
  addStep,
  setState,
  incrementIteration,
  addLLMRequest,
  addLLMResponse,
  addToolCall,
  addToolResult,
  addDecision,
  addNote,
  setOutput,
  setError,
  toSerializableTrace,
} from "@/core/trace";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const { message } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: "validation_error" });
  }

  const trace = createTrace({ message });

  try {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const baseUrl = `${protocol}://${req.headers.host}`;

    let messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ];

    let state = "START";
    let steps = 0;

    addNote(trace, "chat_start", { baseUrl });
    setState(trace, state);

    while (steps++ < 8) {
      incrementIteration(trace);

      addLLMRequest(trace, messages);
      const llmResponse = await callLLM(messages);
      addLLMResponse(trace, llmResponse);

      if (!llmResponse) {
        const finalMessage = "No hay información disponible";
        setOutput(trace, {
          message: finalMessage,
          source: "fallback",
          reason: "empty_llm_response",
        });

        return res.status(200).json({
          message: finalMessage,
          trace: toSerializableTrace(trace),
        });
      }

      messages.push(llmResponse);

      const toolCalls = llmResponse.tool_calls || [];
      const hasTools = toolCalls.length > 0;
      const hasContent =
        llmResponse.content && llmResponse.content.trim() !== "";

      if (state === "START") {
        if (!hasTools && hasContent) {
          addDecision(trace, {
            state,
            decision: "direct_response_from_start",
          });

          const finalMessage = llmResponse.content;
          setOutput(trace, {
            message: finalMessage,
            source: "llm",
            reason: "answered_in_start",
          });

          return res.status(200).json({
            message: finalMessage,
            trace: toSerializableTrace(trace),
          });
        }

        if (hasTools) {
          const firstToolName =
            toolCalls[0].function?.name || toolCalls[0].name;

          if (firstToolName === "decideMaps") {
            state = "DECIDE";
            setState(trace, state, {
              trigger: "tool_detected",
              tool: firstToolName,
            });
          } else {
            const finalMessage = "Error: flujo inválido (esperado decideMaps)";
            setOutput(trace, {
              message: finalMessage,
              source: "guardrail",
              reason: "invalid_first_tool",
            });

            return res.status(200).json({
              message: finalMessage,
              trace: toSerializableTrace(trace),
            });
          }
        }
      }

      if (hasTools) {
        for (const toolCall of toolCalls) {
          const name = toolCall.function?.name || toolCall.name;
          const argsString =
            toolCall.function?.arguments || toolCall.arguments;

          let args = {};
          try {
            args = JSON.parse(argsString || "{}");
          } catch (error) {
            setError(trace, error, {
              reason: "invalid_tool_arguments_json",
              tool: name,
              raw_arguments: argsString,
            });

            return res.status(200).json({
              message: "Error en formato de tools",
              trace: toSerializableTrace(trace),
            });
          }

          addToolCall(trace, {
            name,
            args,
            toolCallId: toolCall.id,
            state,
          });

          let result;
          try {
            result = await runTool({
              name,
              args,
              baseUrl,
            });
          } catch (error) {
            setError(trace, error, {
              reason: "tool_execution_failed",
              tool: name,
              args,
            });

            return res.status(200).json({
              message: error.message || "Error en backend",
              trace: toSerializableTrace(trace),
            });
          }

          addToolResult(trace, {
            name,
            result,
            state,
            ok: true,
          });

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });

          if (name === "decideMaps") {
            state = "DECIDE_DONE";
            setState(trace, state, { tool: name });
          }

          if (name === "executePayload") {
            state = "EXECUTE_DONE";
            setState(trace, state, { tool: name });
          }
        }

        continue;
      }

      if (state === "DECIDE_DONE") {
        addDecision(trace, {
          state,
          decision: "request_execute_or_respond",
        });

        messages.push({
          role: "system",
          content:
            "Analiza los mapas recibidos. Si hay datos relevantes, debes llamar executePayload. Si no hay datos, responde.",
        });

        state = "DECIDE_EVAL";
        setState(trace, state);
        continue;
      }

      if (state === "DECIDE_EVAL") {
        if (hasTools) continue;

        if (hasContent) {
          const finalMessage = llmResponse.content;
          setOutput(trace, {
            message: finalMessage,
            source: "llm",
            reason: "respond_after_decide_eval",
          });

          return res.status(200).json({
            message: finalMessage,
            trace: toSerializableTrace(trace),
          });
        }

        const finalMessage = "No hay información disponible";
        setOutput(trace, {
          message: finalMessage,
          source: "fallback",
          reason: "empty_after_decide_eval",
        });

        return res.status(200).json({
          message: finalMessage,
          trace: toSerializableTrace(trace),
        });
      }

      if (state === "EXECUTE_DONE") {
        if (hasContent) {
          const finalMessage = llmResponse.content;
          setOutput(trace, {
            message: finalMessage,
            source: "llm",
            reason: "respond_after_execute",
          });

          return res.status(200).json({
            message: finalMessage,
            trace: toSerializableTrace(trace),
          });
        }

        messages.push({
          role: "system",
          content: "Con los datos recibidos, genera la respuesta final ahora.",
        });

        state = "RESPOND";
        setState(trace, state, {
          trigger: "force_final_response",
        });

        continue;
      }

      if (state === "RESPOND") {
        if (hasContent) {
          const finalMessage = llmResponse.content;
          setOutput(trace, {
            message: finalMessage,
            source: "llm",
            reason: "respond_state_final",
          });

          return res.status(200).json({
            message: finalMessage,
            trace: toSerializableTrace(trace),
          });
        }

        const finalMessage = "No hay información disponible";
        setOutput(trace, {
          message: finalMessage,
          source: "fallback",
          reason: "empty_in_respond_state",
        });

        return res.status(200).json({
          message: finalMessage,
          trace: toSerializableTrace(trace),
        });
      }
    }

    const finalMessage = "Error: límite de iteraciones alcanzado";
    setOutput(trace, {
      message: finalMessage,
      source: "guardrail",
      reason: "max_iterations",
    });

    return res.status(200).json({
      message: finalMessage,
      trace: toSerializableTrace(trace),
    });
  } catch (error) {
    console.error("CHAT_ERROR:", error);
    setError(trace, error, { reason: "unhandled_handler_error" });

    return res.status(200).json({
      message: "Error interno del sistema",
      trace: toSerializableTrace(trace),
    });
  }
}
