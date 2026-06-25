import type { RiskLevel } from "../shared/types";
import type { RiskFactor } from "../risks/types";

export type ReportStatus = "GENERATING" | "SUCCESS" | "FAILED";

export interface GeminiReportSchema {
  summary: string;
  riskDashboard: {
    riskLevelText: string;
    coreReason: string;
    urgency: string;
  };
  topThreats: {
    name: string;
    reason: string;
    requiredAction: string;
  }[];
  actionTimeline: {
    today: string[];
    thisWeek: string[];
    thisMonth: string[];
  };
  pestRiskCards: {
    pestName: string;
    riskProbability: string;
    observationMethod: string;
    actionTiming: string;
    treatmentType: string;
  }[];
  weatherSchedule: {
    condition: string;
    adjustment: string;
  }[];
  pesticideGuide: {
    available: string[];
    precautions: string[];
  };
  marketAnalysis: {
    trendSummary: string;
    seasonality: string;
    strategy: string;
  };
  harvestStrategy: {
    expectedTiming: string;
    priceForecast: string;
    recommendation: string;
  };
  precautions: string[];
  finalChecklist: string[];
}
