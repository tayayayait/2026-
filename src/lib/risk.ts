import type { Farm } from "@/domains/farms/types";
import type { RiskLevel, WorkType } from "@/domains/shared/types";
import { SAMPLE_WEATHER, PEST_DB } from "@/data/demo";

export const distanceKm = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) => {
  const earthRadiusKm = 6371;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

export const assessRisk = (farm: Farm) => {
  let score = 50;
  let level: RiskLevel = "SAFE";

  if (farm.crop === "벼") {
    score = 72;
    level = "WARNING";
  } else if (farm.crop === "고추") {
    score = 45;
    level = "WATCH";
  }

  const recommendedWorks: WorkType[] = ["방제", "관수"];

  return {
    score,
    level,
    factors: [
      { name: "기온", score: 20, description: "고온 조건" },
      { name: "습도", score: 30, description: "다습 조건" },
    ],
    recommendedWorks,
    pests: PEST_DB.filter((pest) => pest.crop === farm.crop),
    weather: SAMPLE_WEATHER[farm.region],
  };
};
