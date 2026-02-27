// PATH: api/sim/start.js

import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
    }

    const { mode } = req.body || {};

    if (!mode || !["compra", "venta"].includes(mode)) {
      return res.status(400).json({ error: "INVALID_MODE" });
    }

    /* =========================
       1️⃣ Leer perfiles SIEMPRE como string
       ========================= */

    const profilesKey =
      mode === "compra"
        ? "cidef:sim:buyer_profiles:v1"
        : "cidef:sim:seller_profiles:v1";

    const exists = await kv.sendCommand(["EXISTS", profilesKey]);

    if (!exists) {
      return res.status(500).json({
        error: "PROFILES_KEY_NOT_FOUND",
        key: profilesKey
      });
    }

    const rawProfiles = await kv.sendCommand(["GET", profilesKey]);

    if (!rawProfiles) {
      return res.status(500).json({
        error: "PROFILES_EMPTY",
        key: profilesKey
      });
    }

    let profilesData;

    try {
      profilesData = JSON.parse(rawProfiles);
    } catch (err) {
      return res.status(500).json({
        error: "PROFILES_INVALID_JSON"
      });
    }

    if (!profilesData?.profiles?.length) {
      return res.status(500).json({
        error: "PROFILES_STRUCTURE_INVALID"
      });
    }

    const profiles = profilesData.profiles;

    /* =========================
       2️⃣ Evitar repetir consecutivo
       ========================= */

    const lastProfileKey = `cidef:sim:last_profile:${mode}:v1`;
    const lastProfileId = await kv.sendCommand(["GET", lastProfileKey]);

    let availableProfiles = profiles;

    if (lastProfileId && profiles.length > 1) {
      availableProfiles = profiles.filter(
        (p) => p.id !== lastProfileId
      );
    }

    /* =========================
       3️⃣ Elegir perfil aleatorio
       ========================= */

    const randomIndex = Math.floor(
      Math.random() * availableProfiles.length
    );

    const selectedProfile = availableProfiles[randomIndex];

    /* =========================
       4️⃣ Generar sim_run_id
       ========================= */

    const sim_run_id =
      "sim_" +
      Date.now() +
      "_" +
      Math.random().toString(36).slice(2, 8);

    /* =========================
       5️⃣ Crear estado inicial
       ========================= */

    const stateKey = `cidef:sim:run:${sim_run_id}:state:v1`;

    await kv.sendCommand([
      "SET",
      stateKey,
      JSON.stringify({
        sim_run_id,
        mode,
        profile_id: selectedProfile.id,
        turn: 0,
        created_at: Date.now(),
        finished: false
      })
    ]);

    /* =========================
       6️⃣ Guardar último perfil
       ========================= */

    await kv.sendCommand([
      "SET",
      lastProfileKey,
      selectedProfile.id
    ]);

    /* =========================
       7️⃣ Responder
       ========================= */

    return res.status(200).json({
      sim_run_id,
      mode,
      profile: selectedProfile
    });

  } catch (error) {
    console.error("SIM_START_FATAL:", error);
    return res.status(500).json({
      error: "SIM_START_INTERNAL_ERROR"
    });
  }
}
