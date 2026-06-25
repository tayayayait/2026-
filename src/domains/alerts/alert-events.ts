import type { AnalysisAlert } from "../analysis/snapshot-operations";

export interface AlertEvent extends AnalysisAlert {
  readAt: string | null;
}

const toTime = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortNewestFirst = (events: AlertEvent[]) =>
  events.sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));

export const synchronizeAlertEvents = (
  existing: AlertEvent[],
  derived: AnalysisAlert[],
): AlertEvent[] => {
  const events = new Map(existing.map((event) => [event.id, event]));
  for (const alert of derived) {
    const current = events.get(alert.id);
    events.set(alert.id, { ...alert, readAt: current?.readAt ?? null });
  }
  return sortNewestFirst([...events.values()]);
};

export const mergeAlertEventCollections = (...groups: AlertEvent[][]): AlertEvent[] => {
  const events = new Map<string, AlertEvent>();
  for (const event of groups.flat()) events.set(event.id, event);
  return sortNewestFirst([...events.values()]);
};

export const markAlertEventRead = (
  events: AlertEvent[],
  id: string,
  readAt: string,
): AlertEvent[] => {
  if (!events.some((event) => event.id === id)) return events;
  return events.map((event) => (event.id === id ? { ...event, readAt } : event));
};

export const markAllAlertEventsRead = (events: AlertEvent[], readAt: string): AlertEvent[] =>
  events.map((event) => (event.readAt ? event : { ...event, readAt }));

export const selectAlertEvents = (events: AlertEvent[], filter: "ALL" | "UNREAD") =>
  filter === "UNREAD" ? events.filter((event) => event.readAt === null) : events;

export const countUnreadAlertEvents = (events: AlertEvent[]) =>
  events.filter((event) => event.readAt === null).length;
