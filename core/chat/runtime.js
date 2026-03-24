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
} from "../trace.js";

import { callLLM } from "../../services/llm/callLLM.js";
import { runTool } from "../../services/tools.js";

export async function runRuntime({ messages, trace, baseUrl }) {
  let state = "START";
  let steps = 0;

  setState(trace, state);

  while (steps++ < 8) {
    incrementIteration(trace);

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
      setOutput(trace, { message });
      return { message };
    }

    messages.push(llmResponse);

    const toolCalls = llmResponse.tool_calls || [];
    const hasTools = toolCalls.length > 0;
    const hasContent =
      typeof llmResponse.content === "string" &&
      llmResponse.content.trim() !== "";

    // START → debe llamar decideMaps
    if (state === "START") {
      if (!hasTools) {
        return { message: "No hay información disponible" };
      }

      const name = toolCalls[0]?.function?.name || toolCalls[0]?.name;

      if (name !== "decideMaps") {
        return { message: "No hay información disponible" };
      }

      state = "DECIDE";
      setState(trace, state);
    }

    // TOOL HANDLING
    if (hasTools) {
      if (toolCalls.length !== 1) {
        return { message: "Error en tools" };
      }

      const toolCall = toolCalls[0];
      const name = toolCall.function?.name || toolCall.name;

      let args = {};
      try {
        const raw =
          toolCall.function?.arguments || toolCall.arguments || "{}";
        args = JSON.parse(raw);
      } catch {
        return { message: "Error en tools" };
      }

      addToolCall(trace, {
        name,
        args,
        toolCallId: toolCall.id,
        state,
      });

      console.log("TOOL CALL:", name, args);

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

        console.log("TOOL RESULT:", result);
      } catch (error) {
        setError(trace, error, { reason: "tool_execution_failed" });
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

      // 🔥 DECIDE → FORZAR EXECUTE
      if (name === "decideMaps") {
        state = "DECIDE_DONE";
        setState(trace, state);

        const maps = result?.maps || {};

        const hasData = Object.values(maps).some(
          (v) => v && (Array.isArray(v) ? v.length > 0 : true)
        );

        if (!hasData) {
          return { message: "No hay información disponible" };
        }

        const topic = Object.keys(maps)[0];

        // 🔥 EXTRAER MODELOS DESDE MAPS
        let models = [];

        const mapData = maps[topic];

        if (Array.isArray(mapData)) {
          models = mapData
            .map((item) => item?.modelo || item?.model || item?.name)
            .filter(Boolean);
        } else if (mapData?.modelos) {
          models = mapData.modelos;
        }

        if (!models.length) {
          models = [];
        }

        console.log("MODELS EXTRACTED:", models);

        console.log("FORCED EXECUTE:", topic, models);

        let executeResult;
        try {
          executeResult = await runTool({
            name: "executePayload",
            args: {
              topic,
              models,
              trace_id: trace.trace_id,
            },
            baseUrl,
          });

          console.log("EXECUTE RESULT:", executeResult);
        } catch (error) {
          setError(trace, error, { reason: "execute_failed" });
          return { message: "Error en backend" };
        }

        addToolResult(trace, {
          name: "executePayload",
          result: executeResult,
          state,
          ok: true,
        });

        messages.push({
          role: "tool",
          tool_call_id: "forced_execute",
          content: JSON.stringify(executeResult),
        });

        state = "EXECUTE_DONE";
        setState(trace, state);

        continue;
      }

      if (name === "executePayload") {
        state = "EXECUTE_DONE";
        setState(trace, state);
        continue;
      }
    }

    // RESPUESTA FINAL
    if (hasContent) {
      setOutput(trace, {
        message: llmResponse.content,
      });

      return { message: llmResponse.content };
    }

    return { message: "No hay información disponible" };
  }

  return { message: "Error: límite de iteraciones alcanzado" };
}
