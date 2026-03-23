// /core/chat/runtime.js

import {
  addLLMRequest,
  addLLMResponse,
  addToolCall,
  addToolResult,
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

    // =========================
    // LLM CALL
    // =========================
    addLLMRequest(trace, messages);

    let llmResponse;
    try {
      llmResponse = await callLLM(messages);
    } catch (error) {
      setError(trace, error, { reason: "llm_call_failed" });
      return { message: "Error en LLM" };
    }

    addLLMResponse(trace, llmResponse);

    if (!llmResponse) {
      const message = "No hay información disponible";
      setOutput(trace, { message, source: "fallback" });
      return { message };
    }

    messages.push(llmResponse);

    const toolCalls = llmResponse.tool_calls || [];
    const hasTools = toolCalls.length > 0;
    const hasContent =
      typeof llmResponse.content === "string" &&
      llmResponse.content.trim() !== "";

    // =========================
    // VALIDACIÓN START
    // =========================
    if (state === "START") {
      if (!hasTools) {
        setError(trace, new Error("START must call decideMaps"), {
          reason: "invalid_start_no_tool",
        });
        return { message: "Error: flujo inválido" };
      }

      const name = toolCalls[0]?.function?.name || toolCalls[0]?.name;

      if (name !== "decideMaps") {
        setError(trace, new Error("Invalid first tool"), {
          reason: "invalid_first_tool",
          tool: name,
        });
        return { message: "Error: flujo inválido" };
      }

      state = "DECIDE";
      setState(trace, state);
    }

    // =========================
    // TOOL EXECUTION
    // =========================
    if (hasTools) {
      if (toolCalls.length !== 1) {
        setError(trace, new Error("Multiple tool calls"), {
          reason: "multiple_tool_calls",
        });
        return { message: "Error en tools" };
      }

      const toolCall = toolCalls[0];
      const name = toolCall.function?.name || toolCall.name;

      // VALIDAR ORDEN
      if (state === "DECIDE" && name !== "decideMaps") {
        return { message: "Error: flujo inválido" };
      }

      if (state === "DECIDE_DONE" && name !== "executePayload") {
        return { message: "Error: flujo inválido" };
      }

      if (state === "EXECUTE_DONE") {
        return { message: "Error: flujo inválido" };
      }

      // PARSE ARGS
      let args = {};
      try {
        const raw =
          toolCall.function?.arguments || toolCall.arguments || "{}";
        args = JSON.parse(raw);
      } catch (error) {
        setError(trace, error, {
          reason: "invalid_tool_args",
          tool: name,
        });
        return { message: "Error en tools" };
      }

      addToolCall(trace, {
        name,
        args,
        toolCallId: toolCall.id,
        state,
      });

      // EXECUTE
      let result;
      try {
        result = await runTool({
          name,
          args: {
            ...args,
            trace_id: trace.trace_id,
          },
          baseUrl,
        });
      } catch (error) {
        setError(trace, error, {
          reason: "tool_execution_failed",
          tool: name,
        });
        return { message: "Error en backend" };
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

      // TRANSICIONES
      if (name === "decideMaps") {
        state = "DECIDE_DONE";
        setState(trace, state);
      }

      if (name === "executePayload") {
        state = "EXECUTE_DONE";
        setState(trace, state);
      }

      continue;
    }

    // =========================
    // RESPUESTA FINAL
    // =========================
    if (hasContent) {
      setOutput(trace, {
        message: llmResponse.content,
        source: "llm",
      });

      return { message: llmResponse.content };
    }

    // fallback duro
    const message = "No hay información disponible";

    setOutput(trace, {
      message,
      source: "fallback",
    });

    return { message };
  }

  const message = "Error: límite de iteraciones alcanzado";

  setOutput(trace, {
    message,
    source: "guardrail",
  });

  return { message };
}
