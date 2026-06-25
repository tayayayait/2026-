import {
  deriveAnalysisAlerts,
  type AnalysisSnapshot,
} from "@/domains/analysis/snapshot-operations";
import {
  markAlertEventRead,
  markAllAlertEventsRead,
  mergeAlertEventCollections,
  synchronizeAlertEvents,
  type AlertEvent,
} from "@/domains/alerts/alert-events";
import { readLocalAlertEvents, writeLocalAlertEvents } from "./alert-event-local-store";
import { supabase } from "./client";
import { ensureSupabaseIdentity } from "./session";

export type AlertEventDataSource = "SUPABASE" | "SUPABASE_LOCAL" | "LOCAL" | "EMPTY";

export interface AlertEventLoadResult {
  events: AlertEvent[];
  source: AlertEventDataSource;
  warning: string | null;
}

interface AlertEventRow {
  user_id: string;
  id: string;
  snapshot_id: string;
  farm_id: string;
  farm_name: string;
  region: string;
  severity: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

type QueryResult<T> = PromiseLike<{
  data: T | null;
  error: { message?: string } | null;
}>;

interface SelectFilter extends QueryResult<AlertEventRow[]> {
  eq: (column: string, value: string) => SelectFilter;
  order: (column: string, options: { ascending: boolean }) => SelectFilter;
  limit: (count: number) => QueryResult<AlertEventRow[]>;
}

interface UpdateFilter extends QueryResult<null> {
  eq: (column: string, value: string) => UpdateFilter;
  is: (column: string, value: null) => UpdateFilter;
}

interface AlertEventTable {
  upsert: (
    rows: AlertEventRow[],
    options: { onConflict: string; ignoreDuplicates: boolean },
  ) => QueryResult<null>;
  select: (columns: string) => SelectFilter;
  update: (values: { read_at: string }) => UpdateFilter;
}

const getTable = () =>
  (supabase as unknown as { from: (table: string) => AlertEventTable }).from("alert_events");

const toRow = (event: AlertEvent, userId: string): AlertEventRow => ({
  user_id: userId,
  id: event.id,
  snapshot_id: event.snapshotId,
  farm_id: event.farmId,
  farm_name: event.farmName,
  region: event.region,
  severity: event.severity,
  title: event.title,
  message: event.message,
  created_at: event.createdAt,
  read_at: event.readAt,
});

const fromRow = (row: AlertEventRow): AlertEvent => ({
  id: row.id,
  snapshotId: row.snapshot_id,
  farmId: row.farm_id,
  farmName: row.farm_name,
  region: row.region,
  severity: row.severity === "CRITICAL" || row.severity === "WARNING" ? row.severity : "INFO",
  title: row.title,
  message: row.message,
  createdAt: row.created_at,
  readAt: row.read_at,
});

export const loadAlertEvents = async (): Promise<AlertEventLoadResult> => {
  const identity = await ensureSupabaseIdentity();
  const local = readLocalAlertEvents(identity);
  if (!identity) {
    return {
      events: local,
      source: local.length > 0 ? "LOCAL" : "EMPTY",
      warning: "Supabase 인증을 사용할 수 없어 브라우저 저장 알림을 사용합니다.",
    };
  }

  try {
    const { data, error } = await getTable()
      .select("*")
      .eq("user_id", identity.id)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message || "Supabase alert event read failed");
    const remote = (data ?? []).map(fromRow);
    const events = mergeAlertEventCollections(local, remote);
    writeLocalAlertEvents(identity, events);
    if (events.length === 0) return { events: [], source: "EMPTY", warning: null };
    const hasLocalOnly = local.some((event) => !remote.some((item) => item.id === event.id));
    return { events, source: hasLocalOnly ? "SUPABASE_LOCAL" : "SUPABASE", warning: null };
  } catch {
    return {
      events: local,
      source: local.length > 0 ? "LOCAL" : "EMPTY",
      warning: "Supabase 알림을 읽지 못해 브라우저 저장 데이터를 사용합니다.",
    };
  }
};

export const synchronizeSnapshotAlerts = async (
  snapshots: AnalysisSnapshot[],
): Promise<AlertEventLoadResult> => {
  const identity = await ensureSupabaseIdentity();
  const derived = deriveAnalysisAlerts(snapshots);
  const events = synchronizeAlertEvents(readLocalAlertEvents(identity), derived);
  writeLocalAlertEvents(identity, events);
  if (!identity || derived.length === 0) {
    return { events, source: events.length > 0 ? "LOCAL" : "EMPTY", warning: null };
  }

  try {
    const rows = synchronizeAlertEvents([], derived).map((event) => toRow(event, identity.id));
    const { error } = await getTable().upsert(rows, {
      onConflict: "user_id,id",
      ignoreDuplicates: true,
    });
    if (error) throw new Error(error.message || "Supabase alert event upsert failed");
    return loadAlertEvents();
  } catch {
    return {
      events,
      source: events.length > 0 ? "LOCAL" : "EMPTY",
      warning: "알림 이벤트를 브라우저에 저장했습니다. Supabase 마이그레이션 적용이 필요합니다.",
    };
  }
};

export const readAlertEvent = async (id: string, readAt = new Date().toISOString()) => {
  const identity = await ensureSupabaseIdentity();
  const events = markAlertEventRead(readLocalAlertEvents(identity), id, readAt);
  writeLocalAlertEvents(identity, events);
  if (!identity) return events;
  try {
    await getTable().update({ read_at: readAt }).eq("user_id", identity.id).eq("id", id);
  } catch {
    // Local read state remains authoritative until the next successful remote sync.
  }
  return events;
};

export const readAllAlertEvents = async (readAt = new Date().toISOString()) => {
  const identity = await ensureSupabaseIdentity();
  const events = markAllAlertEventsRead(readLocalAlertEvents(identity), readAt);
  writeLocalAlertEvents(identity, events);
  if (!identity) return events;
  try {
    await getTable().update({ read_at: readAt }).eq("user_id", identity.id).is("read_at", null);
  } catch {
    // Local read state remains authoritative until the next successful remote sync.
  }
  return events;
};
