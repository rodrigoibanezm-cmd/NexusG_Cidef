// /services/tools.js

// =========================
// ROUTING (robusto)
// =========================
const routes = {
  decideMaps: "/api/decide",
  executePayload: "/api/execute",
};

// =========================
// MULTI-TENANT
// =========================
function resolveModels(models = [], tenant_id) {
  if (!Array.isArray(models)) return [];

  // si no hay tenant, no modificamos
  if (!tenant_id) return models;

  return models.map((m) => `${tenant_id}:${m}`);
}

// =========================
// TOOL EXECUTION
// =========================
export async function runTool({ name, args = {}, baseUrl, tenant_id }) {
  const path = routes[name];

  if (!path) {
    throw new Error(`Unknown tool: ${name}`);
  }

  const url = `${baseUrl}${path}`;

  // =========================
  // INJECT TENANT (clean)
  // =========================
  const resolvedArgs = {
    ...args,
    models: resolveModels(args.models, tenant_id),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": tenant_id || "",
    },
    body: JSON.stringify(resolvedArgs),
  });

  if (!res.ok) {
    throw new Error(`Tool ${name} failed with status ${res.status}`);
  }

  return await res.json();
}
