// /core/auth.js

import { kv } from "@vercel/kv";

export async function validateAuth(req) {
  const tenant_id = req.headers["x-tenant-id"];
  const api_key = req.headers["x-api-key"];

  if (!tenant_id || !api_key) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  const record = await kv.get(`auth:${tenant_id}`);

  if (!record || typeof record !== "object" || record.active === false) {
    return { ok: false, status: 403, error: "forbidden" };
  }

  if (api_key !== record.api_key) {
    return { ok: false, status: 403, error: "forbidden" };
  }

  return {
    ok: true,
    tenant_id,
  };
}
