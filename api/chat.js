export default async function handler(req, res) {
  // ✅ CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ manejar preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const { message } = req.body || {};

    if (message === "error") {
      return res.status(200).json({
        sessionId: "test-session",
        messages: [],
        error: "backend_error"
      });
    }

    if (message === "invalid") {
      return res.status(200).send("esto no es json");
    }

    return res.status(200).json({
      sessionId: "test-session",
      messages: [
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Hola, esto es una respuesta de prueba",
          timestamp: Date.now()
        }
      ],
      error: null
    });

  } catch (err) {
    return res.status(500).json({
      sessionId: null,
      messages: [],
      error: "backend_error"
    });
  }
}
