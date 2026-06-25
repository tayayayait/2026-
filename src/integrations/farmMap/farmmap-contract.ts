import { normalizeCropLandType } from "../../domains/farms/registration";
import proj4 from "proj4";
import type {
  FarmMapCoordinate,
  FarmMapParcel,
  FarmMapParcelSearchResult,
  FarmMapPolygon,
  FarmParcelCandidate,
  FarmParcelRaw,
} from "../../domains/farms/types";

const FARMMAP_RADIUS_ENDPOINT =
  "https://agis.epis.or.kr/ASD/farmmapApi/getFarmmapDataSeachRadius.do";
const FARMMAP_POINT_ENDPOINT = "https://agis.epis.or.kr/ASD/farmmapApi/getFarmmapDataSeachXY.do";
const FARMMAP_PNU_ENDPOINT = "https://agis.epis.or.kr/ASD/farmmapApi/getFarmmapDataSeachPnu.do";
const EPSG_5179 =
  "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs";
const EPSG_4326 = "+proj=longlat +datum=WGS84 +no_defs";

export interface FarmMapParcelLookupInput {
  lat: number;
  lng: number;
  lookupMode?: "RADIUS" | "POINT" | "PNU";
  radiusMeters?: number;
  representativeAddress: string;
  year?: string;
  pnu?: string;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readValue = (record: UnknownRecord, aliases: string[]) => {
  for (const alias of aliases) {
    const entry = Object.entries(record).find(
      ([key]) => key.toLowerCase() === alias.toLowerCase(),
    );
    if (entry) return entry[1];
  }
  return null;
};

const readString = (record: UnknownRecord, aliases: string | string[]) => {
  const value = readValue(record, Array.isArray(aliases) ? aliases : [aliases]);
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
};

const readNumber = (record: UnknownRecord, aliases: string | string[]) => {
  const value = readString(record, aliases);
  if (value === null) return null;
  const parsed = Number.parseFloat(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const extractYear = (value: string | null) => value?.match(/\d{4}/)?.[0] ?? null;

const toSerializableRaw = (value: unknown): FarmParcelRaw => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map(toSerializableRaw);
  if (!isRecord(value)) return null;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, child]) => child !== undefined && typeof child !== "function" && typeof child !== "symbol")
      .map(([key, child]) => [key, toSerializableRaw(child)]),
  );
};

const readPoint = (value: unknown): FarmMapCoordinate | null => {
  const rawPoint = Array.isArray(value) ? value : isRecord(value) ? [value.x, value.y] : [];
  if (rawPoint.length < 2) return null;
  const x = Number(rawPoint[0]);
  const y = Number(rawPoint[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const [lng, lat] =
    Math.abs(x) > 180 || Math.abs(y) > 90 ? proj4(EPSG_5179, EPSG_4326, [x, y]) : [x, y];
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const readRings = (value: unknown): FarmMapCoordinate[][] => {
  if (!Array.isArray(value) || value.length === 0) return [];
  const points = value.map(readPoint).filter((point): point is FarmMapCoordinate => point !== null);
  if (points.length === value.length && points.length >= 3) return [points];
  return value.flatMap(readRings);
};

const readGeometry = (value: unknown): FarmMapPolygon | null => {
  const candidates = Array.isArray(value) ? value : [value];
  const rings = candidates.flatMap((candidate) => {
    if (!isRecord(candidate)) return [];
    if (candidate.type === "Polygon" && Array.isArray(candidate.coordinates)) {
      return readRings(candidate.coordinates);
    }
    return readRings(candidate.xy);
  });
  return rings.length > 0 ? { type: "Polygon", coordinates: rings } : null;
};

const calculateCentroid = (
  geometry: FarmMapPolygon | null,
  input?: Partial<Pick<FarmMapParcelLookupInput, "lat" | "lng">>,
): FarmMapCoordinate | null => {
  const points = geometry?.coordinates.flat() ?? [];
  if (points.length === 0) {
    return typeof input?.lat === "number" && typeof input.lng === "number"
      ? { lat: input.lat, lng: input.lng }
      : null;
  }
  const latitudes = points.map((point) => point.lat);
  const longitudes = points.map((point) => point.lng);
  return {
    lat: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    lng: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
  };
};

const normalizeParcelCandidate = (
  value: unknown,
  index: number,
  input?: Partial<FarmMapParcelLookupInput>,
): FarmParcelCandidate | null => {
  if (!isRecord(value)) return null;
  const geometry = readGeometry(readValue(value, ["geometry", "공간정보"]));
  const area = readNumber(value, ["area", "면적", "지적면적", "basearea", "areaM2"]) ?? 0;
  const pnu = readString(value, ["pnu", "대표PNU", "필지고유번호", "부PNU"]);
  const legalDongAddress = readString(value, [
    "stdg_addr",
    "법정동주소",
    "legalDongAddress",
    "address",
  ]);
  const aerialPhotoYear = extractYear(
    readString(value, ["flight_ymd", "항공사진연도", "항공사진"]),
  );
  const updatedYear = extractYear(
    readString(value, ["updt_ymd", "갱신연도", "갱신일", "updateYear"]),
  );

  return {
    farmMapId: readString(value, ["id", "uid"]) ?? pnu ?? `farmmap-${index}`,
    pnu,
    representativeAddress: legalDongAddress ?? input?.representativeAddress ?? "주소 확인 필요",
    legalDongAddress,
    landCategory: readString(value, ["ldcg_cd", "대표지목", "지목", "jimok"]),
    cropLandType: normalizeCropLandType(
      readString(value, ["clsf_nm", "분류명", "농경지분류", "classification"]),
    ),
    areaSquareMeter: area,
    cultivatedAreaSquareMeter: readNumber(value, ["farm_area", "경작면적"]),
    cultivationRatio: readNumber(value, ["farm_ratio", "경작비율"]),
    cadastralMatchRate: readNumber(value, ["cad_con_ra", "지적일치율"]),
    aerialPhotoYear,
    updatedYear,
    geometry,
    centroid: calculateCentroid(geometry, input),
    source: "FARMMAP",
    raw: toSerializableRaw(value),
  };
};

const readFarmMapItems = (payload: UnknownRecord): unknown[] => {
  const output = readValue(payload, ["output"]);
  if (!isRecord(output)) return [];

  const farmMapData = readValue(output, ["farmmapData"]);
  if (isRecord(farmMapData)) {
    const data = readValue(farmMapData, ["data"]);
    if (Array.isArray(data)) return data;
  }

  const directData = readValue(output, ["data"]);
  return Array.isArray(directData) ? directData : [];
};

export const buildFarmMapRadiusUrl = (
  apiKey: string,
  domain: string,
  input: FarmMapParcelLookupInput,
  endpoint = FARMMAP_RADIUS_ENDPOINT,
) => {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    apiKey,
    domain,
    x: String(input.lng),
    y: String(input.lat),
    radius: String(Math.min(1000, Math.max(1, Math.round(input.radiusMeters ?? 500)))),
    mapType: "farmmap",
    apiVersion: "v2",
    epsg: "EPSG:4326",
    columnType: "ENG",
    callback: "farmMapCallback",
  }).toString();
  return url.toString();
};

export const buildFarmMapPointUrl = (
  apiKey: string,
  domain: string,
  input: FarmMapParcelLookupInput,
  endpoint = FARMMAP_POINT_ENDPOINT,
) => {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    apiKey,
    domain,
    x: String(input.lng),
    y: String(input.lat),
    mapType: "farmmap",
    apiVersion: "v2",
    epsg: "EPSG:4326",
    columnType: "ENG",
    callback: "farmMapCallback",
  }).toString();
  return url.toString();
};

export const buildFarmMapPnuUrl = (
  apiKey: string,
  domain: string,
  input: FarmMapParcelLookupInput,
  endpoint = FARMMAP_PNU_ENDPOINT,
) => {
  if (!input.pnu) throw new Error("PNU is required for PNU lookup mode");
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    apiKey,
    domain,
    pnu: input.pnu,
    mapType: "farmmap",
    apiVersion: "v2",
    columnType: "ENG",
    callback: "farmMapCallback",
  }).toString();
  return url.toString();
};

export const parseFarmMapJsonp = (text: string): unknown => {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const match = trimmed.match(/^[\w$.]+\(([\s\S]*)\);?$/);
  if (!match?.[1]) throw new Error("FarmMap JSONP response is invalid");
  return JSON.parse(match[1]);
};

export const normalizeFarmMapPayload = (
  payload: unknown,
  input: FarmMapParcelLookupInput,
): FarmMapParcelSearchResult => {
  const candidates = normalizeFarmMapCandidates(payload, input);
  const parcels = candidates.filter(
    (candidate): candidate is FarmMapParcel => candidate.centroid !== null,
  );

  return parcels.length > 0
    ? { status: "SUCCESS", parcels, warning: null }
    : {
        status: "NOT_FOUND",
        parcels: [],
        warning: "선택한 위치 주변에서 농경지 필지를 찾지 못했습니다.",
      };
};

export const normalizeFarmMapCandidates = (
  payload: unknown,
  input?: Partial<FarmMapParcelLookupInput>,
): FarmParcelCandidate[] => {
  if (!isRecord(payload)) {
    throw new Error("FarmMap response envelope is invalid");
  }

  const status = readValue(payload, ["status"]);
  if (isRecord(status) && readString(status, "result") === "F") {
    throw new Error(`[FarmMap] ${readString(status, ["errorMsg", "message"]) ?? "API request failed"}`);
  }

  return readFarmMapItems(payload)
    .map((item, index) => normalizeParcelCandidate(item, index, input))
    .filter((candidate): candidate is FarmParcelCandidate => candidate !== null);
};

export const normalizeFarmMapRadiusPayload = normalizeFarmMapPayload;
