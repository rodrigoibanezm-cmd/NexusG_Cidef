// PATH: api/decide.js
// LINES: 26

import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ maps: {} });
  }

  const { trace_id = null, requested_maps = [] } = req.body || {};

  const maps = {};

  for (const key of requested_maps) {
    maps[key] = (await kv.get(key)) ?? null;
  }

  res.status(200).json({
    trace_id,
    maps,
  });
}
