// /core/chat/runtime.js

import {
  addLLMRequest,
  addLLMResponse,
  addToolCall,
  addToolResult,
  addDecision,
  setState,
  incrementIteration,
  setOutput,
  setError,
} from "@/core/trace";

import { callLLM } from "@/core/llm";
import { runTool } from "@/core/tools";

export async function runRuntime({ messages, trace, baseUrl }) {
  let state = "START";
  let steps = 0;

  setState(trace, state);

  while (steps++ < 8) {
    incrementIteration(trace);

    addLLMRequest(trace, messages);
    const llmResponse = await callLLM(messages);
    addLLMResponse(trace, llmResponse);

    if (!llmResponse) {
      const message = "No hay información disponible";

      setOutput(trace, {
        message,
        source: "fallback",
        reason: "empty_llm_response",
      });

      return { message };
    }

    messages.push(llmResponse);

    const toolCalls = llmResponse.tool_calls || [];
    const hasTools = toolCalls.length > 0;
    const hasContent =
      llmResponse.content && llmResponse.content.trim() !== "";

    // =========================
    // START
    // =========================
    if (state === "START") {
      if (!hasTools && hasContent) {
        addDecision(trace, {
          state,
          decision: "direct_response_from_start",
        });

        const message = llmResponse.content;

        setOutput(trace, {
          message,
          source: "llm",
          reason: "answered_in_start",
        });

        return { message };
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
          const message = "Error: flujo inválido (esperado decideMaps)";

          setOutput(trace, {
            message,
            source: "guardrail",
            reason: "invalid_first_tool",
          });

          return { message };
        }
      }
    }

    // =========================
    // TOOLS
    // =========================
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

          return { message: "Error en formato de tools" };
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

          return { message: error.message || "Error en backend" };
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

    // =========================
    // DECIDE_DONE
    // =========================
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

    // =========================
    // DECIDE_EVAL
    // =========================
    if (state === "DECIDE_EVAL") {
      if (hasTools) continue;

      if (hasContent) {
        const message = llmResponse.content;

        setOutput(trace, {
          message,
          source: "llm",
          reason: "respond_after_decide_eval",
        });

        return { message };
      }

      const message = "No hay información disponible";

      setOutput(trace, {
        message,
        source: "fallback",
        reason: "empty_after_decide_eval",
      });

      return { message };
    }

    // =========================
    // EXECUTE_DONE
    // =========================
    if (state === "EXECUTE_DONE") {
      if (hasContent) {
        const message = llmResponse.content;

        setOutput(trace, {
          message,
          source: "llm",
          reason: "respond_after_execute",
        });

        return { message };
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

    // =========================
    // RESPOND
    // =========================
    if (state === "RESPOND") {
      if (hasContent) {
        const message = llmResponse.content;

        setOutput(trace, {
          message,
          source: "llm",
          reason: "respond_state_final",
        });

        return { message };
      }

      const message = "No hay información disponible";

      setOutput(trace, {
        message,
        source: "fallback",
        reason: "empty_in_respond_state",
      });

      return { message };
    }
  }

  const message = "Error: límite de iteraciones alcanzado";

  setOutput(trace, {
    message,
    source: "guardrail",
    reason: "max_iterations",
  });

  return { message };
}
