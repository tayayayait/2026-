import type { AlertEvent } from "../alerts/alert-events";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

interface NotificationPreferences {
  browserEnabled: boolean;
  minimumSeverity: "INFO" | "WARNING" | "CRITICAL";
  consentedAt: string | null;
  updatedAt: string;
}

interface DeliveryAttempt {
  id: string;
  eventId: string;
  channel: "BROWSER";
  status: "DELIVERED" | "FAILED" | "SKIPPED";
  attemptedAt: string;
  attemptCount: number;
  nextRetryAt: string | null;
  reason: string | null;
}

interface NotificationOperations {
  selectBrowserDeliveryCandidates: (
    events: AlertEvent[],
    preferences: NotificationPreferences,
    attempts: DeliveryAttempt[],
    options: { now: string; limit: number; maxAttempts: number },
  ) => AlertEvent[];
  createDeliveryAttempt: (input: {
    eventId: string;
    status: DeliveryAttempt["status"];
    previousAttempts: DeliveryAttempt[];
    attemptedAt: string;
    reason?: string;
  }) => DeliveryAttempt;
}

const modulePath = "./notification-delivery.ts";
const operations = (await import(modulePath).catch(() => null)) as NotificationOperations | null;
assert(operations !== null, "notification delivery operations must be implemented");
if (!operations) throw new Error("notification delivery operations are unavailable");

const createEvent = (
  id: string,
  severity: AlertEvent["severity"],
  createdAt: string,
): AlertEvent => ({
  id,
  snapshotId: `snapshot-${id}`,
  farmId: `farm-${id}`,
  farmName: `${id} 농장`,
  region: "김제시",
  severity,
  title: `${severity} 알림`,
  message: "현장 확인 필요",
  createdAt,
  readAt: null,
});

const events = [
  createEvent("info", "INFO", "2026-06-21T09:00:00Z"),
  createEvent("warning", "WARNING", "2026-06-21T09:01:00Z"),
  createEvent("critical", "CRITICAL", "2026-06-21T09:02:00Z"),
  { ...createEvent("read", "CRITICAL", "2026-06-21T09:03:00Z"), readAt: "2026-06-21T09:04:00Z" },
];
const enabled: NotificationPreferences = {
  browserEnabled: true,
  minimumSeverity: "WARNING",
  consentedAt: "2026-06-21T08:00:00Z",
  updatedAt: "2026-06-21T08:00:00Z",
};

assert(
  operations.selectBrowserDeliveryCandidates(events, { ...enabled, browserEnabled: false }, [], {
    now: "2026-06-21T10:00:00Z",
    limit: 5,
    maxAttempts: 3,
  }).length === 0,
  "disabled browser notifications must not deliver",
);

const delivered = operations.createDeliveryAttempt({
  eventId: "warning",
  status: "DELIVERED",
  previousAttempts: [],
  attemptedAt: "2026-06-21T09:10:00Z",
});
const retryable = operations.createDeliveryAttempt({
  eventId: "critical",
  status: "FAILED",
  previousAttempts: [],
  attemptedAt: "2026-06-21T09:10:00Z",
  reason: "temporary failure",
});
assert(retryable.attemptCount === 1, "first failed attempt count mismatch");
assert(retryable.nextRetryAt === "2026-06-21T09:11:00.000Z", "first retry delay mismatch");

const candidates = operations.selectBrowserDeliveryCandidates(
  events,
  enabled,
  [delivered, retryable],
  { now: "2026-06-21T09:12:00Z", limit: 5, maxAttempts: 3 },
);
assert(candidates.map((event) => event.id).join() === "critical", "candidate policy mismatch");

const failedTwice = operations.createDeliveryAttempt({
  eventId: "critical",
  status: "FAILED",
  previousAttempts: [retryable],
  attemptedAt: "2026-06-21T09:12:00Z",
});
const failedThird = operations.createDeliveryAttempt({
  eventId: "critical",
  status: "FAILED",
  previousAttempts: [retryable, failedTwice],
  attemptedAt: "2026-06-21T09:20:00Z",
});
assert(failedTwice.nextRetryAt === "2026-06-21T09:17:00.000Z", "second retry delay mismatch");
assert(failedThird.nextRetryAt === null, "third failure must stop retries");
assert(
  operations.selectBrowserDeliveryCandidates(
    events,
    enabled,
    [retryable, failedTwice, failedThird],
    {
      now: "2026-06-21T10:00:00Z",
      limit: 5,
      maxAttempts: 3,
    },
  ).length === 1,
  "only the unrelated warning event should remain after max attempts",
);

console.log("notification delivery behavior tests passed");
