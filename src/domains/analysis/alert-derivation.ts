import { selectLatestAnalysisSnapshots, toSnapshotTime } from "./snapshot-selection";
import type { AnalysisAlert, AnalysisSnapshot } from "./snapshot-types";

const createAlert = (
  snapshot: AnalysisSnapshot,
  suffix: string,
  severity: AnalysisAlert["severity"],
  title: string,
  message: string,
): AnalysisAlert => ({
  id: `${snapshot.id}-${suffix}`,
  snapshotId: snapshot.id,
  farmId: snapshot.farmId,
  farmName: snapshot.farmName,
  region: snapshot.region,
  severity,
  title,
  message,
  createdAt: snapshot.analyzedAt,
});

export const deriveAnalysisAlerts = (snapshots: AnalysisSnapshot[]): AnalysisAlert[] => {
  const alerts: AnalysisAlert[] = [];
  for (const snapshot of selectLatestAnalysisSnapshots(snapshots)) {
    if (snapshot.score === null || snapshot.level === "UNKNOWN") {
      alerts.push(
        createAlert(
          snapshot,
          "missing-data",
          "INFO",
          `${snapshot.farmName} 분석 데이터 부족`,
          "기상청 또는 NCPMS 응답값이 부족해 위험 점수를 계산하지 못했습니다.",
        ),
      );
    } else if (snapshot.level === "CRITICAL" || snapshot.level === "WARNING") {
      const severity = snapshot.level === "CRITICAL" ? "CRITICAL" : "WARNING";
      alerts.push(
        createAlert(
          snapshot,
          "risk",
          severity,
          `${snapshot.farmName} ${severity === "CRITICAL" ? "긴급" : "주의"} 위험`,
          `종합 위험도 ${snapshot.score}점입니다. 상세 위험 요인과 현장 상태를 확인하세요.`,
        ),
      );
    }

    const rainfall = snapshot.weather?.rainfall;
    if (rainfall !== undefined && rainfall >= 30) {
      alerts.push(
        createAlert(
          snapshot,
          "rainfall",
          rainfall >= 50 ? "CRITICAL" : "WARNING",
          `${snapshot.farmName} 강수 위험`,
          `기상청 강수량은 ${rainfall}mm입니다. 배수로와 침수 취약 구역을 점검하세요.`,
        ),
      );
    }
  }
  return alerts.sort((a, b) => toSnapshotTime(b.createdAt) - toSnapshotTime(a.createdAt));
};
