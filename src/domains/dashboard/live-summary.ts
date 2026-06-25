import type { AnalysisSourceStatus } from "../reports/report-generation";
import type { RiskLevel, WorkType } from "../shared/types";
import type { MarketPriceSummary } from "../market-prices/price-summary";
import type { PesticideRecommendationView } from "../pesticides/safe-use";

export interface DashboardAnalysisInput {
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
    baseDate?: string;
    baseTime?: string;
    nx?: number;
    ny?: number;
  } | null;
  agriWeather?: {
    observedDate: string;
    stationName: string;
    distanceKm: number;
    averageTemperature?: number;
    humidity?: number;
    rainfall?: number;
    windSpeed?: number;
  } | null;
  sourceStatus: AnalysisSourceStatus;
  marketPriceSummary?: MarketPriceSummary | null;
  pesticideRecommendations?: PesticideRecommendationView | null;
  pests: unknown[];
  analyzedAt: string;
}

export interface DashboardLiveSummary {
  status: "SUCCESS" | "PARTIAL";
  statusLabel: string;
  weather: DashboardAnalysisInput["weather"] | null;
  agriWeather: DashboardAnalysisInput["agriWeather"] | null;
  risk: { score: number; level: RiskLevel } | null;
  marketPriceSummary: MarketPriceSummary | null;
  pesticideRecommendations: PesticideRecommendationView | null;
  updatedAt: string | null;
  note: string;
}

const isReliablePestStatus = (status: AnalysisSourceStatus["pests"]) =>
  status === "LIVE" || status === "EMPTY";

export const createDashboardLiveSummary = (
  analysis: DashboardAnalysisInput,
): DashboardLiveSummary => {
  const hasLiveWeather = analysis.sourceStatus.weather === "LIVE";
  const hasAgriWeather = analysis.sourceStatus.agriWeather === "LIVE";
  const hasReliablePests = isReliablePestStatus(analysis.sourceStatus.pests);
  const riskResult = analysis.riskResult;
  // 기상청 데이터가 없더라도 농업기상 데이터가 있으면 위험도 표시 가능
  const canShowRisk = (hasLiveWeather || hasAgriWeather) && hasReliablePests && riskResult !== null;

  if (canShowRisk) {
    return {
      status: "SUCCESS",
      statusLabel: "최신 분석",
      weather: analysis.weather,
      agriWeather: analysis.agriWeather ?? null,
      risk: {
        score: riskResult.score,
        level: riskResult.level,
      },
      marketPriceSummary: analysis.marketPriceSummary ?? null,
      pesticideRecommendations: analysis.pesticideRecommendations ?? null,
      updatedAt: riskResult.updatedAt,
      note: hasLiveWeather ? "기상청·NCPMS 실응답 기준" : "농업기상·NCPMS 실응답 기준",
    };
  }

  return {
    status: "PARTIAL",
    statusLabel: "일부 데이터 누락",
    weather: hasLiveWeather ? analysis.weather : null,
    agriWeather: hasAgriWeather ? (analysis.agriWeather ?? null) : null,
    risk: null,
    marketPriceSummary: analysis.marketPriceSummary ?? null,
    pesticideRecommendations: analysis.pesticideRecommendations ?? null,
    updatedAt: analysis.riskResult?.updatedAt ?? null,
    note: (hasLiveWeather || hasAgriWeather) ? "NCPMS 실응답 확인 필요" : "기상 실응답 확인 필요",
  };
};
