import type { Crop } from "./types";

const CROP_ALIASES: Partial<Record<Crop, readonly string[]>> = {
  벼: ["논벼", "쌀"],
};

const normalizeCropName = (value: string) => value.replace(/\s+/g, "").trim();

export const getAcceptedCropNames = (crop: Crop | string): string[] =>
  [crop, ...(CROP_ALIASES[crop as Crop] ?? [])].map(normalizeCropName);

export const matchesCropName = (farmCrop: Crop | string, candidateName: string): boolean =>
  getAcceptedCropNames(farmCrop).includes(normalizeCropName(candidateName));
