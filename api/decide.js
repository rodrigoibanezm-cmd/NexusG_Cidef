// PATH: api/decide.js
// LINES: 26

import { kv } from "@vercel/kv";

/**
 * Router lógico → key real en KV
 * El ROM usa: cliente | comercial | ficha | mitos
 * KV guarda: mapa:*:light
 */
const MAP_ROUTER = {
  cliente: "mapa:cliente:light",
  comercial: "mapa:comercial:light",
  ficha: "mapa:ficha:light",
  mitos: "mapa:mitos:light",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ maps: {} });
  }

  const { trace_id = null, requested_maps = [] } = req.body || {};

  const maps = {};

  for (const logicalMap of requested_maps) {
    const kvKey = MAP_ROUTER[logicalMap];
    maps[logicalMap] = kvKey ? (await kv.get(kvKey)) ?? null : null;
  }

  res.status(200).json({
    trace_id,
    maps,
  });
}
