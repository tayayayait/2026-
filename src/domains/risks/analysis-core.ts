import { calculateRiskScore } from "./calculator";
import type { RiskAssessment } from "../shared/types";
import type { AgriWeatherObservation } from "@/integrations/agriWeather/observation";

export interface AnalysisWeather {
  temperature: number;
  humidity: number;
  rainfall: number;
  wind: number;
  kmaMaxWindSpeed?: number;
  kmaSnowDepth?: number;
}

interface RiskAnalysisCoreInput {
  crop: string;
  growthStage?: string;
  weather: AnalysisWeather | null;
  agriWeather?: AgriWeatherObservation | null;
  pestEvidenceCount: number;
}

export interface RiskAnalysisCore {
  weather: AnalysisWeather | null;
  riskResult: RiskAssessment | null;
}

export const createRiskAnalysisCore = (input: RiskAnalysisCoreInput): RiskAnalysisCore => {
  // 기상청 실황(weather)이 없더라도, 농업기상 데이터가 있다면 이를 우선 Fallback으로 사용합니다.
  let effectiveWeather = input.weather;
  if (
    !effectiveWeather &&
    input.agriWeather &&
    input.agriWeather.averageTemperature !== undefined
  ) {
    effectiveWeather = {
      temperature: input.agriWeather.averageTemperature,
      humidity: input.agriWeather.humidity ?? 0,
      rainfall: input.agriWeather.rainfall ?? 0,
      wind: input.agriWeather.windSpeed ?? 0,
      kmaMaxWindSpeed: input.agriWeather.kmaMaxWindSpeed,
      kmaSnowDepth: input.agriWeather.kmaSnowDepth,
    };
  } else if (effectiveWeather && input.agriWeather) {
    // weather가 있을 때도 agriWeather의 KMA 데이터를 극한 조건 가중치로 활용
    effectiveWeather = {
      ...effectiveWeather,
      kmaMaxWindSpeed: input.agriWeather.kmaMaxWindSpeed,
      kmaSnowDepth: input.agriWeather.kmaSnowDepth,
    };
  }

  if (!effectiveWeather) {
    return { weather: effectiveWeather ?? null, riskResult: null };
  }

  return {
    weather: effectiveWeather,
    riskResult: calculateRiskScore(input.crop, effectiveWeather, {}, input.pestEvidenceCount, {
      growthStage: input.growthStage,
    }),
  };
};
