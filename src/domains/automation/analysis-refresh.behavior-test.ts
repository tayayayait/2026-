export {};

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

interface RefreshTarget {
  id: string;
}

interface RefreshOperations {
  selectAnalysisRefreshTargets: (
    farms: RefreshTarget[],
    latestAnalyzedAt: Map<string, string>,
    options: { now: string; staleAfterMs: number; limit: number },
  ) => RefreshTarget[];
  executeAnalysisRefreshBatch: <T extends RefreshTarget>(
    targets: T[],
    refreshFarm: (farm: T) => Promise<void>,
  ) => Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    failures: Array<{ farmId: string; reason: string }>;
  }>;
}

const modulePath = "./analysis-refresh.ts";
const operations = (await import(modulePath).catch(() => null)) as RefreshOperations | null;
assert(operations !== null, "analysis refresh operations must be implemented");
if (!operations) throw new Error("analysis refresh operations are unavailable");

const farms = [{ id: "never" }, { id: "oldest" }, { id: "stale" }, { id: "fresh" }];
const latest = new Map([
  ["oldest", "2026-06-20T00:00:00Z"],
  ["stale", "2026-06-21T00:00:00Z"],
  ["fresh", "2026-06-21T11:00:00Z"],
]);
const targets = operations.selectAnalysisRefreshTargets(farms, latest, {
  now: "2026-06-21T12:00:00Z",
  staleAfterMs: 6 * 60 * 60 * 1000,
  limit: 3,
});
assert(
  targets.map((farm) => farm.id).join() === "never,oldest,stale",
  "refresh targets must prioritize never-analyzed and oldest stale farms",
);

const attempted: string[] = [];
const result = await operations.executeAnalysisRefreshBatch(targets, async (farm) => {
  attempted.push(farm.id);
  if (farm.id === "oldest") throw new Error("provider timeout");
});
assert(attempted.join() === "never,oldest,stale", "batch must continue after one farm fails");
assert(result.processed === 3, "processed count mismatch");
assert(result.succeeded === 2, "success count mismatch");
assert(result.failed === 1, "failure count mismatch");
assert(result.failures[0]?.farmId === "oldest", "failed farm id mismatch");
assert(result.failures[0]?.reason === "provider timeout", "failure reason mismatch");

console.log("analysis refresh behavior tests passed");
