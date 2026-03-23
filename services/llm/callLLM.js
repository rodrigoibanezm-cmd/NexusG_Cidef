// /services/llm/callLLM.js

export async function callLLM(messages) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
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

    if (!res.ok) {
      throw new Error(`LLM HTTP error: ${res.status}`);
    }

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("Invalid JSON from LLM");
    }

    const message = data?.choices?.[0]?.message;

    if (!message) {
      return null;
    }

    return {
      content: message.content ?? "",
      tool_calls: Array.isArray(message.tool_calls)
        ? message.tool_calls
        : [],
    };
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("LLM timeout");
    }

    throw new Error(`LLM error: ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }
}
