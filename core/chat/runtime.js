// /core/chat/runtime.js

import { setState } from "../trace.js";
import { runTool } from "../../services/tools.js";

export async function runRuntime() {
  return { ok: "tools_loaded" };
}
