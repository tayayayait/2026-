import type { WorkType } from "../shared/types";
import { selectLatestAnalysisSnapshots } from "./snapshot-selection";
import type { AnalysisSnapshot, RegionalOperations } from "./snapshot-types";

export const buildRegionalOperations = (
  snapshots: AnalysisSnapshot[],
  totalFarmCount: number,
): RegionalOperations => {
  const latest = selectLatestAnalysisSnapshots(snapshots);
  const regionMap = new Map<string, AnalysisSnapshot[]>();
  const workCounts = new Map<WorkType, number>();

  for (const snapshot of latest) {
    regionMap.set(snapshot.region, [...(regionMap.get(snapshot.region) ?? []), snapshot]);
    for (const work of snapshot.recommendedWorks) {
      workCounts.set(work, (workCounts.get(work) ?? 0) + 1);
    }
  }

  const regions = [...regionMap.entries()]
    .map(([region, items]) => {
      const scores = items.flatMap((item) => (item.score === null ? [] : [item.score]));
      return {
        region,
        farmCount: items.length,
        criticalCount: items.filter((item) => item.level === "CRITICAL").length,
        warningCount: items.filter((item) => item.level === "WARNING").length,
        averageScore:
          scores.length > 0
            ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
            : null,
      };
    })
    .sort(
      (a, b) =>
        b.criticalCount - a.criticalCount ||
        b.warningCount - a.warningCount ||
        (b.averageScore ?? -1) - (a.averageScore ?? -1),
    );

  return {
    analyzedFarmCount: latest.length,
    coveragePercent: totalFarmCount > 0 ? Math.round((latest.length / totalFarmCount) * 100) : 0,
    riskRegionCount: regions.filter((region) => region.criticalCount > 0 || region.warningCount > 0)
      .length,
    regions,
    workDemand: [...workCounts.entries()]
      .map(([work, count]) => ({ work, count }))
      .sort((a, b) => b.count - a.count || a.work.localeCompare(b.work, "ko")),
  };
};
