import { readServerEnv } from "../openapi";
import type { MafraAgriWeatherPage, MafraAgriWeatherRow } from "./types";

const MAFRA_OPEN_API_BASE_URL = "http://211.237.50.150:7080/openapi";
const MAFRA_AGRI_WEATHER_DATASET = "Grid_20250220000000000670_1";
const PAGE_SIZE = 1000;
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000;
const PAGE_BATCH_SIZE = 4;

let rowCache: { expiresAt: number; rows: MafraAgriWeatherRow[] } | null = null;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (record: UnknownRecord, key: string) => {
  const value = record[key];
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const readNumber = (record: UnknownRecord, key: string): number | undefined => {
  const parsed = Number.parseFloat(readString(record, key));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeRow = (value: unknown): MafraAgriWeatherRow | null => {
  if (!isRecord(value)) return null;
  const stationLatitude = readNumber(value, "CRWTHR_OBSV_PNT_LAT");
  const stationLongitude = readNumber(value, "CRWTHR_OBSV_PNT_LOT");
  const observedDate = readString(value, "OBSV_YMD");
  if (
    stationLatitude === undefined ||
    stationLongitude === undefined ||
    !/^\d{8}$/.test(observedDate)
  ) {
    return null;
  }
  const maxTemperature = readNumber(value, "CRWTHR_TOP_TMPRT_MSRVL");
  const minTemperature = readNumber(value, "CRWTHR_LOWST_TMPRT_MSRVL");
  const averageTemperature = readNumber(value, "CRWTHR_AVG_TMPRT_MSRVL");
  const humidity = readNumber(value, "CRWTHR_HMDT_MSRVL");
  const missingCoreValues =
    maxTemperature === 0 && minTemperature === 0 && averageTemperature === 0 && humidity === 0;

  return {
    rowNumber: readNumber(value, "ROW_NUM") ?? 0,
    observedDate,
    stationName: readString(value, "FRMST_WTHR_OBSV_PNT_CDCN") || undefined,
    stationLatitude,
    stationLongitude,
    rainfall: readNumber(value, "CRWTHR_RNFL_MSRVL"),
    maxTemperature: missingCoreValues ? undefined : maxTemperature,
    minTemperature: missingCoreValues ? undefined : minTemperature,
    averageTemperature: missingCoreValues ? undefined : averageTemperature,
    solarRadiation: readNumber(value, "CRWTHR_SLRDQTY_MSRVL"),
    humidity: missingCoreValues ? undefined : humidity,
    windDirection: readString(value, "CRWTHR_WNDDRT_CN") || undefined,
    windSpeed: readNumber(value, "CRWTHR_WNDSPD_MSRVL"),
    sunshineDuration: readNumber(value, "CRWTHR_DOBS_MSRVL"),
    observationDistance: readNumber(value, "OBSV_PNT_DSTNC_MSRVL"),
    kmaStationName: readString(value, "KMA_OBSV_PNT_CDCN") || undefined,
    kmaStationLatitude: readNumber(value, "KMA_OBSV_PNT_LAT"),
    kmaStationLongitude: readNumber(value, "KMA_OBSV_PNT_LOT"),
    kmaRainfall: readNumber(value, "KMA_RNFL_MSRVL"),
    kmaMaxTemperature: readNumber(value, "KMA_TOP_TMPRT_MSRVL"),
    kmaMinTemperature: readNumber(value, "KMA_LOWST_TMPRT_MSRVL"),
    kmaMaxWindSpeed: readNumber(value, "KMA_MAX_WNDSPD_MSRVL"),
    kmaMaxInstantWindSpeed: readNumber(value, "KMA_MAX_MMNT_WNDSPD_MSRVL"),
    kmaSnowDepth: readNumber(value, "KMA_TPDSN_QTY_MSRVL"),
  };
};

export const buildMafraAgriWeatherUrl = (apiKey: string, startIndex: number, endIndex: number) =>
  `${MAFRA_OPEN_API_BASE_URL}/${encodeURIComponent(apiKey)}/json/${MAFRA_AGRI_WEATHER_DATASET}/${startIndex}/${endIndex}`;

export const createMafraPageRanges = (totalCount: number) => {
  const ranges: { startIndex: number; endIndex: number }[] = [];
  for (let startIndex = 1; startIndex <= totalCount; startIndex += PAGE_SIZE) {
    ranges.push({ startIndex, endIndex: Math.min(startIndex + PAGE_SIZE - 1, totalCount) });
  }
  return ranges;
};

export const normalizeMafraAgriWeatherPayload = (payload: unknown): MafraAgriWeatherPage => {
  if (!isRecord(payload)) throw new Error("MAFRA agricultural weather response is invalid");
  const root = payload[MAFRA_AGRI_WEATHER_DATASET];
  if (!isRecord(root)) throw new Error("MAFRA agricultural weather dataset is missing");

  const result = isRecord(root.result) ? root.result : {};
  const resultCode = readString(result, "code");
  const resultMessage = readString(result, "message");
  if (resultCode !== "INFO-000") {
    throw new Error(`[MAFRA] ${resultCode || "UNKNOWN"}: ${resultMessage || "API error"}`);
  }

  const rawRows = Array.isArray(root.row) ? root.row : root.row ? [root.row] : [];
  return {
    totalCount: Number.parseInt(readString(root, "totalCnt"), 10) || 0,
    resultCode,
    resultMessage,
    rows: rawRows.map(normalizeRow).filter((row): row is MafraAgriWeatherRow => row !== null),
  };
};

const fetchPage = async (apiKey: string, startIndex: number, endIndex: number) => {
  const response = await fetch(buildMafraAgriWeatherUrl(apiKey, startIndex, endIndex));
  if (!response.ok) throw new Error(`MAFRA agricultural weather API Error: ${response.status}`);
  return normalizeMafraAgriWeatherPayload(await response.json());
};

export const fetchMafraAgriWeatherRows = async (): Promise<MafraAgriWeatherRow[]> => {
  if (rowCache && rowCache.expiresAt > Date.now()) return rowCache.rows;

  const apiKey = readServerEnv({ source: "PUBLIC_DATA", names: ["MAFRA_API_KEY"] });
  const firstPage = await fetchPage(apiKey, 1, PAGE_SIZE);
  const ranges = createMafraPageRanges(firstPage.totalCount).slice(1);
  const rows = [...firstPage.rows];

  for (let index = 0; index < ranges.length; index += PAGE_BATCH_SIZE) {
    const batch = ranges.slice(index, index + PAGE_BATCH_SIZE);
    const pages = await Promise.all(
      batch.map((range) => fetchPage(apiKey, range.startIndex, range.endIndex)),
    );
    rows.push(...pages.flatMap((page) => page.rows));
  }

  rowCache = { rows, expiresAt: Date.now() + CACHE_DURATION_MS };
  return rows;
};
