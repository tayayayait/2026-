import type { WorkType } from "../shared/types";
import type { NcpmsGrowthStageCode } from "./growth-stage";

export type Crop = "감귤" | "감자" | "고추" | "벼" | "배" | "사과" | "파" | "포도";
export type { GrowthStage, NcpmsGrowthStageCode } from "./growth-stage";

export type CropLandType = "논" | "밭" | "과수" | "시설" | "기타" | "미확인";
export type FarmMapParcelSource = "FARMMAP" | "FALLBACK";

export interface AddressCandidate {
  id: string;
  roadAddress: string;
  jibunAddress: string;
  lat: number;
  lng: number;
  region: string;
  isJeonbuk: boolean;
}

export interface FarmMapCoordinate {
  lat: number;
  lng: number;
}

export interface FarmMapPolygon {
  type: "Polygon";
  coordinates: FarmMapCoordinate[][];
}

export type FarmParcelRaw =
  | string
  | number
  | boolean
  | null
  | FarmParcelRaw[]
  | { [key: string]: FarmParcelRaw };

export interface FarmParcelCandidate {
  farmMapId: string;
  pnu: string | null;
  representativeAddress: string;
  legalDongAddress: string | null;
  landCategory: string | null;
  cropLandType: CropLandType;
  areaSquareMeter: number;
  cultivatedAreaSquareMeter: number | null;
  cultivationRatio: number | null;
  cadastralMatchRate: number | null;
  aerialPhotoYear: string | null;
  updatedYear: string | null;
  geometry: FarmMapPolygon | null;
  centroid: FarmMapCoordinate | null;
  source: FarmMapParcelSource;
  raw: FarmParcelRaw;
}

export interface FarmMapParcel extends FarmParcelCandidate {
  centroid: FarmMapCoordinate;
}

export interface FarmMapParcelSearchResult {
  status: "SUCCESS" | "FALLBACK" | "NOT_FOUND";
  parcels: FarmMapParcel[];
  warning: string | null;
}

export interface FarmParcelCandidateSearchResult {
  status: "SUCCESS" | "FALLBACK" | "NOT_FOUND";
  candidates: FarmParcelCandidate[];
  warning: string | null;
}

export interface FarmParcelSelection {
  farmMapId: string;
  pnu: string | null;
  representativeAddress: string;
  landCategory: string | null;
  cropLandType: CropLandType;
  areaSquareMeter: number;
  cadastralMatchRate: number | null;
  updatedYear: string | null;
  geometry: FarmMapPolygon | null;
  centroid: FarmMapCoordinate;
  source: FarmMapParcelSource;
}

export interface Farm {
  id: string;
  name: string;
  address: string;
  region: string;
  lat: number;
  lng: number;
  crop: Crop;
  area: number;
  growthStageCode: NcpmsGrowthStageCode | null;
  interestedWork: WorkType[];
  parcel?: FarmParcelSelection;
  createdAt: string;
}

export interface FarmCreateInput {
  name: string;
  address: string;
  region: string;
  lat: number;
  lng: number;
  crop: Crop;
  area: number;
  growthStageCode: NcpmsGrowthStageCode;
  interestedWork: WorkType[];
  parcel?: FarmParcelSelection;
}
