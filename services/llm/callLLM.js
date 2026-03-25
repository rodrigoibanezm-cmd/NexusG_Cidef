// /services/llm/callLLM.js

export async function callLLM(
  messages,
  { retries = 1, timeout = 8000 } = {}
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1",
          messages,
          temperature: 0.2,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`LLM_HTTP_${res.status}`);
      }

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("LLM_INVALID_JSON");
      }

      const message = data?.choices?.[0]?.message;

      if (!message) {
        throw new Error("LLM_EMPTY_RESPONSE");
      }

      // opcional: métricas de uso
      // console.log("LLM USAGE:", data?.usage);

      return {
        content: message.content ?? "",
        tool_calls: [],
      };

    } catch (err) {
      // último intento → lanzar error
      if (attempt === retries) {
        if (err.name === "AbortError") {
          throw new Error("LLM_TIMEOUT");
        }

        if (err.message?.startsWith("LLM_HTTP_")) {
          throw err;
        }

        if (err.message === "LLM_INVALID_JSON") {
          throw err;
        }

        throw new Error(`LLM_ERROR: ${err.message}`);
      }

      // ⏱️ backoff progresivo
      await new Promise(r => setTimeout(r, 300 * (attempt + 1)));

    } finally {
      clearTimeout(timer);
    }
  }
}
