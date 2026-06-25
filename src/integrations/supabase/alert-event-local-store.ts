import type { AlertEvent } from "@/domains/alerts/alert-events";
import type { AuthenticatedUser } from "@/domains/auth/role";

const STORAGE_PREFIX = "farmsync.alert-events.v1";
const MAX_LOCAL_EVENTS = 500;

const getStorageKey = (identity: AuthenticatedUser | null) =>
  `${STORAGE_PREFIX}.${identity?.id ?? "device"}`;

export const readLocalAlertEvents = (identity: AuthenticatedUser | null): AlertEvent[] => {
  if (typeof window === "undefined") return [];
  try {
    const value = localStorage.getItem(getStorageKey(identity));
    if (!value) return [];
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as AlertEvent[]) : [];
  } catch {
    return [];
  }
};

export const writeLocalAlertEvents = (identity: AuthenticatedUser | null, events: AlertEvent[]) => {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(
      getStorageKey(identity),
      JSON.stringify(events.slice(0, MAX_LOCAL_EVENTS)),
    );
    return true;
  } catch {
    return false;
  }
};
