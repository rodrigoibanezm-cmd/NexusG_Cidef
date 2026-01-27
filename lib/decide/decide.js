// PATH: api/decide.ts
// LINES: 55

import { kv } from "@vercel/kv"
import type { VercelRequest, VercelResponse } from "@vercel/node"

const ALLOWLIST = new Set([
  "mapa:cliente:light",
  "mapa:comercial:light",
  "mapa:tecnico:light",
  "mapa:mitos:light"
])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end()

  const { trace_id, requested_maps } = req.body || {}
  if (!trace_id || !Array.isArray(requested_maps)) {
    return res.status(400).json({ error: "BAD_REQUEST" })
  }

  const maps: Record<string, unknown> = {}

  for (const key of requested_maps) {
    if (!ALLOWLIST.has(key)) continue
    maps[key] = (await kv.get(key)) ?? []
  }

  res.status(200).json({ trace_id, maps })
}
