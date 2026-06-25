import type { AuthenticatedUser } from "@/domains/auth/role";
import type {
  NotificationDeliveryAttempt,
  NotificationPreferences,
} from "@/domains/notifications/notification-delivery";

const PREFERENCES_PREFIX = "farmsync.notification-preferences.v1";
const ATTEMPTS_PREFIX = "farmsync.notification-attempts.v1";
const MAX_LOCAL_ATTEMPTS = 500;

const getKey = (prefix: string, identity: AuthenticatedUser | null) =>
  `${prefix}.${identity?.id ?? "device"}`;

export const createDefaultNotificationPreferences = (): NotificationPreferences => ({
  browserEnabled: false,
  minimumSeverity: "WARNING",
  consentedAt: null,
  updatedAt: new Date(0).toISOString(),
});

export const readLocalNotificationPreferences = (
  identity: AuthenticatedUser | null,
): NotificationPreferences => {
  if (typeof window === "undefined") return createDefaultNotificationPreferences();
  try {
    const value = localStorage.getItem(getKey(PREFERENCES_PREFIX, identity));
    return value
      ? (JSON.parse(value) as NotificationPreferences)
      : createDefaultNotificationPreferences();
  } catch {
    return createDefaultNotificationPreferences();
  }
};

export const writeLocalNotificationPreferences = (
  identity: AuthenticatedUser | null,
  preferences: NotificationPreferences,
) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getKey(PREFERENCES_PREFIX, identity), JSON.stringify(preferences));
  } catch {
    // Supabase remains the durable store when browser storage is unavailable.
  }
};

export const readLocalNotificationAttempts = (
  identity: AuthenticatedUser | null,
): NotificationDeliveryAttempt[] => {
  if (typeof window === "undefined") return [];
  try {
    const value = localStorage.getItem(getKey(ATTEMPTS_PREFIX, identity));
    if (!value) return [];
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as NotificationDeliveryAttempt[]) : [];
  } catch {
    return [];
  }
};

export const writeLocalNotificationAttempts = (
  identity: AuthenticatedUser | null,
  attempts: NotificationDeliveryAttempt[],
) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      getKey(ATTEMPTS_PREFIX, identity),
      JSON.stringify(attempts.slice(0, MAX_LOCAL_ATTEMPTS)),
    );
  } catch {
    // Supabase remains the durable store when browser storage is unavailable.
  }
};
