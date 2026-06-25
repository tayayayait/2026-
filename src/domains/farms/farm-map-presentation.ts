import type { CropLandType } from "./types";

export const FARMMAP_FEATURE_MIN_ZOOM = 14;

export const FARMMAP_INITIAL_VIEW = {
  center: { lat: 35.8421, lng: 126.8123 },
  zoom: FARMMAP_FEATURE_MIN_ZOOM,
} as const;

export const canSelectFarmMapLocation = (loading: boolean) => !loading;

export type FarmMapFilterableLandType = Extract<CropLandType, "논" | "밭" | "과수" | "시설">;

export type FarmMapLandTypeVisibility = Record<FarmMapFilterableLandType, boolean>;

export interface FarmMapLandTypeStyle {
  label: string;
  strokeColor: string;
  fillColor: string;
}

export const FARMMAP_FILTERABLE_LAND_TYPES = ["논", "밭", "과수", "시설"] as const;

export const FARMMAP_LAND_TYPE_STYLES: Record<FarmMapFilterableLandType, FarmMapLandTypeStyle> = {
  논: { label: "논", strokeColor: "#38bdf8", fillColor: "#0ea5e9" },
  밭: { label: "밭", strokeColor: "#f59e0b", fillColor: "#d97706" },
  과수: { label: "과수", strokeColor: "#22c55e", fillColor: "#16a34a" },
  시설: { label: "시설", strokeColor: "#a855f7", fillColor: "#7c3aed" },
};

const FALLBACK_LAND_TYPE_STYLE: FarmMapLandTypeStyle = {
  label: "미확인",
  strokeColor: "#94a3b8",
  fillColor: "#64748b",
};

export const createDefaultFarmMapLandTypeVisibility = (): FarmMapLandTypeVisibility => ({
  논: true,
  밭: true,
  과수: true,
  시설: true,
});

export const isFarmMapFilterableLandType = (
  cropLandType: string | null | undefined,
): cropLandType is FarmMapFilterableLandType =>
  FARMMAP_FILTERABLE_LAND_TYPES.includes(cropLandType as FarmMapFilterableLandType);

export const getFarmMapLandTypeStyle = (
  cropLandType: string | null | undefined,
): FarmMapLandTypeStyle =>
  isFarmMapFilterableLandType(cropLandType)
    ? FARMMAP_LAND_TYPE_STYLES[cropLandType]
    : FALLBACK_LAND_TYPE_STYLE;

export const filterFarmMapParcelsByLandTypes = <T extends { cropLandType: string }>(
  parcels: T[],
  visibility: FarmMapLandTypeVisibility,
): T[] =>
  parcels.filter(
    (parcel) =>
      isFarmMapFilterableLandType(parcel.cropLandType) && visibility[parcel.cropLandType],
  );

export const countFarmMapParcelsByLandType = <T extends { cropLandType: string }>(
  parcels: T[],
): Record<FarmMapFilterableLandType, number> => {
  const counts: Record<FarmMapFilterableLandType, number> = {
    논: 0,
    밭: 0,
    과수: 0,
    시설: 0,
  };
  for (const parcel of parcels) {
    if (isFarmMapFilterableLandType(parcel.cropLandType)) counts[parcel.cropLandType] += 1;
  }
  return counts;
};
