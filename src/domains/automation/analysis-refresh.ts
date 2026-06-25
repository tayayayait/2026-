interface RefreshTarget {
  id: string;
}

interface RefreshOptions {
  now: string;
  staleAfterMs: number;
  limit: number;
}

export interface AnalysisRefreshBatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  failures: Array<{ farmId: string; reason: string }>;
}

const toTime = (value: string | undefined) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const selectAnalysisRefreshTargets = <T extends RefreshTarget>(
  farms: T[],
  latestAnalyzedAt: Map<string, string>,
  { now, staleAfterMs, limit }: RefreshOptions,
): T[] => {
  const nowTime = toTime(now);
  return farms
    .map((farm, index) => ({ farm, index, analyzedAt: toTime(latestAnalyzedAt.get(farm.id)) }))
    .filter(({ analyzedAt }) => analyzedAt === 0 || nowTime - analyzedAt >= staleAfterMs)
    .sort((a, b) => a.analyzedAt - b.analyzedAt || a.index - b.index)
    .slice(0, Math.max(0, limit))
    .map(({ farm }) => farm);
};

export const executeAnalysisRefreshBatch = async <T extends RefreshTarget>(
  targets: T[],
  refreshFarm: (farm: T) => Promise<void>,
): Promise<AnalysisRefreshBatchResult> => {
  const failures: AnalysisRefreshBatchResult["failures"] = [];
  let succeeded = 0;

  for (const farm of targets) {
    try {
      await refreshFarm(farm);
      succeeded += 1;
    } catch (error) {
      failures.push({
        farmId: farm.id,
        reason: error instanceof Error ? error.message : "unknown refresh error",
      });
    }
  }

  return {
    processed: targets.length,
    succeeded,
    failed: failures.length,
    failures,
  };
};
