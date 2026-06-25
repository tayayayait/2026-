import type { RiskLevel, DataStatus } from "../shared/types";
import type { WeatherData } from "../../integrations/kma/types";
import type { PestCandidate, SurveillanceInfo } from "../pests/types";
import type { NcpmsGrowthStageCode } from "../farms/types";

export interface RiskInput {
  weather: WeatherData;
  pests: PestCandidate[];
  surveillance: SurveillanceInfo[];
  growthStageCode: NcpmsGrowthStageCode;
  crop: string;
}

export interface RiskFactor {
  name: string;
  score: number;
  description: string;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
  dataStatus: DataStatus;
}
