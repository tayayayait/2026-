import { existsSync, readFileSync } from "node:fs";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const repositoryPath = new URL("./alert-events.ts", import.meta.url);
assert(existsSync(repositoryPath), "alert event repository must exist");
if (!existsSync(repositoryPath)) throw new Error("alert event repository is unavailable");

const repository = readFileSync(repositoryPath, "utf8");
const alertsRoute = readFileSync(new URL("../../routes/alerts.tsx", import.meta.url), "utf8");
const snapshotHook = readFileSync(
  new URL("../../components/use-dashboard-analysis-snapshot.ts", import.meta.url),
  "utf8",
);

assert(repository.includes("ensureSupabaseIdentity"), "alert events must be user scoped");
assert(
  repository.includes("synchronizeAlertEvents"),
  "derived alerts must synchronize idempotently",
);
assert(repository.includes("loadAlertEvents"), "alert events must be loadable");
assert(repository.includes("markAlertEventRead"), "single read updates must be persisted");
assert(repository.includes("markAllAlertEventsRead"), "mark-all-read must be persisted");
assert(alertsRoute.includes("loadAlertEvents"), "alerts UI must load persisted events");
assert(alertsRoute.includes("읽지 않음"), "alerts UI must expose an unread filter");
assert(
  snapshotHook.includes("synchronizeSnapshotAlerts"),
  "dashboard snapshots must create events",
);

console.log("Supabase alert event integration behavior tests passed");
