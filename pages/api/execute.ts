// PATH: pages/api/execute.ts
// LINES: ~200
import type { NextApiRequest, NextApiResponse } from "next";

type Topic = "comercial" | "ficha" | "cliente" | "mitos";

type ExecuteInput = {
  trace_id: string;
  topic: Topic;
  models: string[];
  use_case: string | null; // for mitos: "china" | "ev" | "china_ev" (or any string that includes those tokens)
};

type ExecuteOutput = {
  trace_id: string;
  status: "OK" | "NO_DATA" | "ERROR";
  topic: Topic;
  data: Array<{ modelo: string | null; payload: any | null }>;
  missing: string[];
  error?: { code: string; message: string };
};

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function badRequest(res: NextApiResponse, trace_id: string, message: string) {
  const out: ExecuteOutput = {
    trace_id,
    status: "ERROR",
    topic: "ficha",
    data: [],
    missing: [],
    error: { code: "BAD_REQUEST", message }
  };
  return res.status(400).json(out);
}

function normalizeModelToSlug(model: string): string {
  return model
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_");
}

function pickMitosKey(use_case: string | null): { key: string; label: string } | null {
  const s = (use_case ?? "").toLowerCase();
  const hasChina = s.includes("china");
  const hasEv = s.includes("ev") || s.includes("electrico") || s.includes("eléctrico");

  if (hasChina && hasEv) return { key: "cidef:mitos:v1:mitos_v1_ev_china", label: "china_ev" };
  if (hasChina) return { key: "cidef:mitos:v1:mitos_v1_china", label: "china" };
  if (hasEv) return { key: "cidef:mitos:v1:mitos_v1_ev", label: "ev" };
  return null;
}

function resolveKey(topic: Exclude<Topic, "mitos">, modelSlug: string): string {
  switch (topic) {
    case "ficha":
      return `cidef:fichas:v1:ft_v1_${modelSlug}`;
    case "comercial":
      return `cidef:comercial:v1:comercial_v1_${modelSlug}`;
    case "cliente":
      return `cidef:clientes:v1:cliente_v1_${modelSlug}`;
  }
}

async function upstashGetJson(key: string): Promise<any | null> {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
  }

  // Upstash REST: GET /get/<key>
  const url = `${UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`;
  const r = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
  });

  if (!r.ok) throw new Error(`Upstash HTTP ${r.status}`);
  const j = await r.json();

  // Response shape: { result: string | null }
  const raw = j?.result ?? null;
  if (raw == null) return null;

  // Most common: JSON stored as string
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      // allow non-json payloads, but you said JSON pesado
      return raw;
    }
  }

  return raw;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const trace_id = (req.body?.trace_id ?? req.query?.trace_id ?? "trace_unknown") as string;

  if (req.method !== "POST") {
    return res.status(405).json({
      trace_id,
      status: "ERROR",
      topic: "ficha",
      data: [],
      missing: [],
      error: { code: "METHOD_NOT_ALLOWED", message: "Use POST" }
    } satisfies ExecuteOutput);
  }

  const body = (req.body ?? {}) as Partial<ExecuteInput>;
  const topic = body.topic as Topic | undefined;

  if (!topic || !["comercial", "ficha", "cliente", "mitos"].includes(topic)) {
    return badRequest(res, trace_id, "Invalid topic");
  }

  const models = Array.isArray(body.models) ? body.models.filter(Boolean) : [];
  const use_case = body.use_case ?? null;

  // Hard seen invariants
  if (topic !== "mitos" && models.length === 0) {
    return badRequest(res, trace_id, "models is required when topic != mitos");
  }

  try {
    const missing: string[] = [];
    const data: ExecuteOutput["data"] = [];

    if (topic === "mitos") {
      const picked = pickMitosKey(use_case);
      if (!picked) {
        return badRequest(res, trace_id, 'use_case must indicate "china", "ev", or both for topic=mitos');
      }

      const payload = await upstashGetJson(picked.key);
      if (payload == null) {
        missing.push(picked.key);
        const out: ExecuteOutput = { trace_id, status: "NO_DATA", topic, data: [{ modelo: null, payload: null }], missing };
        return res.status(200).json(out);
      }

      const out: ExecuteOutput = { trace_id, status: "OK", topic, data: [{ modelo: null, payload }], missing: [] };
      return res.status(200).json(out);
    }

    // ficha/comercial/cliente
    for (const m of models) {
      const slug = normalizeModelToSlug(m);
      const key = resolveKey(topic, slug);

      const payload = await upstashGetJson(key);
      if (payload == null) {
        missing.push(key);
        data.push({ modelo: m, payload: null });
      } else {
        data.push({ modelo: m, payload });
      }
    }

    const status: ExecuteOutput["status"] = missing.length > 0 ? "NO_DATA" : "OK";
    const out: ExecuteOutput = { trace_id, status, topic, data, missing };
    return res.status(200).json(out);
  } catch (e: any) {
    const out: ExecuteOutput = {
      trace_id,
      status: "ERROR",
      topic,
      data: [],
      missing: [],
      error: { code: "EXECUTE_FAILED", message: e?.message ?? "Unknown error" }
    };
    return res.status(500).json(out);
  }
}
