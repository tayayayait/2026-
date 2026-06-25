import { createFileRoute, Link } from "@tanstack/react-router";
import { BellOff, CheckCheck, Database, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AlertEventCard } from "@/components/alert-event-card";
import { AppShell } from "@/components/app-shell";
import { NotificationSettingsPanel } from "@/components/notification-settings-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  countUnreadAlertEvents,
  selectAlertEvents,
  type AlertEvent,
} from "@/domains/alerts/alert-events";
import { deliverBrowserAlertEvents } from "@/integrations/browser/notification-delivery";
import {
  loadAlertEvents,
  readAlertEvent,
  readAllAlertEvents,
  synchronizeSnapshotAlerts,
  type AlertEventDataSource,
} from "@/integrations/supabase/alert-events";
import { loadAnalysisSnapshots } from "@/integrations/supabase/analysis-snapshots";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<AlertEventDataSource, string> = {
  SUPABASE: "Supabase 알림 이벤트",
  SUPABASE_LOCAL: "Supabase·브라우저 병합",
  LOCAL: "브라우저 저장 알림",
  EMPTY: "저장 알림 없음",
};

const AlertsPage = () => {
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [source, setSource] = useState<AlertEventDataSource>("EMPTY");
  const [warning, setWarning] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [loading, setLoading] = useState(true);
  const unreadCount = countUnreadAlertEvents(events);
  const visibleEvents = useMemo(() => selectAlertEvents(events, filter), [events, filter]);

  useEffect(() => {
    const load = async () => {
      const [stored, snapshots] = await Promise.all([loadAlertEvents(), loadAnalysisSnapshots()]);
      const result =
        snapshots.snapshots.length > 0
          ? await synchronizeSnapshotAlerts(snapshots.snapshots)
          : stored;
      setEvents(result.events);
      setSource(result.source);
      setWarning(result.warning ?? snapshots.warning);
      setLoading(false);
      void deliverBrowserAlertEvents(result.events);
    };
    void load();
  }, []);

  const handleRead = async (id: string) => setEvents(await readAlertEvent(id));
  const handleReadAll = async () => setEvents(await readAllAlertEvents());

  return (
    <AppShell title="알림 센터" subtitle="저장된 분석 이벤트와 읽음 상태">
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Database className="h-4 w-4" />
            데이터 출처: <strong className="text-foreground">{SOURCE_LABEL[source]}</strong>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={unreadCount === 0}
            onClick={handleReadAll}
          >
            <CheckCheck className="h-4 w-4" /> 모두 읽음
          </Button>
        </div>

        {warning && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            {warning}
          </div>
        )}

        <NotificationSettingsPanel events={events} />

        <div className="inline-flex rounded-md border bg-muted/30 p-1" aria-label="알림 필터">
          {(["ALL", "UNREAD"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={cn(
                "min-h-9 rounded px-3 text-sm font-medium",
                filter === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === "ALL" ? `전체 ${events.length}` : `읽지 않음 ${unreadCount}`}
            </button>
          ))}
        </div>

        {loading ? (
          <div
            className="flex h-64 items-center justify-center"
            role="status"
            aria-label="알림 불러오는 중"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : visibleEvents.length > 0 ? (
          visibleEvents.map((event) => (
            <AlertEventCard key={event.id} event={event} onRead={handleRead} />
          ))
        ) : (
          <EmptyAlerts filter={filter} />
        )}
      </div>
    </AppShell>
  );
};

const EmptyAlerts = ({ filter }: { filter: "ALL" | "UNREAD" }) => (
  <Card className="border-dashed bg-muted/20">
    <CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-secondary">
        <BellOff className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold">
        {filter === "UNREAD" ? "읽지 않은 알림이 없습니다" : "생성된 분석 알림이 없습니다"}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        농장 분석이 완료되면 위험과 데이터 누락 이벤트가 이곳에 저장됩니다.
      </p>
      <Link to="/" className="mt-6 font-semibold text-primary hover:underline">
        농장 분석으로 이동
      </Link>
    </CardContent>
  </Card>
);

export const Route = createFileRoute("/alerts")({
  component: AlertsPage,
});
