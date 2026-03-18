export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    // 🔥 FIX CLAVE: parsear body correctamente
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const message = body?.message;

    if (!message) {
      return res.status(200).json({
        sessionId: "test-session",
        messages: [],
        error: "validation_error"
      });
    }

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

    // ✅ respuesta válida
    return res.status(200).json({
      sessionId: "test-session",
      messages: [
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `Respuesta a: ${message}`,
          timestamp: Date.now()
        }
      ],
      error: null
    });

  } catch (err) {
    return res.status(200).json({
      sessionId: "test-session",
      messages: [],
      error: "backend_error"
    });
  }
}
