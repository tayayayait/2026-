import type { AddressCandidate, CropLandType, FarmMapParcel, FarmParcelSelection } from "./types";

interface NaverAddressLike {
  roadAddress?: string;
  jibunAddress?: string;
  x: string;
  y: string;
}

const JEONBUK_ALIASES = ["전북", "전라북도", "전북특별자치도"];
export const DEFAULT_FARMMAP_RADIUS_METERS = 50;
export const FARMMAP_RADIUS_OPTIONS = [50, 100, 300, 500, 1000] as const;
export type FarmSearchTab = "ADDRESS" | "REGION";
export type FarmAddressSearchType = "PARCEL" | "ROAD";

export interface JeonbukSearchRegion {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export const JEONBUK_SEARCH_REGIONS: JeonbukSearchRegion[] = [
  { id: "jeonju", label: "전주시", address: "전북특별자치도 전주시", lat: 35.8242, lng: 127.148 },
  { id: "gunsan", label: "군산시", address: "전북특별자치도 군산시", lat: 35.9677, lng: 126.7366 },
  { id: "iksan", label: "익산시", address: "전북특별자치도 익산시", lat: 35.9483, lng: 126.9576 },
  { id: "jeongeup", label: "정읍시", address: "전북특별자치도 정읍시", lat: 35.5699, lng: 126.856 },
  { id: "namwon", label: "남원시", address: "전북특별자치도 남원시", lat: 35.4164, lng: 127.3904 },
  { id: "gimje", label: "김제시", address: "전북특별자치도 김제시", lat: 35.8036, lng: 126.8808 },
  { id: "wanju", label: "완주군", address: "전북특별자치도 완주군", lat: 35.9047, lng: 127.162 },
  { id: "jinan", label: "진안군", address: "전북특별자치도 진안군", lat: 35.7917, lng: 127.4249 },
  { id: "muju", label: "무주군", address: "전북특별자치도 무주군", lat: 36.0071, lng: 127.6608 },
  { id: "jangsu", label: "장수군", address: "전북특별자치도 장수군", lat: 35.6473, lng: 127.5212 },
  { id: "imsil", label: "임실군", address: "전북특별자치도 임실군", lat: 35.6178, lng: 127.2891 },
  { id: "sunchang", label: "순창군", address: "전북특별자치도 순창군", lat: 35.3744, lng: 127.1375 },
  { id: "gochang", label: "고창군", address: "전북특별자치도 고창군", lat: 35.4358, lng: 126.7021 },
  { id: "buan", label: "부안군", address: "전북특별자치도 부안군", lat: 35.7318, lng: 126.733 },
];
const JEONBUK_BOUNDS = {
  latMin: 35.3,
  latMax: 36.2,
  lngMin: 126.4,
  lngMax: 127.7,
};

const normalizeAddress = (address: string) => address.replace(/\s+/g, " ").trim();

export const extractFarmRegion = (address: string): string => {
  const addressWithoutLot = normalizeAddress(address).replace(/\s+산?\s*\d+(?:-\d+)?$/, "");
  const parts = addressWithoutLot.split(" ").filter(Boolean);
  if (parts.length >= 3 && JEONBUK_ALIASES.some((alias) => parts[0]?.includes(alias))) {
    return parts.slice(1, 3).join(" ");
  }
  return parts.slice(0, 2).join(" ");
};

const isCoordinateInJeonbuk = (lat: number, lng: number) =>
  lat >= JEONBUK_BOUNDS.latMin &&
  lat <= JEONBUK_BOUNDS.latMax &&
  lng >= JEONBUK_BOUNDS.lngMin &&
  lng <= JEONBUK_BOUNDS.lngMax;

export const isJeonbukAddressText = (address: string) =>
  JEONBUK_ALIASES.some((alias) => normalizeAddress(address).startsWith(alias));

export const normalizeAddressCandidate = (
  address: NaverAddressLike,
  index: number,
): AddressCandidate => {
  const roadAddress = normalizeAddress(address.roadAddress || "");
  const jibunAddress = normalizeAddress(address.jibunAddress || "");
  const displayAddress = roadAddress || jibunAddress;
  const lat = Number.parseFloat(address.y);
  const lng = Number.parseFloat(address.x);

  return {
    id: `${index}-${lat.toFixed(6)}-${lng.toFixed(6)}`,
    roadAddress,
    jibunAddress,
    lat,
    lng,
    region: extractFarmRegion(displayAddress),
    isJeonbuk: isJeonbukAddressText(displayAddress) || isCoordinateInJeonbuk(lat, lng),
  };
};

export const isJeonbukAddressCandidate = (candidate: AddressCandidate) =>
  candidate.isJeonbuk && isCoordinateInJeonbuk(candidate.lat, candidate.lng);

export const normalizeCropLandType = (value: string | null | undefined): CropLandType => {
  if (!value) return "미확인";
  if (value.includes("논")) return "논";
  if (value.includes("밭") || value.includes("전")) return "밭";
  if (value.includes("과수")) return "과수";
  if (value.includes("시설")) return "시설";
  if (value.includes("기타")) return "기타";
  return "미확인";
};

export const buildFallbackFarmMapParcel = (input: {
  lat: number;
  lng: number;
  representativeAddress: string;
}): FarmMapParcel => ({
  farmMapId: `fallback-${input.lat.toFixed(6)}-${input.lng.toFixed(6)}`,
  pnu: null,
  representativeAddress: normalizeAddress(input.representativeAddress),
  legalDongAddress: normalizeAddress(input.representativeAddress),
  landCategory: null,
  cropLandType: "미확인",
  areaSquareMeter: 0,
  cultivatedAreaSquareMeter: null,
  cultivationRatio: null,
  cadastralMatchRate: null,
  aerialPhotoYear: null,
  updatedYear: null,
  geometry: null,
  centroid: { lat: input.lat, lng: input.lng },
  source: "FALLBACK",
  raw: null,
});

export const selectInitialFarmMapParcel = (parcels: FarmMapParcel[]) =>
  parcels.length === 1 ? parcels[0] : null;

export const toFarmParcelSelection = (parcel: FarmMapParcel): FarmParcelSelection => ({
  farmMapId: parcel.farmMapId,
  pnu: parcel.pnu,
  representativeAddress: parcel.representativeAddress,
  landCategory: parcel.landCategory,
  cropLandType: parcel.cropLandType,
  areaSquareMeter: parcel.areaSquareMeter,
  cadastralMatchRate: parcel.cadastralMatchRate,
  updatedYear: parcel.updatedYear,
  geometry: parcel.geometry,
  centroid: parcel.centroid,
  source: parcel.source,
});
