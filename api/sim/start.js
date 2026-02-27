// PATH: api/sim/start.js

import { kv } from "@vercel/kv";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const { mode } = req.body || {};

  if (!mode || !["compra", "venta"].includes(mode)) {
    return res.status(400).json({
      error: "INVALID_MODE",
    });
  }

  /* =========================
     1️⃣ Leer perfiles
     ========================= */

  const profilesKey =
    mode === "compra"
      ? "cidef:sim:buyer_profiles:v1"
      : "cidef:sim:seller_profiles:v1";

  const profilesData = await kv.get(profilesKey);

  if (!profilesData?.profiles?.length) {
    return res.status(500).json({
      error: "PROFILES_NOT_FOUND",
    });
  }

  const profiles = profilesData.profiles;

  /* =========================
     2️⃣ Evitar repetir perfil consecutivo
     ========================= */

  const lastProfileKey = `cidef:sim:last_profile:${mode}:v1`;
  const lastProfileId = await kv.get(lastProfileKey);

  let availableProfiles = profiles;

  if (lastProfileId && profiles.length > 1) {
    availableProfiles = profiles.filter(p => p.id !== lastProfileId);
  }

  /* =========================
     3️⃣ Elegir perfil aleatorio
     ========================= */

  const randomIndex = Math.floor(Math.random() * availableProfiles.length);
  const selectedProfile = availableProfiles[randomIndex];

  /* =========================
     4️⃣ Generar sim_run_id
     ========================= */

  const sim_run_id = `sim_${crypto.randomUUID()}`;

  /* =========================
     5️⃣ Crear estado inicial
     ========================= */

  const stateKey = `cidef:sim:run:${sim_run_id}:state:v1`;

  await kv.set(stateKey, {
    sim_run_id,
    mode,
    profile_id: selectedProfile.id,
    turn: 0,
    created_at: Date.now(),
    finished: false
  });

  /* =========================
     6️⃣ Guardar último perfil
     ========================= */

  await kv.set(lastProfileKey, selectedProfile.id);

  /* =========================
     7️⃣ Responder
     ========================= */

  return res.status(200).json({
    sim_run_id,
    mode,
    profile: selectedProfile
  });
}
