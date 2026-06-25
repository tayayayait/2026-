import type { MachineStatus } from "../machines/types";
import { getMachineStatusLabel as getMachineStatusPresentationLabel } from "../machines/presentation";
import type { PestDetailPanel } from "../pests/detail-selection";
import type { PesticideRecommendationView } from "../pesticides/safe-use";
import type { RiskAssessment } from "../shared/types";
import type { NcpmsPest } from "../../integrations/ncpms/disease";
import type { AgriWeatherObservation } from "../../integrations/agriWeather/observation";
import type { AnalysisSourceStatus } from "./report-generation";
import type { MarketPriceSummary } from "../market-prices/price-summary";

export interface ReportAnalysis {
  riskResult: RiskAssessment | null;
  weather: {
    temperature: number;
    humidity: number;
    rainfall: number;
    wind: number;
  } | null;
  agriWeather: AgriWeatherObservation | null;
  pests: NcpmsPest[];
  pestDetails: PestDetailPanel[];
  pesticideRecommendations: PesticideRecommendationView;
  marketPriceSummary: MarketPriceSummary | null;
  sourceStatus: AnalysisSourceStatus;
}

export const getMachineStatusLabel = (status: MachineStatus) =>
  getMachineStatusPresentationLabel(status);

export const getRiskLevelLabel = (level: RiskAssessment["level"]) => {
  if (level === "CRITICAL") return "심각";
  if (level === "WARNING") return "주의";
  if (level === "WATCH") return "관심";
  if (level === "UNKNOWN") return "데이터 부족";
  return "안정";
};
