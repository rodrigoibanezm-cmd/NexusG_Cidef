import execute from "./execute.js";

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
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const message = body?.message;
    const mode = body?.metadata?.mode;

    if (!message) {
      return res.status(200).json({
        sessionId: "test-session",
        messages: history,
        error: "validation_error",
      });
    }

    // 🔥 llamada a tu lógica real
    const execResponse = await execute({
      ...body,
      sim: mode === "venta" ? "venta" : null,
    });

    // 🔥 transformar respuesta a texto
    let content = "";

    if (execResponse?.data) {
      content = JSON.stringify(execResponse.data, null, 2);
    } else if (execResponse?.sim) {
      content = JSON.stringify(execResponse.sim, null, 2);
    } else {
      content = "Sin datos disponibles";
    }

    // 🔥 mantener historial
    history.push({
      role: "user",
      content: message,
    });

    history.push({
      role: "assistant",
      content,
    });

    return res.status(200).json({
      sessionId: "test-session",
      messages: history,
      error: null,
    });

  } catch (err) {
    console.error(err);

    return res.status(200).json({
      sessionId: "test-session",
      messages: history,
      error: "backend_error",
    });
  }
}
