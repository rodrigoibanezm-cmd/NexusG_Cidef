/api/chat.js

import { runAgent } from "../core/engine.js";
import { systemPrompt } from "../services/systemPrompt.js";

export default async function handler(req, res) {
try {
if (req.method !== "POST") {
return res.status(405).json({ error: "method_not_allowed" });
}

```
const { message } = req.body || {};

if (!message) {
  return res.status(400).json({ error: "validation_error" });
}

const result = await runAgent({
  message,
  req,
  systemPrompt,
});

return res.status(200).json(result);
```

} catch (err) {
console.error("CHAT_ERROR:", err);

```
return res.status(200).json({
  message: err.message || "Error interno",
});
```

}
}
