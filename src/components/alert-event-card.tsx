import { Link } from "@tanstack/react-router";
import { AlertOctagon, AlertTriangle, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AlertEvent } from "@/domains/alerts/alert-events";
import { cn } from "@/lib/utils";

export const AlertEventCard = ({
  event,
  onRead,
}: {
  event: AlertEvent;
  onRead: (id: string) => void;
}) => {
  const unread = event.readAt === null;
  return (
    <Card
      className={cn(
        "relative",
        event.severity === "CRITICAL" && "border-risk-critical-bg/50 bg-risk-critical-bg/5",
        event.severity === "WARNING" && "border-risk-warning-bg/50 bg-risk-warning-bg/5",
        !unread && "opacity-70",
      )}
    >
      {unread ? <span className="absolute left-0 top-5 h-8 w-1 rounded-r bg-primary" /> : null}
      <CardContent className="flex gap-4 p-4 pl-5 sm:p-6 sm:pl-7">
        <div className="mt-1 shrink-0">
          {event.severity === "CRITICAL" ? (
            <AlertOctagon className="h-6 w-6 text-risk-critical-fg" />
          ) : event.severity === "WARNING" ? (
            <AlertTriangle className="h-6 w-6 text-risk-warning-fg" />
          ) : (
            <Info className="h-6 w-6 text-blue-600" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className={cn("font-semibold", unread && "text-foreground")}>{event.title}</h2>
            {unread ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                title="읽음으로 표시"
                aria-label={`${event.title} 읽음으로 표시`}
                onClick={() => onRead(event.id)}
              >
                <Check className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          <time className="block text-xs text-muted-foreground">
            {new Date(event.createdAt).toLocaleString("ko-KR", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
          <p className="text-sm leading-relaxed text-muted-foreground">{event.message}</p>
          <Link
            to="/farms/$farmId/risk"
            params={{ farmId: event.farmId }}
            className="inline-flex min-h-9 items-center text-xs font-semibold text-primary hover:underline"
          >
            {event.region} · 상세 분석
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
