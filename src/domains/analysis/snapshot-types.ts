import type { AnalysisSourceStatus } from "../reports/report-generation";
import type { RiskLevel, WorkType } from "../shared/types";

export interface AnalysisSnapshot {
  id: string;
  farmId: string;
  farmName: string;
  region: string;
  crop: string;
  score: number | null;
  level: RiskLevel;
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
  sourceStatus: AnalysisSourceStatus;
  pestCount: number;
  recommendedWorks: WorkType[];
  analyzedAt: string;
}

export interface AnalysisAlert {
  id: string;
  snapshotId: string;
  farmId: string;
  farmName: string;
  region: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  message: string;
  createdAt: string;
}

export interface RegionalOperations {
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
}
