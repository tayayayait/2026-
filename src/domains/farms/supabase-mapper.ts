import type { Json, Database } from "@/integrations/supabase/types";
import type {
  Crop,
  CropLandType,
  Farm,
  FarmMapCoordinate,
  FarmMapParcelSource,
  FarmMapPolygon,
  FarmParcelSelection,
} from "./types";
import type { WorkType } from "../shared/types";
import {
  getNcpmsGrowthStageCodeByLabel,
  getNcpmsGrowthStageLabel,
  parseNcpmsGrowthStageCode,
} from "./growth-stage";

type FarmRow = Database["public"]["Tables"]["farms"]["Row"];
type FarmInsert = Database["public"]["Tables"]["farms"]["Insert"];

const CROPS: readonly Crop[] = ["감귤", "감자", "고추", "벼", "배", "사과", "파", "포도"];
const WORK_TYPES: readonly WorkType[] = [
  "방제",
  "관수",
  "배수",
  "수확",
  "파종",
  "정식",
  "경운/정지",
  "제초",
];
const CROP_LAND_TYPES: readonly CropLandType[] = ["논", "밭", "과수", "시설", "기타", "미확인"];
const PARCEL_SOURCES: readonly FarmMapParcelSource[] = ["FARMMAP", "FALLBACK"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isOneOf = <T extends string>(value: unknown, values: readonly T[]): value is T =>
  typeof value === "string" && values.includes(value as T);

const parseCoordinate = (value: unknown): FarmMapCoordinate | null => {
  if (!isRecord(value) || typeof value.lat !== "number" || typeof value.lng !== "number") {
    return null;
  }
  return { lat: value.lat, lng: value.lng };
};

const parseGeometry = (value: unknown): FarmMapPolygon | null => {
  if (value === null) return null;
  if (!isRecord(value) || value.type !== "Polygon" || !Array.isArray(value.coordinates)) {
    return null;
  }

  const coordinates = value.coordinates.map((ring) =>
    Array.isArray(ring) ? ring.map(parseCoordinate) : [],
  );
  if (coordinates.some((ring) => ring.length === 0 || ring.some((point) => point === null))) {
    return null;
  }

  return { type: "Polygon", coordinates: coordinates as FarmMapCoordinate[][] };
};

const parseParcel = (value: Json | null): FarmParcelSelection | undefined => {
  if (!isRecord(value)) return undefined;
  const centroid = parseCoordinate(value.centroid);
  if (
    typeof value.farmMapId !== "string" ||
    !(typeof value.pnu === "string" || value.pnu === null) ||
    typeof value.representativeAddress !== "string" ||
    !(typeof value.landCategory === "string" || value.landCategory === null) ||
    !isOneOf(value.cropLandType, CROP_LAND_TYPES) ||
    typeof value.areaSquareMeter !== "number" ||
    !(typeof value.cadastralMatchRate === "number" || value.cadastralMatchRate === null) ||
    !(typeof value.updatedYear === "string" || value.updatedYear === null) ||
    !centroid ||
    !isOneOf(value.source, PARCEL_SOURCES)
  ) {
    return undefined;
  }

  return {
    farmMapId: value.farmMapId,
    pnu: value.pnu,
    representativeAddress: value.representativeAddress,
    landCategory: value.landCategory,
    cropLandType: value.cropLandType,
    areaSquareMeter: value.areaSquareMeter,
    cadastralMatchRate: value.cadastralMatchRate,
    updatedYear: value.updatedYear,
    geometry: parseGeometry(value.geometry),
    centroid,
    source: value.source,
  };
};

const coordinateToJson = (coordinate: FarmMapCoordinate): Json => ({
  lat: coordinate.lat,
  lng: coordinate.lng,
});

const parcelToJson = (parcel: FarmParcelSelection): Json => ({
  farmMapId: parcel.farmMapId,
  pnu: parcel.pnu,
  representativeAddress: parcel.representativeAddress,
  landCategory: parcel.landCategory,
  cropLandType: parcel.cropLandType,
  areaSquareMeter: parcel.areaSquareMeter,
  cadastralMatchRate: parcel.cadastralMatchRate,
  updatedYear: parcel.updatedYear,
  geometry: parcel.geometry
    ? {
        type: parcel.geometry.type,
        coordinates: parcel.geometry.coordinates.map((ring) => ring.map(coordinateToJson)),
      }
    : null,
  centroid: coordinateToJson(parcel.centroid),
  source: parcel.source,
});

export const farmFromSupabaseRow = (row: FarmRow): Farm => {
  if (!isOneOf(row.crop, CROPS)) {
    throw new Error(`Invalid farm row: ${row.id}`);
  }

  const interestedWork = Array.isArray(row.interestedWork)
    ? row.interestedWork.filter((value): value is WorkType => isOneOf(value, WORK_TYPES))
    : [];
  const parcel = parseParcel(row.parcel);
  const growthStageCode =
    parseNcpmsGrowthStageCode(row.growth_stage_code) ?? getNcpmsGrowthStageCodeByLabel(row.stage);

  return {
    id: row.id,
    name: row.name,
    address: row.address,
    region: row.region,
    lat: row.lat,
    lng: row.lng,
    crop: row.crop,
    area: row.area,
    growthStageCode,
    interestedWork,
    ...(parcel ? { parcel } : {}),
    createdAt: row.createdAt,
  };
};

export const farmToSupabaseInsert = (farm: Farm, userId: string): FarmInsert => ({
  id: farm.id,
  name: farm.name,
  address: farm.address,
  region: farm.region,
  lat: farm.lat,
  lng: farm.lng,
  crop: farm.crop,
  area: farm.area,
  stage: getNcpmsGrowthStageLabel(farm.growthStageCode) ?? "재선택 필요",
  growth_stage_code: farm.growthStageCode,
  interestedWork: farm.interestedWork,
  parcel: farm.parcel ? parcelToJson(farm.parcel) : null,
  createdAt: farm.createdAt,
  user_id: userId,
});
