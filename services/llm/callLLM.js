// /services/llm/callLLM.js

export async function callLLM(prompt) {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
      }),
    });

    const data = await res.json();

    return data?.choices?.[0]?.message?.content || "";

  } catch (err) {
    console.error("LLM_ERROR:", err);
    return "";
  }
}
