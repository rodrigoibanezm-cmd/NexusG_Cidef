// /services/tools.js

// =========================
// ROUTING (robusto)
// =========================
const routes = {
  decideMaps: "/api/decide",
  executePayload: "/api/execute",
};

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
  // ARGS LIMPIOS (sin tenant en models)
  // =========================
  const resolvedArgs = { ...args };

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
