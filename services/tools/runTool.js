// /services/tools/runTool.js

export async function runTool({ name, args, baseUrl }) {
  if (name === "decideMaps") {
    const r = await fetch(`${baseUrl}/api/decide`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requested_maps: args.requested_maps || [],
      }),
    });

    if (!r.ok) throw new Error("decide_http_error");

    return await r.json();
  }

  if (name === "executePayload") {
    const r = await fetch(`${baseUrl}/api/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: args.topic,
        models: args.models || [],
      }),
    });

    if (!r.ok) throw new Error("execute_http_error");

    return await r.json();
  }

  throw new Error("unknown_tool");
}
