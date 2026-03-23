/services/tools.js

export async function runTool({ name, args, baseUrl }) {
let endpoint;

if (name === "decideMaps") {
endpoint = "/api/decide";
} else if (name === "executePayload") {
endpoint = "/api/execute";
} else {
throw new Error("Unknown tool: " + name);
}

// 🔥 FIX: asegurar trace_id en todas las llamadas
if (!args?.trace_id) {
throw new Error(`Missing trace_id for tool: ${name}`);
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 8000);

let res;

try {
res = await fetch(`${baseUrl}${endpoint}`, {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify(args),
signal: controller.signal,
});
} catch (err) {
if (err.name === "AbortError") {
throw new Error(`Tool timeout: ${name}`);
}

```
throw new Error(`Tool network error: ${name} | ${err.message}`);
```

} finally {
clearTimeout(timeout);
}

if (!res.ok) {
let body;
try {
body = await res.text();
body = body?.slice(0, 500);
} catch {
body = "unreadable body";
}

```
throw new Error(
  `Tool error: ${name} | status: ${res.status} | body: ${body}`
);
```

}

try {
return await res.json();
} catch {
throw new Error(`Invalid JSON response from tool: ${name}`);
}
}
