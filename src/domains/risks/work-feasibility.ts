import type { WorkType } from "../shared/types";

interface WorkWeather {
  rainfall: number;
  wind: number;
  temperature: number;
  humidity?: number;
}

export const getRecommendedWorks = (
  crop: string,
  weather: WorkWeather,
  soil: { soilMoisture?: number },
  hasPests: boolean,
): WorkType[] => {
  const works: WorkType[] = [];

  if (hasPests && weather.rainfall < 5 && weather.wind < 3 && weather.temperature < 30) {
    works.push("방제");
  }

  if (soil.soilMoisture !== undefined && soil.soilMoisture < 30 && weather.rainfall < 5) {
    works.push("관수");
  }

  if (weather.rainfall > 20 || (soil.soilMoisture !== undefined && soil.soilMoisture > 90)) {
    works.push("배수");
  }

  if (weather.temperature > 15 && weather.temperature < 30 && weather.rainfall < 10) {
    works.push("제초");
  }

  if (weather.rainfall === 0 && weather.humidity !== undefined && weather.humidity < 80) {
    works.push("수확");
  }

  if (
    crop &&
    weather.temperature > 15 &&
    weather.temperature < 25 &&
    soil.soilMoisture !== undefined &&
    soil.soilMoisture > 20
  ) {
    works.push("정식");
  }

  return Array.from(new Set(works));
};

export const calculateWorkWindow = (weather: {
  rainfall: number;
  wind: number;
}): { window: string; forbidden: string | null } => {
  if (weather.rainfall > 30 || weather.wind > 10) {
    return {
      window: "작업 불가",
      forbidden: "강풍 또는 호우 조건에서는 모든 실외 작업을 중지해야 합니다.",
    };
  }

  if (weather.rainfall > 5) {
    return {
      window: "제한적 가능",
      forbidden: "강수 조건에서는 방제 작업을 권장하지 않습니다.",
    };
  }

  return { window: "오전 06:00 ~ 10:00, 오후 16:00 ~ 19:00", forbidden: null };
};
