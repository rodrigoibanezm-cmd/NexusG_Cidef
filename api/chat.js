let history = [];

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
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const message = body?.message;

    if (!message) {
      return res.status(200).json({
        sessionId: "test-session",
        messages: history,
        error: "validation_error"
      });
    }

    // agregar user
    history.push({
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: Date.now()
    });

    // agregar assistant
    history.push({
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: `Respuesta a: ${message}`,
      timestamp: Date.now()
    });

    return res.status(200).json({
      sessionId: "test-session",
      messages: history,
      error: null
    });

  } catch (err) {
    return res.status(200).json({
      sessionId: "test-session",
      messages: history,
      error: "backend_error"
    });
  }
}
