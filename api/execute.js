// PATH: api/execute.js

import { kv } from "@vercel/kv";

import executeNormal from "./execute.normal.js";
import executeBuyer from "./execute.buyer.js";
import executeSeller from "./execute.seller.js";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  let body = req.body || {};
  let { sim = null, sim_run_id = null } = body;

  try {

    // 1️⃣ Ejecutar siempre payload normal
    const normalPayload = await executeNormal(body);

    if (!normalPayload || normalPayload.error) {
      return res.status(400).json(
        normalPayload || { error: "EXECUTE_NORMAL_FAILED" }
      );
    }

    // 2️⃣ Si no hay SIM activo → responder normal
    if (!sim && !sim_run_id) {
      return res.status(200).json(normalPayload);
    }

    // 3️⃣ Si hay run pero no viene sim → recuperar modo desde KV
    if (!sim && sim_run_id) {

      const state = await kv.get(
        `cidef:sim:run:${sim_run_id}:state:v1`
      );

      if (!state) {
        return res.status(400).json({
          error: "SIM_RUN_NOT_FOUND",
          sim_run_id
        });
      }

      sim = state.mode;

      // 🔧 normalizar body para módulos downstream
      body = {
        ...body,
        sim
      };
    }

    // 4️⃣ Ejecutar modo correcto

    if (sim === "compra") {

      const simBlock = await executeBuyer(body);

      return res.status(200).json({
        ...normalPayload,
        sim: simBlock
      });

    }

    if (sim === "venta") {

      const simBlock = await executeSeller(body);

      return res.status(200).json({
        ...normalPayload,
        sim: simBlock
      });

    }

    return res.status(400).json({ error: "INVALID_SIM_MODE" });

  }
  catch (err) {

    console.error("EXECUTE_FATAL:", err);

    return res.status(500).json({
      error: "EXECUTE_INTERNAL_ERROR"
    });

  }

}
