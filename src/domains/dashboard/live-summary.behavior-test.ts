import type { RiskLevel, WorkType } from "../shared/types";
import type { AnalysisSourceStatus } from "../reports/report-generation";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

interface DashboardAnalysisInput {
  riskResult: {
    score: number;
    level: RiskLevel;
    recommendedWorks: WorkType[];
    updatedAt: string;
  } | null;
  weather: {
    temperature: number;
    humidity: number;
    rainfall: number;
    wind: number;
  } | null;
  sourceStatus: AnalysisSourceStatus;
  pesticideRecommendations?: unknown;
  pests: unknown[];
  analyzedAt: string;
}

interface DashboardLiveSummary {
  status: "SUCCESS" | "PARTIAL";
  statusLabel: string;
  weather: DashboardAnalysisInput["weather"] | null;
  risk: { score: number; level: RiskLevel } | null;
  pesticideRecommendations: unknown | null;
  updatedAt: string | null;
  note: string;
}

type SummaryFactory = (input: DashboardAnalysisInput) => DashboardLiveSummary;
const modulePath = "./live-summary.ts";
const summaryModule = await import(modulePath).catch(() => null);
const createDashboardLiveSummary = (
  summaryModule as { createDashboardLiveSummary?: SummaryFactory } | null
)?.createDashboardLiveSummary;

assert(
  typeof createDashboardLiveSummary === "function",
  "dashboard live summary mapper must be implemented",
);
if (!createDashboardLiveSummary) throw new Error("dashboard live summary mapper is unavailable");

const baseInput: DashboardAnalysisInput = {
  riskResult: {
    score: 62,
    level: "WARNING",
    recommendedWorks: ["방제"],
    updatedAt: "2026-06-20T09:30:00+09:00",
  },
  weather: {
    temperature: 28.4,
    humidity: 86,
    rainfall: 12,
    wind: 2.1,
  },
  sourceStatus: {
    weather: "LIVE",
    agriWeather: "LIVE",
    pests: "LIVE",
  },
  pesticideRecommendations: {
    growthStageLabel: "결실기",
    usable: [{ id: "p1" }],
    restricted: [],
    unknown: [],
    totalCount: 1,
  },
  pests: [{ id: "pest-1" }],
  analyzedAt: "2026-06-20T09:30:00+09:00",
};

const liveSummary = createDashboardLiveSummary(baseInput);
assert(liveSummary.status === "SUCCESS", "live KMA and NCPMS data must be successful");
assert(liveSummary.weather?.temperature === 28.4, "live KMA weather must remain visible");
assert(liveSummary.risk?.score === 62, "reliable live inputs must expose the risk score");
assert(liveSummary.statusLabel === "최신 분석", "successful analysis label mismatch");
assert(
  liveSummary.pesticideRecommendations === baseInput.pesticideRecommendations,
  "dashboard summary must preserve PERS pesticide decision context",
);

const missingWeather = createDashboardLiveSummary({
  ...baseInput,
  weather: null,
  riskResult: null,
  sourceStatus: { ...baseInput.sourceStatus, weather: "FALLBACK" },
});
assert(missingWeather.status === "PARTIAL", "fallback weather must be marked partial");
assert(missingWeather.weather === null, "fallback weather values must not be displayed");
assert(missingWeather.risk === null, "risk based on fallback weather must not be displayed");
assert(missingWeather.updatedAt === null, "missing risk must not invent an analysis timestamp");
assert(
  missingWeather.pesticideRecommendations === baseInput.pesticideRecommendations,
  "partial dashboard summary must keep PERS context for UI disclosure",
);

const fallbackPests = createDashboardLiveSummary({
  ...baseInput,
  riskResult: null,
  sourceStatus: { ...baseInput.sourceStatus, pests: "FALLBACK" },
});
assert(fallbackPests.weather?.humidity === 86, "live weather remains valid on pest fallback");
assert(fallbackPests.risk === null, "risk based on fallback pests must not be displayed");

const emptyPests = createDashboardLiveSummary({
  ...baseInput,
  sourceStatus: { ...baseInput.sourceStatus, pests: "EMPTY" },
});
assert(emptyPests.risk?.level === "WARNING", "an empty live pest result is a valid input");

console.log("dashboard live summary behavior tests passed");
