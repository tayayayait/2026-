import { existsSync, readFileSync } from "node:fs";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const repositoryPath = new URL("./notification-delivery.ts", import.meta.url);
const browserAdapterPath = new URL("../browser/notification-delivery.ts", import.meta.url);
const panelPath = new URL("../../components/notification-settings-panel.tsx", import.meta.url);
assert(existsSync(repositoryPath), "notification repository must exist");
assert(existsSync(browserAdapterPath), "browser notification adapter must exist");
assert(existsSync(panelPath), "notification settings panel must exist");
if (!existsSync(repositoryPath) || !existsSync(browserAdapterPath) || !existsSync(panelPath)) {
  throw new Error("notification delivery integration is unavailable");
}

const repository = readFileSync(repositoryPath, "utf8");
const browserAdapter = readFileSync(browserAdapterPath, "utf8");
const panel = readFileSync(panelPath, "utf8");
const alertsRoute = readFileSync(new URL("../../routes/alerts.tsx", import.meta.url), "utf8");
const snapshotHook = readFileSync(
  new URL("../../components/use-dashboard-analysis-snapshot.ts", import.meta.url),
  "utf8",
);

assert(repository.includes("ensureSupabaseIdentity"), "notification data must be user scoped");
assert(repository.includes("notification_preferences"), "preferences must use Supabase storage");
assert(repository.includes("notification_delivery_logs"), "delivery attempts must be audited");
assert(
  browserAdapter.includes("Notification.requestPermission"),
  "browser consent must be explicit",
);
assert(
  browserAdapter.includes("selectBrowserDeliveryCandidates"),
  "browser adapter must enforce delivery policy",
);
assert(browserAdapter.includes("createDeliveryAttempt"), "every delivery result must be audited");
assert(panel.includes("브라우저 알림"), "the browser channel must be visible in settings");
assert(panel.includes("최소 알림 단계"), "minimum severity must be configurable");
assert(
  alertsRoute.includes("NotificationSettingsPanel"),
  "alerts UI must expose delivery settings",
);
assert(
  alertsRoute.includes("deliverBrowserAlertEvents"),
  "alerts UI must process pending delivery",
);
assert(
  snapshotHook.includes("deliverBrowserAlertEvents"),
  "new dashboard alerts must trigger consented browser delivery",
);

console.log("notification delivery integration behavior tests passed");
