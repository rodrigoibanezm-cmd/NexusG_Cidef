// /services/llm/callLLM.js

export async function callLLM(messages) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.2,
        tools: [
          {
            type: "function",
            function: {
              name: "decideMaps",
              description:
                "Solicita mapas disponibles (cliente, comercial, ficha, mitos)",
              parameters: {
                type: "object",
                required: ["requested_maps"],
                properties: {
                  requested_maps: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: ["cliente", "comercial", "ficha", "mitos"],
                    },
                  },
                },
              },
            },
          },
          {
            type: "function",
            function: {
              name: "executePayload",
              description:
                "Solicita datos completos según topic y models",
              parameters: {
                type: "object",
                required: ["topic", "models"],
                properties: {
                  topic: {
                    type: "string",
                    enum: ["cliente", "comercial", "ficha", "mitos"],
                  },
                  models: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
            },
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error("LLM_HTTP_ERROR:", res.status);
      return { content: "Error al procesar la solicitud" };
    }

    const data = await res.json();
    const message = data?.choices?.[0]?.message;

    if (!message) {
      console.error("LLM_EMPTY_MESSAGE:", data);
      return { content: "Error al procesar la solicitud" };
    }

    if (!message.content && !message.tool_calls) {
      console.error("LLM_INVALID_OUTPUT:", message);
      return { content: "Error al procesar la solicitud" };
    }

    return message;

  } catch (err) {
    if (err.name === "AbortError") {
      console.error("LLM_TIMEOUT");
    } else {
      console.error("LLM_ERROR:", err);
    }

    return { content: "Error al procesar la solicitud" };
  }
}
