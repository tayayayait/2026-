import type { RiskAssessment } from "../shared/types";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

interface AnalysisWeather {
  temperature: number;
  humidity: number;
  rainfall: number;
  wind: number;
}

type CoreFactory = (input: {
  crop: string;
  growthStage: string;
  weather: AnalysisWeather | null;
  pestEvidenceCount: number;
  pestStatus: "LIVE" | "EMPTY" | "FALLBACK" | "FAILED";
}) => { weather: AnalysisWeather | null; riskResult: RiskAssessment | null };

const modulePath = "./analysis-core.ts";
const coreModule = await import(modulePath).catch(() => null);
const createRiskAnalysisCore = (coreModule as { createRiskAnalysisCore?: CoreFactory } | null)
  ?.createRiskAnalysisCore;

assert(typeof createRiskAnalysisCore === "function", "risk analysis core must be implemented");
if (!createRiskAnalysisCore) throw new Error("risk analysis core is unavailable");

const weather: AnalysisWeather = {
  temperature: 28,
  humidity: 82,
  rainfall: 12,
  wind: 2,
};

const live = createRiskAnalysisCore({
  crop: "벼",
  growthStage: "생육중기",
  weather,
  pestEvidenceCount: 1,
  pestStatus: "LIVE",
});
assert(live.weather === weather, "live weather must be preserved");
assert(live.riskResult !== null, "live weather and pests must calculate risk");

const missingWeather = createRiskAnalysisCore({
  crop: "벼",
  growthStage: "생육중기",
  weather: null,
  pestEvidenceCount: 1,
  pestStatus: "LIVE",
});
assert(missingWeather.weather === null, "missing weather must remain null");
assert(missingWeather.riskResult === null, "missing weather must not calculate risk");

const fallbackPests = createRiskAnalysisCore({
  crop: "벼",
  growthStage: "생육중기",
  weather,
  pestEvidenceCount: 0,
  pestStatus: "FALLBACK",
});
assert(fallbackPests.weather === weather, "live weather remains usable on pest fallback");
assert(fallbackPests.riskResult !== null, "catalog fallback must not block weather-only risk");
assert(
  !fallbackPests.riskResult?.factors.some((factor) => factor.name === "병해충 관측"),
  "catalog fallback must not fabricate pest evidence",
);

const emptyPests = createRiskAnalysisCore({
  crop: "벼",
  growthStage: "생육중기",
  weather,
  pestEvidenceCount: 0,
  pestStatus: "EMPTY",
});
assert(emptyPests.riskResult !== null, "a valid empty pest response must calculate risk");

console.log("risk analysis core behavior tests passed");
