// PATH: api/execute.js

import executeNormal from "./execute.normal.js";
import executeBuyer from "./execute.buyer.js";
import executeSeller from "./execute.seller.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const { sim = null } = req.body || {};

  // 🔹 1️⃣ Siempre obtener payload normal primero
  const normalPayload = await executeNormal(req);

  if (!normalPayload || normalPayload.error) {
    return res.status(500).json(normalPayload || { error: "EXECUTE_NORMAL_FAILED" });
  }

  // 🔹 2️⃣ Si no es modo SIM → responder normal
  if (!sim) {
    return res.status(200).json(normalPayload);
  }

  // 🔹 3️⃣ Si es SIM compra
  if (sim === "compra") {
    const simBlock = await executeBuyer(req);

    return res.status(200).json({
      ...normalPayload,
      sim: simBlock
    });
  }

  // 🔹 4️⃣ Si es SIM venta
  if (sim === "venta") {
    const simBlock = await executeSeller(req);

    return res.status(200).json({
      ...normalPayload,
      sim: simBlock
    });
  }

  return res.status(400).json({
    error: "INVALID_SIM_MODE",
  });
}
