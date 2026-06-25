import { getCropThreshold, type CropThreshold } from "./crop-thresholds";
import type { RiskAssessment, RiskFactor, RiskLevel } from "../shared/types";
import { getRecommendedWorks } from "./work-feasibility";
import type { GrowthStage } from "../farms/growth-stage";

interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
  wind: number;
  kmaMaxWindSpeed?: number;
  kmaSnowDepth?: number;
}

interface SoilData {
  soilMoisture?: number;
  soilTemperature?: number;
}

interface RiskScoreOptions {
  growthStage?: string;
  surveillanceRisk?: number;
  localHistoryRisk?: number;
}

const RISK_WEIGHTS = {
  weatherRisk: 0.35,
  pestKnowledgeRisk: 0.25,
  surveillanceRisk: 0.2,
  growthStageRisk: 0.1,
  localHistoryRisk: 0.1,
} as const;

const INTERNAL_GROWTH_STAGE_SENSITIVITY: Record<GrowthStage, number> = {
  유묘기: 50,
  생육초기: 40,
  생육중기: 40,
  개화기: 70,
  결실기: 70,
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const round = (value: number) => Math.round(value);

const scoreAboveRange = (value: number, optimalMax: number, max: number) => {
  if (value <= optimalMax) return 0;
  if (value <= max) return clamp(25 + ((value - optimalMax) / Math.max(max - optimalMax, 1)) * 35);
  return clamp(85 + (value - max) * 5);
};

const scoreBelowRange = (value: number, optimalMin: number, min: number) => {
  if (value >= optimalMin) return 0;
  if (value >= min) return clamp(25 + ((optimalMin - value) / Math.max(optimalMin - min, 1)) * 35);
  return clamp(85 + (min - value) * 5);
};

const calculateWeatherRisk = (threshold: CropThreshold, weather: WeatherData, soil: SoilData) => {
  const tempRisk = Math.max(
    scoreAboveRange(weather.temperature, threshold.temp.optimalMax, threshold.temp.max),
    scoreBelowRange(weather.temperature, threshold.temp.optimalMin, threshold.temp.min),
  );
  const humidityRisk = Math.max(
    scoreAboveRange(weather.humidity, threshold.humidity.optimalMax, 95),
    scoreBelowRange(weather.humidity, threshold.humidity.optimalMin, 30),
  );
  const rainRisk =
    weather.rainfall >= 50 ? 100 : weather.rainfall >= 30 ? 75 : weather.rainfall >= 10 ? 35 : 0;

  // kmaMaxWindSpeed(극한 풍속)이 있으면 이를 반영, 없으면 일반 wind 사용
  const effectiveWind =
    weather.kmaMaxWindSpeed && weather.kmaMaxWindSpeed > weather.wind
      ? weather.kmaMaxWindSpeed
      : weather.wind;
  const windRisk =
    effectiveWind >= 10 ? clamp(90 + (effectiveWind - 10) * 5) : effectiveWind >= 5 ? 45 : 0;

  // 적설량 위험 가중치 추가
  const snowRisk =
    weather.kmaSnowDepth && weather.kmaSnowDepth > 0 ? clamp(weather.kmaSnowDepth * 10) : 0;

  const soilRisk =
    soil.soilMoisture === undefined
      ? 0
      : Math.max(
          scoreAboveRange(
            soil.soilMoisture,
            threshold.soilMoisture.max,
            threshold.soilMoisture.max + 20,
          ),
          scoreBelowRange(
            soil.soilMoisture,
            threshold.soilMoisture.min,
            threshold.soilMoisture.min - 20,
          ),
        );

  return clamp(
    tempRisk * 0.25 +
      humidityRisk * 0.2 +
      rainRisk * 0.2 +
      windRisk * 0.15 +
      soilRisk * 0.1 +
      snowRisk * 0.1,
  );
};

const calculateSurveillanceRisk = (
  pestEvidenceCount: number,
  weatherRisk: number,
  explicitRisk: number | undefined,
) => {
  if (explicitRisk !== undefined) return clamp(explicitRisk);
  if (pestEvidenceCount <= 0) return 0;
  return clamp(30 + pestEvidenceCount * 20 + (weatherRisk >= 60 ? 20 : 0));
};

const calculateGrowthStageRisk = (growthStage: string | undefined) => {
  if (!growthStage || !(growthStage in INTERNAL_GROWTH_STAGE_SENSITIVITY)) return 0;
  return INTERNAL_GROWTH_STAGE_SENSITIVITY[growthStage as GrowthStage];
};

const calculateLocalHistoryRisk = (
  pestEvidenceCount: number,
  weatherRisk: number,
  explicitRisk: number | undefined,
) => {
  if (explicitRisk !== undefined) return clamp(explicitRisk);
  if (pestEvidenceCount > 0 && weatherRisk >= 60) return 80;
  if (pestEvidenceCount > 0) return 45;
  if (weatherRisk >= 75) return 35;
  return 0;
};

const getRiskLevel = (score: number): RiskLevel => {
  if (score <= 24) return "SAFE";
  if (score <= 49) return "WATCH";
  if (score <= 74) return "WARNING";
  return "CRITICAL";
};

const toFactor = (
  name: string,
  rawScore: number,
  weight: number,
  description: string,
): RiskFactor | null => {
  const contribution = round(rawScore * weight);
  if (contribution <= 0) return null;
  return { name, score: contribution, weight, description };
};

export const calculateRiskScore = (
  crop: string,
  weather: WeatherData,
  soil: SoilData,
  pestEvidenceCount = 0,
  options: RiskScoreOptions = {},
): RiskAssessment => {
  const threshold = getCropThreshold(crop);
  const weatherRisk = calculateWeatherRisk(threshold, weather, soil);
  const pestObservationRisk = clamp(pestEvidenceCount * 35);
  const surveillanceRisk = calculateSurveillanceRisk(
    pestEvidenceCount,
    weatherRisk,
    options.surveillanceRisk,
  );
  const growthStageRisk = calculateGrowthStageRisk(options.growthStage);
  const localHistoryRisk = calculateLocalHistoryRisk(
    pestEvidenceCount,
    weatherRisk,
    options.localHistoryRisk,
  );

  const score = clamp(
    round(
      weatherRisk * RISK_WEIGHTS.weatherRisk +
        pestObservationRisk * RISK_WEIGHTS.pestKnowledgeRisk +
        surveillanceRisk * RISK_WEIGHTS.surveillanceRisk +
        growthStageRisk * RISK_WEIGHTS.growthStageRisk +
        localHistoryRisk * RISK_WEIGHTS.localHistoryRisk,
    ),
  );

  const factors = [
    toFactor(
      "기상 위험",
      weatherRisk,
      RISK_WEIGHTS.weatherRisk,
      `작물 기준 온도·습도·강수·풍속${soil.soilMoisture === undefined ? "" : "·토양수분"} 위험도 ${round(weatherRisk)}점`,
    ),
    toFactor(
      "병해충 관측",
      pestObservationRisk,
      RISK_WEIGHTS.pestKnowledgeRisk,
      `연계된 예찰·관측 근거 ${pestEvidenceCount}건을 반영했습니다.`,
    ),
    toFactor(
      "예찰 위험",
      surveillanceRisk,
      RISK_WEIGHTS.surveillanceRisk,
      `병해충 관측 근거와 환경 조건을 반영한 예찰 위험도 ${round(surveillanceRisk)}점`,
    ),
    toFactor(
      "생육단계 민감도",
      growthStageRisk,
      RISK_WEIGHTS.growthStageRisk,
      options.growthStage
        ? `${options.growthStage} 단계의 서비스 내부 정책 민감도를 반영했습니다. NCPMS 제공 위험 점수가 아닙니다.`
        : "생육단계 데이터가 없어 민감도 점수를 적용하지 않았습니다.",
    ),
    toFactor(
      "지역 이력 위험",
      localHistoryRisk,
      RISK_WEIGHTS.localHistoryRisk,
      `현재 연계 데이터 기준 지역 이력 위험도 ${round(localHistoryRisk)}점`,
    ),
  ].filter((factor): factor is RiskFactor => factor !== null);

  return {
    score,
    level: getRiskLevel(score),
    factors: factors.sort((a, b) => b.score - a.score),
    recommendedWorks: getRecommendedWorks(crop, weather, soil, pestEvidenceCount > 0),
    updatedAt: new Date().toISOString(),
  };
};
