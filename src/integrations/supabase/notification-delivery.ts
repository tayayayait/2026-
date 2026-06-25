import type {
  NotificationDeliveryAttempt,
  NotificationPreferences,
} from "@/domains/notifications/notification-delivery";
import { supabase } from "./client";
import {
  readLocalNotificationAttempts,
  readLocalNotificationPreferences,
  writeLocalNotificationAttempts,
  writeLocalNotificationPreferences,
} from "./notification-local-store";
import { ensureSupabaseIdentity } from "./session";

export type NotificationDataSource = "SUPABASE" | "SUPABASE_LOCAL" | "LOCAL" | "EMPTY";

export interface NotificationStateResult {
  preferences: NotificationPreferences;
  attempts: NotificationDeliveryAttempt[];
  source: NotificationDataSource;
  warning: string | null;
}

interface PreferenceRow {
  user_id: string;
  browser_enabled: boolean;
  minimum_severity: string;
  consented_at: string | null;
  updated_at: string;
}

interface AttemptRow {
  user_id: string;
  id: string;
  event_id: string;
  channel: string;
  status: string;
  attempted_at: string;
  attempt_count: number;
  next_retry_at: string | null;
  reason: string | null;
}

type QueryResult<T> = PromiseLike<{ data: T | null; error: { message?: string } | null }>;

interface QueryFilter<T> extends QueryResult<T[]> {
  eq: (column: string, value: string) => QueryFilter<T>;
  order: (column: string, options: { ascending: boolean }) => QueryFilter<T>;
  limit: (count: number) => QueryResult<T[]>;
}

interface NotificationTable<Row> {
  select: (columns: string) => QueryFilter<Row>;
  upsert: (row: Row, options: { onConflict: string }) => QueryResult<null>;
}

const getTable = <Row>(name: string) =>
  (supabase as unknown as { from: (table: string) => NotificationTable<Row> }).from(name);

const toPreferences = (row: PreferenceRow): NotificationPreferences => ({
  browserEnabled: row.browser_enabled,
  minimumSeverity:
    row.minimum_severity === "INFO" || row.minimum_severity === "CRITICAL"
      ? row.minimum_severity
      : "WARNING",
  consentedAt: row.consented_at,
  updatedAt: row.updated_at,
});

const toAttempt = (row: AttemptRow): NotificationDeliveryAttempt => ({
  id: row.id,
  eventId: row.event_id,
  channel: "BROWSER",
  status: row.status === "DELIVERED" || row.status === "SKIPPED" ? row.status : "FAILED",
  attemptedAt: row.attempted_at,
  attemptCount: row.attempt_count,
  nextRetryAt: row.next_retry_at,
  reason: row.reason,
});

const mergeAttempts = (
  local: NotificationDeliveryAttempt[],
  remote: NotificationDeliveryAttempt[],
) => {
  const merged = new Map(local.map((attempt) => [attempt.id, attempt]));
  for (const attempt of remote) merged.set(attempt.id, attempt);
  return [...merged.values()].sort((a, b) => Date.parse(b.attemptedAt) - Date.parse(a.attemptedAt));
};

export const loadNotificationState = async (): Promise<NotificationStateResult> => {
  const identity = await ensureSupabaseIdentity();
  const localPreferences = readLocalNotificationPreferences(identity);
  const localAttempts = readLocalNotificationAttempts(identity);
  if (!identity) {
    return {
      preferences: localPreferences,
      attempts: localAttempts,
      source: localAttempts.length > 0 ? "LOCAL" : "EMPTY",
      warning: "Supabase 인증을 사용할 수 없어 브라우저 알림 설정을 사용합니다.",
    };
  }

  try {
    const [preferenceResult, attemptResult] = await Promise.all([
      getTable<PreferenceRow>("notification_preferences")
        .select("*")
        .eq("user_id", identity.id)
        .limit(1),
      getTable<AttemptRow>("notification_delivery_logs")
        .select("*")
        .eq("user_id", identity.id)
        .order("attempted_at", { ascending: false })
        .limit(500),
    ]);
    if (preferenceResult.error || attemptResult.error) throw new Error("notification read failed");
    const preferences = preferenceResult.data?.[0]
      ? toPreferences(preferenceResult.data[0])
      : localPreferences;
    const attempts = mergeAttempts(localAttempts, (attemptResult.data ?? []).map(toAttempt));
    writeLocalNotificationPreferences(identity, preferences);
    writeLocalNotificationAttempts(identity, attempts);
    return {
      preferences,
      attempts,
      source: localAttempts.length > 0 ? "SUPABASE_LOCAL" : "SUPABASE",
      warning: null,
    };
  } catch {
    return {
      preferences: localPreferences,
      attempts: localAttempts,
      source: localAttempts.length > 0 ? "LOCAL" : "EMPTY",
      warning: "Supabase 알림 설정을 읽지 못해 브라우저 저장 데이터를 사용합니다.",
    };
  }
};

export const saveNotificationPreferences = async (preferences: NotificationPreferences) => {
  const identity = await ensureSupabaseIdentity();
  writeLocalNotificationPreferences(identity, preferences);
  if (!identity) return;
  try {
    await getTable<PreferenceRow>("notification_preferences").upsert(
      {
        user_id: identity.id,
        browser_enabled: preferences.browserEnabled,
        minimum_severity: preferences.minimumSeverity,
        consented_at: preferences.consentedAt,
        updated_at: preferences.updatedAt,
      },
      { onConflict: "user_id" },
    );
  } catch {
    // Local preferences remain available until remote storage recovers.
  }
};

export const appendNotificationAttempt = async (attempt: NotificationDeliveryAttempt) => {
  const identity = await ensureSupabaseIdentity();
  const attempts = mergeAttempts(readLocalNotificationAttempts(identity), [attempt]);
  writeLocalNotificationAttempts(identity, attempts);
  if (!identity) return attempts;
  try {
    await getTable<AttemptRow>("notification_delivery_logs").upsert(
      {
        user_id: identity.id,
        id: attempt.id,
        event_id: attempt.eventId,
        channel: attempt.channel,
        status: attempt.status,
        attempted_at: attempt.attemptedAt,
        attempt_count: attempt.attemptCount,
        next_retry_at: attempt.nextRetryAt,
        reason: attempt.reason,
      },
      { onConflict: "user_id,id" },
    );
  } catch {
    // Local audit data remains available until remote storage recovers.
  }
  return attempts;
};
