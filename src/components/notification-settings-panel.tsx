import { BellRing, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AlertEvent } from "@/domains/alerts/alert-events";
import type {
  NotificationDeliveryAttempt,
  NotificationPreferences,
  NotificationSeverityThreshold,
} from "@/domains/notifications/notification-delivery";
import {
  deliverBrowserAlertEvents,
  getBrowserNotificationPermission,
  requestBrowserNotificationConsent,
  type BrowserNotificationPermission,
} from "@/integrations/browser/notification-delivery";
import {
  loadNotificationState,
  saveNotificationPreferences,
} from "@/integrations/supabase/notification-delivery";
import { createDefaultNotificationPreferences } from "@/integrations/supabase/notification-local-store";
import { cn } from "@/lib/utils";

const SEVERITY_OPTIONS: Array<{
  value: NotificationSeverityThreshold;
  label: string;
}> = [
  { value: "INFO", label: "모든 알림" },
  { value: "WARNING", label: "주의 이상" },
  { value: "CRITICAL", label: "긴급만" },
];

const permissionLabel = (permission: BrowserNotificationPermission) => {
  if (permission === "granted") return "허용됨";
  if (permission === "denied") return "차단됨";
  if (permission === "unsupported") return "지원하지 않음";
  return "권한 확인 필요";
};

const attemptLabel = (attempt: NotificationDeliveryAttempt | undefined) => {
  if (!attempt) return "전달 기록 없음";
  if (attempt.status === "DELIVERED") return "최근 전달 성공";
  if (attempt.status === "FAILED") return `전달 실패 · ${attempt.attemptCount}/3회`;
  return "권한 또는 환경으로 전달 건너뜀";
};

export const NotificationSettingsPanel = ({ events }: { events: AlertEvent[] }) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    createDefaultNotificationPreferences,
  );
  const [attempts, setAttempts] = useState<NotificationDeliveryAttempt[]>([]);
  const [permission, setPermission] = useState<BrowserNotificationPermission>("unsupported");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPermission(getBrowserNotificationPermission());
    loadNotificationState().then((state) => {
      setPreferences(state.preferences);
      setAttempts(state.attempts);
    });
  }, []);

  const persist = async (next: NotificationPreferences) => {
    setPreferences(next);
    await saveNotificationPreferences(next);
  };

  const handleBrowserToggle = async (enabled: boolean) => {
    setSaving(true);
    setMessage(null);
    if (!enabled) {
      await persist({
        ...preferences,
        browserEnabled: false,
        consentedAt: null,
        updatedAt: new Date().toISOString(),
      });
      setSaving(false);
      return;
    }

    const nextPermission = await requestBrowserNotificationConsent();
    setPermission(nextPermission);
    if (nextPermission !== "granted") {
      setMessage(
        nextPermission === "unsupported"
          ? "이 브라우저에서는 알림을 지원하지 않습니다."
          : "브라우저 설정에서 알림 권한을 허용해야 합니다.",
      );
      setSaving(false);
      return;
    }

    const now = new Date().toISOString();
    await persist({ ...preferences, browserEnabled: true, consentedAt: now, updatedAt: now });
    await deliverBrowserAlertEvents(events);
    const state = await loadNotificationState();
    setAttempts(state.attempts);
    setSaving(false);
  };

  const handleSeverity = async (minimumSeverity: NotificationSeverityThreshold) => {
    await persist({ ...preferences, minimumSeverity, updatedAt: new Date().toISOString() });
  };

  return (
    <section className="rounded-md border bg-card p-4 sm:p-5" aria-labelledby="notification-title">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <BellRing className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 id="notification-title" className="font-semibold">
              브라우저 알림
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              권한 {permissionLabel(permission)} · {attemptLabel(attempts[0])}
            </p>
          </div>
        </div>
        <Switch
          id="browser-notification-toggle"
          checked={preferences.browserEnabled}
          disabled={saving || permission === "unsupported"}
          onCheckedChange={handleBrowserToggle}
          aria-label="브라우저 알림 사용"
        />
      </div>

      <div className="mt-4 space-y-2">
        <Label className="text-xs text-muted-foreground">최소 알림 단계</Label>
        <div className="inline-flex max-w-full rounded-md border bg-muted/30 p-1">
          {SEVERITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "min-h-9 rounded px-2.5 text-xs font-medium sm:px-3",
                preferences.minimumSeverity === option.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
              aria-pressed={preferences.minimumSeverity === option.value}
              onClick={() => handleSeverity(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> 권한 요청은 이 스위치를 켤 때만 실행됩니다.
      </p>
      {message && (
        <p className="mt-2 text-sm text-destructive" role="alert" aria-live="polite">
          {message}
        </p>
      )}
    </section>
  );
};
