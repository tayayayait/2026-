import type { AnalysisSourceStatus } from "../reports/report-generation";
import type { RiskLevel, WorkType } from "../shared/types";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

interface Snapshot {
  id: string;
  farmId: string;
  farmName: string;
  region: string;
  crop: string;
  score: number | null;
  level: RiskLevel;
  weather: { temperature: number; humidity: number; rainfall: number; wind: number } | null;
  sourceStatus: AnalysisSourceStatus;
  pestCount: number;
  recommendedWorks: WorkType[];
  analyzedAt: string;
}

interface SnapshotOperations {
  createAnalysisSnapshot: (input: {
    farm: { id: string; name: string; region: string; crop: string };
    analysis: {
      analyzedAt?: string;
      riskResult: {
        score: number;
        level: RiskLevel;
        recommendedWorks: WorkType[];
        updatedAt: string;
      } | null;
      weather: Snapshot["weather"];
      sourceStatus: AnalysisSourceStatus;
      pests: unknown[];
    };
  }) => Snapshot;
  selectLatestAnalysisSnapshots: (snapshots: Snapshot[]) => Snapshot[];
  mergeAnalysisSnapshots: (...groups: Snapshot[][]) => Snapshot[];
  deriveAnalysisAlerts: (snapshots: Snapshot[]) => Array<{
    id: string;
    farmId: string;
    severity: "CRITICAL" | "WARNING" | "INFO";
    title: string;
    message: string;
  }>;
  buildRegionalOperations: (
    snapshots: Snapshot[],
    totalFarmCount: number,
  ) => {
    analyzedFarmCount: number;
    coveragePercent: number;
    riskRegionCount: number;
    regions: Array<{
      region: string;
      farmCount: number;
      criticalCount: number;
      warningCount: number;
      averageScore: number | null;
    }>;
    workDemand: Array<{ work: WorkType; count: number }>;
  };
}

const modulePath = "./snapshot-operations.ts";
const operationsModule = await import(modulePath).catch(() => null);
const operations = operationsModule as SnapshotOperations | null;
assert(operations !== null, "analysis snapshot operations must be implemented");
if (!operations) throw new Error("analysis snapshot operations are unavailable");

const liveSources: AnalysisSourceStatus = {
  weather: "LIVE",
  agriWeather: "LIVE",
  pests: "LIVE",
};

const criticalSnapshot = operations.createAnalysisSnapshot({
  farm: { id: "farm-1", name: "만경 농장", region: "김제시 만경읍", crop: "벼" },
  analysis: {
    riskResult: {
      score: 82,
      level: "CRITICAL",
      recommendedWorks: ["배수", "방제"],
      updatedAt: "2026-06-21T09:00:00+09:00",
    },
    weather: { temperature: 29, humidity: 88, rainfall: 52, wind: 3 },
    sourceStatus: liveSources,
    pests: [{ id: "pest-1" }],
  },
});
assert(criticalSnapshot.score === 82, "snapshot must preserve a live risk score");
assert(criticalSnapshot.pestCount === 1, "snapshot must preserve pest candidate count");

const unavailableSnapshot = operations.createAnalysisSnapshot({
  farm: { id: "farm-2", name: "신태인 농장", region: "정읍시 신태인읍", crop: "고추" },
  analysis: {
    analyzedAt: "2026-06-21T09:05:00+09:00",
    riskResult: null,
    weather: null,
    sourceStatus: { ...liveSources, weather: "FAILED" },
    pests: [],
  },
});
assert(unavailableSnapshot.score === null, "missing analysis must keep a null score");
assert(unavailableSnapshot.level === "UNKNOWN", "missing analysis must use UNKNOWN level");
assert(
  unavailableSnapshot.analyzedAt === "2026-06-21T09:05:00+09:00",
  "snapshot must preserve an explicit analysis attempt time",
);

const olderSnapshot = {
  ...criticalSnapshot,
  id: "older",
  score: 20,
  analyzedAt: "2026-06-20T09:00:00+09:00",
};
const latest = operations.selectLatestAnalysisSnapshots([
  olderSnapshot,
  unavailableSnapshot,
  criticalSnapshot,
]);
assert(latest.length === 2, "latest snapshot selection must keep one row per farm");
assert(latest.find((item) => item.farmId === "farm-1")?.score === 82, "latest snapshot mismatch");

assert(
  typeof operations.mergeAnalysisSnapshots === "function",
  "snapshot merge operation must be implemented",
);
const merged = operations.mergeAnalysisSnapshots(
  [olderSnapshot, criticalSnapshot],
  [criticalSnapshot, unavailableSnapshot],
);
assert(merged.length === 3, "snapshot merge must remove duplicate ids");
assert(
  merged.every(
    (snapshot, index) =>
      index === 0 || Date.parse(merged[index - 1]!.analyzedAt) >= Date.parse(snapshot.analyzedAt),
  ),
  "snapshot merge must sort newest first",
);

const alerts = operations.deriveAnalysisAlerts([
  olderSnapshot,
  unavailableSnapshot,
  criticalSnapshot,
]);
assert(
  alerts.some((alert) => alert.farmId === "farm-1" && alert.severity === "CRITICAL"),
  "critical live risk must generate a critical alert",
);
assert(
  alerts.some((alert) => alert.title.includes("강수")),
  "heavy live rainfall must generate a rainfall alert",
);
assert(
  alerts.some((alert) => alert.farmId === "farm-2" && alert.severity === "INFO"),
  "missing analysis inputs must generate an information alert",
);
assert(
  alerts.every((alert) => !alert.id.includes("older")),
  "alerts must only use the latest snapshot per farm",
);

const regional = operations.buildRegionalOperations(
  [olderSnapshot, unavailableSnapshot, criticalSnapshot],
  3,
);
assert(regional.analyzedFarmCount === 2, "regional analysis count mismatch");
assert(regional.coveragePercent === 67, "regional coverage must be rounded");
assert(regional.riskRegionCount === 1, "critical/warning region count mismatch");
assert(
  regional.regions.find((item) => item.region === "김제시 만경읍")?.criticalCount === 1,
  "critical regional count mismatch",
);
assert(
  regional.workDemand.find((item) => item.work === "배수")?.count === 1,
  "recommended work demand mismatch",
);

console.log("analysis snapshot operations behavior tests passed");
