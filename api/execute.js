// PATH: api/execute.js

import executeNormal from "./execute.normal.js";
import executeBuyer from "./execute.buyer.js";
import executeSeller from "./execute.seller.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const body = req.body || {};
  const { sim = null } = body;

  try {
    // 1️⃣ Siempre obtener primero el payload normal
    const normalPayload = await executeNormal(body);

    if (!normalPayload || normalPayload.error) {
      return res.status(400).json(
        normalPayload || { error: "EXECUTE_NORMAL_FAILED" }
      );
    }

    // 2️⃣ Si no es modo sim → responder normal
    if (!sim) {
      return res.status(200).json(normalPayload);
    }

    // 3️⃣ Sim comprador
    if (sim === "compra") {
      const simBlock = await executeBuyer(body);
      return res.status(200).json({
        ...normalPayload,
        sim: simBlock,
      });
    }

    // 4️⃣ Sim vendedor
    if (sim === "venta") {
      const simBlock = await executeSeller(body);
      return res.status(200).json({
        ...normalPayload,
        sim: simBlock,
      });
    }

    // 5️⃣ Modo inválido
    return res.status(400).json({ error: "INVALID_SIM_MODE" });

  } catch (err) {
    console.error("EXECUTE_FATAL:", err);
    return res.status(500).json({ error: "EXECUTE_INTERNAL_ERROR" });
  }
}
