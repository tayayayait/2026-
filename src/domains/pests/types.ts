import type { Crop } from "../farms/types";

export interface PestCandidate {
  sickKey: string;
  name: string;
  type: "DISEASE" | "INSECT" | "PHYSIOLOGICAL";
  crop: Crop;
  probability: number;
  symptoms: string;
  image?: string;
}

export interface SurveillanceInfo {
  year: string;
  type: string;
  level: "경보" | "주의보" | "예보" | "안전";
  target: string;
}
