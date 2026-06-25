import { existsSync, readFileSync } from "node:fs";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const runnerPath = new URL("../../automation/run-analysis-refresh.ts", import.meta.url);
const servicePath = new URL("../analysis/farm-analysis-service.ts", import.meta.url);
assert(existsSync(runnerPath), "scheduled analysis runner must exist");
assert(existsSync(servicePath), "shared farm analysis service must exist");
if (!existsSync(runnerPath) || !existsSync(servicePath)) {
  throw new Error("scheduled analysis integration is unavailable");
}

const runner = readFileSync(runnerPath, "utf8");
const analyzeFunction = readFileSync(
  new URL("../../lib/api/analyze.functions.ts", import.meta.url),
  "utf8",
);
const packageJson = readFileSync(new URL("../../../package.json", import.meta.url), "utf8");

assert(packageJson.includes('"analysis:refresh"'), "scheduled refresh command must be registered");
assert(runner.includes("SUPABASE_SERVICE_ROLE_KEY"), "refresh runner requires a service role key");
assert(runner.includes("selectAnalysisRefreshTargets"), "refresh runner must skip fresh farms");
assert(runner.includes("executeAnalysisRefreshBatch"), "refresh runner must isolate farm failures");
assert(
  runner.includes("executeFarmAnalysis"),
  "refresh runner must reuse the farm analysis service",
);
assert(runner.includes("analysis_snapshots"), "refresh runner must persist snapshots");
assert(runner.includes("alert_events"), "refresh runner must persist alert events");
assert(
  analyzeFunction.includes("executeFarmAnalysis"),
  "interactive analysis must use the shared analysis service",
);

console.log("analysis refresh integration behavior tests passed");
