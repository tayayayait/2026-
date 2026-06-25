import type { AlertEvent } from "@/domains/alerts/alert-events";
import {
  createDeliveryAttempt,
  selectBrowserDeliveryCandidates,
  type NotificationDeliveryAttempt,
} from "@/domains/notifications/notification-delivery";
import {
  appendNotificationAttempt,
  loadNotificationState,
} from "@/integrations/supabase/notification-delivery";

export type BrowserNotificationPermission = NotificationPermission | "unsupported";

export const getBrowserNotificationPermission = (): BrowserNotificationPermission =>
  typeof window === "undefined" || !("Notification" in window)
    ? "unsupported"
    : Notification.permission;

export const requestBrowserNotificationConsent =
  async (): Promise<BrowserNotificationPermission> => {
    if (getBrowserNotificationPermission() === "unsupported") return "unsupported";
    try {
      return await Notification.requestPermission();
    } catch {
      return "unsupported";
    }
  };

export interface BrowserDeliveryResult {
  delivered: number;
  failed: number;
  skipped: number;
  lastAttempt: NotificationDeliveryAttempt | null;
}

let deliveryRequest: Promise<BrowserDeliveryResult> | null = null;

const executeDelivery = async (events: AlertEvent[]): Promise<BrowserDeliveryResult> => {
  const state = await loadNotificationState();
  const candidates = selectBrowserDeliveryCandidates(events, state.preferences, state.attempts, {
    now: new Date().toISOString(),
    limit: 5,
    maxAttempts: 3,
  });
  const result: BrowserDeliveryResult = { delivered: 0, failed: 0, skipped: 0, lastAttempt: null };
  if (candidates.length === 0) return result;

  let attempts = state.attempts;
  const permission = getBrowserNotificationPermission();
  for (const event of candidates) {
    const attemptedAt = new Date().toISOString();
    let status: NotificationDeliveryAttempt["status"] = "DELIVERED";
    let reason: string | undefined;
    try {
      if (permission !== "granted") {
        status = "SKIPPED";
        reason = permission === "unsupported" ? "UNSUPPORTED" : "PERMISSION_NOT_GRANTED";
      } else {
        new Notification(event.title, {
          body: event.message,
          tag: event.id,
        });
      }
    } catch {
      status = "FAILED";
      reason = "DELIVERY_FAILED";
    }

    const attempt = createDeliveryAttempt({
      eventId: event.id,
      status,
      previousAttempts: attempts,
      attemptedAt,
      reason,
    });
    attempts = await appendNotificationAttempt(attempt);
    result.lastAttempt = attempt;
    if (status === "DELIVERED") result.delivered += 1;
    if (status === "FAILED") result.failed += 1;
    if (status === "SKIPPED") result.skipped += 1;
  }
  return result;
};

export const deliverBrowserAlertEvents = async (
  events: AlertEvent[],
): Promise<BrowserDeliveryResult> => {
  if (deliveryRequest) return deliveryRequest;
  deliveryRequest = executeDelivery(events);
  try {
    return await deliveryRequest;
  } finally {
    deliveryRequest = null;
  }
};
