import type { AnalysisAlert } from "../analysis/snapshot-operations";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

interface AlertEvent extends AnalysisAlert {
  readAt: string | null;
}

interface AlertEventOperations {
  synchronizeAlertEvents: (existing: AlertEvent[], derived: AnalysisAlert[]) => AlertEvent[];
  markAlertEventRead: (events: AlertEvent[], id: string, readAt: string) => AlertEvent[];
  markAllAlertEventsRead: (events: AlertEvent[], readAt: string) => AlertEvent[];
  selectAlertEvents: (events: AlertEvent[], filter: "ALL" | "UNREAD") => AlertEvent[];
  countUnreadAlertEvents: (events: AlertEvent[]) => number;
  mergeAlertEventCollections: (...groups: AlertEvent[][]) => AlertEvent[];
}

const modulePath = "./alert-events.ts";
const operations = (await import(modulePath).catch(() => null)) as AlertEventOperations | null;
assert(operations !== null, "alert event operations must be implemented");
if (!operations) throw new Error("alert event operations are unavailable");

const criticalAlert: AnalysisAlert = {
  id: "snapshot-1-risk",
  snapshotId: "snapshot-1",
  farmId: "farm-1",
  farmName: "만경 농장",
  region: "김제시 만경읍",
  severity: "CRITICAL",
  title: "긴급 위험",
  message: "현장 확인 필요",
  createdAt: "2026-06-21T09:00:00+09:00",
};

const rainfallAlert: AnalysisAlert = {
  ...criticalAlert,
  id: "snapshot-1-rainfall",
  severity: "WARNING",
  title: "강수 위험",
  createdAt: "2026-06-21T09:01:00+09:00",
};

const previouslyRead: AlertEvent = {
  ...criticalAlert,
  readAt: "2026-06-21T09:10:00+09:00",
};

const synchronized = operations.synchronizeAlertEvents(
  [previouslyRead],
  [criticalAlert, rainfallAlert, rainfallAlert],
);
assert(synchronized.length === 2, "alert synchronization must be idempotent");
assert(
  synchronized.find((event) => event.id === criticalAlert.id)?.readAt === previouslyRead.readAt,
  "existing read state must survive synchronization",
);
assert(
  synchronized.find((event) => event.id === rainfallAlert.id)?.readAt === null,
  "new alert events must start unread",
);
assert(operations.countUnreadAlertEvents(synchronized) === 1, "unread count mismatch");
assert(
  operations
    .selectAlertEvents(synchronized, "UNREAD")
    .map((event) => event.id)
    .join() === rainfallAlert.id,
  "unread filter mismatch",
);

const oneRead = operations.markAlertEventRead(
  synchronized,
  rainfallAlert.id,
  "2026-06-21T09:20:00+09:00",
);
assert(operations.countUnreadAlertEvents(oneRead) === 0, "single read update mismatch");
assert(
  operations.markAlertEventRead(oneRead, "missing", "2026-06-21T09:30:00+09:00") === oneRead,
  "missing event updates must preserve the original collection",
);

const allUnread = synchronized.map((event) => ({ ...event, readAt: null }));
const allRead = operations.markAllAlertEventsRead(allUnread, "2026-06-21T09:30:00+09:00");
assert(
  allRead.every((event) => event.readAt !== null),
  "mark-all-read mismatch",
);

const remoteRead = { ...synchronized[0]!, readAt: "2026-06-21T10:00:00+09:00" };
const merged = operations.mergeAlertEventCollections(synchronized, [remoteRead]);
assert(merged.length === 2, "persisted event merge must deduplicate ids");
assert(
  merged.find((event) => event.id === remoteRead.id)?.readAt === remoteRead.readAt,
  "later persisted collections must win read-state conflicts",
);

console.log("alert event behavior tests passed");
