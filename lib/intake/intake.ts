// PATH: lib/intake/intake.ts
// LINES: ~70

import { IntakeInput, IntakeResult } from "./types/intake_types";
import { runDetectors } from "./detectors/intake_detectors";
import { applyRules } from "./rules/intake_rules";

export function intake(input: IntakeInput): IntakeResult {
  const detections = runDetectors(input);
  const result = applyRules(input, detections);

  return {
    input,
    detections,
    result,
    meta: {
      version: "v1",
      timestamp: new Date().toISOString()
    }
  };
}
