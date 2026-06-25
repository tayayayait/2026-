export interface CropThreshold {
  crop: string;
  temp: { min: number; max: number; optimalMin: number; optimalMax: number };
  humidity: { optimalMin: number; optimalMax: number };
  soilMoisture: { min: number; max: number };
  criticalPests: string[];
}

export const CROP_THRESHOLDS: Record<string, CropThreshold> = {
  벼: {
    crop: "벼",
    temp: { min: 15, max: 35, optimalMin: 22, optimalMax: 30 },
    humidity: { optimalMin: 60, optimalMax: 80 },
    soilMoisture: { min: 50, max: 100 },
    criticalPests: ["도열병", "잎집무늬마름병", "벼멸구"],
  },
  사과: {
    crop: "사과",
    temp: { min: -5, max: 32, optimalMin: 15, optimalMax: 25 },
    humidity: { optimalMin: 50, optimalMax: 70 },
    soilMoisture: { min: 20, max: 40 },
    criticalPests: ["탄저병", "갈색무늬병", "복숭아순나방"],
  },
  고추: {
    crop: "고추",
    temp: { min: 10, max: 35, optimalMin: 20, optimalMax: 28 },
    humidity: { optimalMin: 50, optimalMax: 75 },
    soilMoisture: { min: 15, max: 35 },
    criticalPests: ["탄저병", "역병", "담배나방"],
  },
  default: {
    crop: "기타",
    temp: { min: 10, max: 35, optimalMin: 18, optimalMax: 28 },
    humidity: { optimalMin: 50, optimalMax: 80 },
    soilMoisture: { min: 20, max: 50 },
    criticalPests: [],
  },
};

export const getCropThreshold = (crop: string): CropThreshold =>
  CROP_THRESHOLDS[crop] || CROP_THRESHOLDS.default;
