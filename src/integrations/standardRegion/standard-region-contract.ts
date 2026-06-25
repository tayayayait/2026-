import type { StandardRegionCode, StandardRegionPage } from "@/domains/farms/standard-region";
import type { FarmParcelRaw } from "@/domains/farms/types";
import { buildOpenApiUrl, extractXmlRows, extractXmlTag } from "@/integrations/openapi";

const DEFAULT_STANDARD_REGION_BASE_URL = "https://apis.data.go.kr/1741000/StanReginCd";

export interface StandardRegionRequest {
  query?: string;
  pageNo?: number;
  numOfRows?: number;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readText = (source: UnknownRecord, key: string) => {
  const entry = Object.entries(source).find(([name]) => name.toLowerCase() === key.toLowerCase());
  const value = entry?.[1];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
};

const findFirstValue = (value: unknown, key: string, depth = 0): unknown => {
  if (depth > 8 || value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstValue(item, key, depth + 1);
      if (found !== null && found !== undefined) return found;
    }
    return null;
  }
  if (!isRecord(value)) return null;

  const entry = Object.entries(value).find(([name]) => name.toLowerCase() === key.toLowerCase());
  if (entry) return entry[1];
  for (const child of Object.values(value)) {
    const found = findFirstValue(child, key, depth + 1);
    if (found !== null && found !== undefined) return found;
  }
  return null;
};

const collectRows = (value: unknown, depth = 0): UnknownRecord[] => {
  if (depth > 8 || value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap((item) => collectRows(item, depth + 1));
  if (!isRecord(value)) return [];

  const current = readText(value, "region_cd") && readText(value, "locatadd_nm") ? [value] : [];
  return [...current, ...Object.values(value).flatMap((child) => collectRows(child, depth + 1))];
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeRow = (source: UnknownRecord): StandardRegionCode | null => {
  const regionCode = readText(source, "region_cd");
  const addressName = readText(source, "locatadd_nm");
  if (!regionCode || !/^\d{10}$/.test(regionCode) || !addressName) return null;

  return {
    regionCode,
    sidoCode: readText(source, "sido_cd") ?? regionCode.slice(0, 2),
    sigunguCode: readText(source, "sgg_cd") ?? regionCode.slice(2, 5),
    eupMyeonDongCode: readText(source, "umd_cd") ?? regionCode.slice(5, 8),
    riCode: readText(source, "ri_cd") ?? regionCode.slice(8, 10),
    addressName,
    parentRegionCode: readText(source, "locathigh_cd") ?? "0000000000",
    localName: readText(source, "locallow_nm"),
    order: readText(source, "locat_order"),
    raw: source as FarmParcelRaw,
  };
};

const dedupeRows = (rows: StandardRegionCode[]) =>
  Array.from(new Map(rows.map((row) => [row.regionCode, row])).values());

export const buildStandardRegionUrl = (
  serviceKey: string,
  request: StandardRegionRequest = {},
  baseUrl = DEFAULT_STANDARD_REGION_BASE_URL,
) =>
  buildOpenApiUrl(`${baseUrl.replace(/\/$/, "")}/getStanReginCdList`, {
    ServiceKey: serviceKey,
    type: "json",
    pageNo: request.pageNo ?? 1,
    numOfRows: request.numOfRows ?? 1000,
    flag: "Y",
    locatadd_nm: request.query?.trim(),
  });

export const normalizeStandardRegionPayload = (payload: unknown): StandardRegionPage => ({
  totalCount: toNumber(findFirstValue(payload, "totalCount")),
  pageNo: toNumber(findFirstValue(payload, "pageNo")),
  numOfRows: toNumber(findFirstValue(payload, "numOfRows")),
  rows: dedupeRows(collectRows(payload).map(normalizeRow).filter((row): row is StandardRegionCode => row !== null)),
});

export const parseStandardRegionResponseText = (text: string): StandardRegionPage => {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return normalizeStandardRegionPayload(JSON.parse(trimmed));
  }

  return {
    totalCount: toNumber(extractXmlTag(trimmed, "totalCount")),
    pageNo: toNumber(extractXmlTag(trimmed, "pageNo")),
    numOfRows: toNumber(extractXmlTag(trimmed, "numOfRows")),
    rows: dedupeRows(
      extractXmlRows(trimmed, "row")
        .map(normalizeRow)
        .filter((row): row is StandardRegionCode => row !== null),
    ),
  };
};
