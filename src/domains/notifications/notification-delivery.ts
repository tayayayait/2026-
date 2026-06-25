import type { AlertEvent } from "../alerts/alert-events";

export type NotificationSeverityThreshold = "INFO" | "WARNING" | "CRITICAL";
export type NotificationDeliveryStatus = "DELIVERED" | "FAILED" | "SKIPPED";

export interface NotificationPreferences {
  browserEnabled: boolean;
  minimumSeverity: NotificationSeverityThreshold;
  consentedAt: string | null;
  updatedAt: string;
}

export interface NotificationDeliveryAttempt {
  id: string;
  eventId: string;
  channel: "BROWSER";
  status: NotificationDeliveryStatus;
  attemptedAt: string;
  attemptCount: number;
  nextRetryAt: string | null;
  reason: string | null;
}

const SEVERITY_RANK: Record<AlertEvent["severity"], number> = {
  INFO: 0,
  WARNING: 1,
  CRITICAL: 2,
};

const RETRY_DELAYS_MS = [60_000, 5 * 60_000] as const;

const toTime = (value: string | null) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const selectBrowserDeliveryCandidates = (
  events: AlertEvent[],
  preferences: NotificationPreferences,
  attempts: NotificationDeliveryAttempt[],
  options: { now: string; limit: number; maxAttempts: number },
): AlertEvent[] => {
  if (!preferences.browserEnabled || !preferences.consentedAt) return [];
  const now = toTime(options.now);
  const threshold = SEVERITY_RANK[preferences.minimumSeverity];

  return events
    .filter((event) => {
      if (event.readAt || SEVERITY_RANK[event.severity] < threshold) return false;
      const eventAttempts = attempts.filter(
        (attempt) => attempt.eventId === event.id && attempt.channel === "BROWSER",
      );
      if (eventAttempts.some((attempt) => attempt.status !== "FAILED")) return false;
      const failures = eventAttempts.filter((attempt) => attempt.status === "FAILED");
      if (failures.length >= options.maxAttempts) return false;
      const latest = failures.at(-1);
      return !latest?.nextRetryAt || toTime(latest.nextRetryAt) <= now;
    })
    .sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt))
    .slice(0, Math.max(0, options.limit));
};

export const createDeliveryAttempt = ({
  eventId,
  status,
  previousAttempts,
  attemptedAt,
  reason,
}: {
  eventId: string;
  status: NotificationDeliveryStatus;
  previousAttempts: NotificationDeliveryAttempt[];
  attemptedAt: string;
  reason?: string;
}): NotificationDeliveryAttempt => {
  const attemptCount =
    previousAttempts.filter(
      (attempt) => attempt.eventId === eventId && attempt.channel === "BROWSER",
    ).length + 1;
  const delay = status === "FAILED" ? RETRY_DELAYS_MS[attemptCount - 1] : undefined;
  const nextRetryAt = delay ? new Date(toTime(attemptedAt) + delay).toISOString() : null;

  return {
    id: `browser-${eventId}-${attemptCount}`,
    eventId,
    channel: "BROWSER",
    status,
    attemptedAt,
    attemptCount,
    nextRetryAt,
    reason: reason ?? null,
  };
};
