export async function callLLM(prompt) {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "mistral-small",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2
    })
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("LLM error:", text);
    throw new Error("LLM_REQUEST_FAILED");
  }

  const json = await res.json();

  const content = json?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("LLM_EMPTY_RESPONSE");
  }

  return content;
}
