import fs from "node:fs";
const trace = JSON.parse(fs.readFileSync("artifacts/qa/cls-trace/report-0.trace.json", "utf8"));
const events = trace.traceEvents.filter(event => event.name === "LayoutShift");
for (const event of events) {
  console.log(JSON.stringify({ ts: event.ts, args: event.args }, null, 2));
}
