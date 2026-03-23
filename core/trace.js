/core/trace.js

export function createTrace(input) {
return {
trace_id: crypto.randomUUID(),
input,
steps: [],
output: null,
error: null,
};
}

export function addStep(trace, data) {
trace.steps.push({
ts: Date.now(),
...data,
});
}

export function setOutput(trace, output) {
trace.output = output;
}

export function setError(trace, error) {
trace.error = {
message: error.message,
};
}
