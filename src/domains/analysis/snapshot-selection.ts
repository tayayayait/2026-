import type { AnalysisSourceStatus } from "../reports/report-generation";
import type { RiskLevel, WorkType } from "../shared/types";
import type { AnalysisSnapshot } from "./snapshot-types";

interface SnapshotInput {
  farm: { id: string; name: string; region: string; crop: string };
  analysis: {
    analyzedAt?: string;
    riskResult: {
      score: number;
      level: RiskLevel;
      recommendedWorks: WorkType[];
      updatedAt: string;
    } | null;
    weather: AnalysisSnapshot["weather"];
    sourceStatus: AnalysisSourceStatus;
    pests: unknown[];
  };
}

export const toSnapshotTime = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const createAnalysisSnapshot = ({ farm, analysis }: SnapshotInput): AnalysisSnapshot => {
  const analyzedAt =
    analysis.riskResult?.updatedAt ?? analysis.analyzedAt ?? new Date().toISOString();
  return {
    id: `analysis-${farm.id}-${toSnapshotTime(analyzedAt)}`,
    farmId: farm.id,
    farmName: farm.name,
    region: farm.region,
    crop: farm.crop,
    score: analysis.riskResult?.score ?? null,
    level: analysis.riskResult?.level ?? "UNKNOWN",
    weather: analysis.weather,
    sourceStatus: analysis.sourceStatus,
    pestCount: analysis.pests.length,
    recommendedWorks: analysis.riskResult?.recommendedWorks ?? [],
    analyzedAt,
  };
};

export const selectLatestAnalysisSnapshots = (
  snapshots: AnalysisSnapshot[],
): AnalysisSnapshot[] => {
  const latest = new Map<string, AnalysisSnapshot>();
  for (const snapshot of snapshots) {
    const current = latest.get(snapshot.farmId);
    if (!current || toSnapshotTime(snapshot.analyzedAt) > toSnapshotTime(current.analyzedAt)) {
      latest.set(snapshot.farmId, snapshot);
    }
  }
  return [...latest.values()].sort(
    (a, b) => toSnapshotTime(b.analyzedAt) - toSnapshotTime(a.analyzedAt),
  );
};

export const mergeAnalysisSnapshots = (...groups: AnalysisSnapshot[][]): AnalysisSnapshot[] => {
  const merged = new Map<string, AnalysisSnapshot>();
  for (const snapshot of groups.flat()) merged.set(snapshot.id, snapshot);
  return [...merged.values()].sort(
    (a, b) => toSnapshotTime(b.analyzedAt) - toSnapshotTime(a.analyzedAt),
  );
};
