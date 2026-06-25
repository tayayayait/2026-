import { useEffect, useState } from "react";
import { createAnalysisSnapshot } from "@/domains/analysis/snapshot-operations";
import type { DashboardAnalysisInput } from "@/domains/dashboard/live-summary";
import type { Farm } from "@/domains/farms/types";
import { deliverBrowserAlertEvents } from "@/integrations/browser/notification-delivery";
import { synchronizeSnapshotAlerts } from "@/integrations/supabase/alert-events";
import { saveAnalysisSnapshot } from "@/integrations/supabase/analysis-snapshots";

export interface SnapshotPersistenceState {
  status: "SAVING" | "SUPABASE" | "LOCAL" | "FAILED" | null;
  warning: string | null;
}

export const useDashboardAnalysisSnapshot = (
  farm: Farm,
  analysis: DashboardAnalysisInput | undefined,
): SnapshotPersistenceState => {
  const [state, setState] = useState<SnapshotPersistenceState>({
    status: null,
    warning: null,
  });

  useEffect(() => {
    if (!analysis) return;
    let active = true;
    setState({ status: "SAVING", warning: null });

    const snapshot = createAnalysisSnapshot({ farm, analysis });
    saveAnalysisSnapshot(snapshot)
      .then(async (result) => {
        const alertResult = await synchronizeSnapshotAlerts([snapshot]);
        void deliverBrowserAlertEvents(alertResult.events);
        if (!active) return;
        setState({ status: result.source, warning: result.warning });
      })
      .catch(() => {
        if (!active) return;
        setState({ status: "FAILED", warning: "분석 스냅샷 저장에 실패했습니다." });
      });

    return () => {
      active = false;
    };
  }, [analysis, farm.id, farm.name, farm.region, farm.crop]);

  return state;
};
