export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const { message } = req.body || {};

    // 🔴 Simular error backend
    if (message === "error") {
      return res.status(200).json({
        sessionId: "test-session",
        messages: [],
        error: "backend_error"
      });
    }

    // 🔴 Simular respuesta inválida
    if (message === "invalid") {
      return res.status(200).send("esto no es json");
    }

    // 🟢 Respuesta normal
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
