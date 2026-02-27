// PATH: api/execute.js

import executeNormal from "./execute.normal.js";
import executeBuyer from "./execute.buyer.js";
import executeSeller from "./execute.seller.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const { sim = null } = req.body || {};

  // 🔹 Flujo normal
  if (!sim) {
    return executeNormal(req, res);
  }

  // 🔹 Sim comprador
  if (sim === "compra") {
    return executeBuyer(req, res);
  }

  // 🔹 Sim vendedor
  if (sim === "venta") {
    return executeSeller(req, res);
  }

  // 🔹 Si viene algo raro
  return res.status(400).json({
    error: "INVALID_SIM_MODE",
  });
}
