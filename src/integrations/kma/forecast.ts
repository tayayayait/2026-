import { z } from "zod";
import {
  buildOpenApiUrl,
  ensureOpenApiSuccess,
  parseKoreanOpenApiEnvelope,
  readServerEnv,
} from "@/integrations/openapi";
import { latLngToGrid } from "./grid-converter";
import { toLegacyKmaForecast } from "./legacy-forecast";
import type {
  KmaBaseDateTime,
  KmaCategory,
  KmaEndpoint,
  KmaEndpointResult,
  KmaForecastItem,
  KmaPrecipitationType,
  KmaSkyCondition,
  KmaWeatherSnapshot,
  LegacyKmaForecast,
} from "./types";

const KMA_SERVICE_BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";

const KMA_OPERATION: Record<KmaEndpoint, string> = {
  VILAGE_FCST: "getVilageFcst",
  ULTRA_SRT_NCST: "getUltraSrtNcst",
  ULTRA_SRT_FCST: "getUltraSrtFcst",
};

const KMA_SCHEDULE: Record<KmaEndpoint, { minutes: number[]; delayMinutes: number }> = {
  VILAGE_FCST: { minutes: [120, 300, 480, 660, 840, 1020, 1200, 1380], delayMinutes: 10 },
  ULTRA_SRT_NCST: {
    minutes: Array.from({ length: 24 }, (_, hour) => hour * 60),
    delayMinutes: 10,
  },
  ULTRA_SRT_FCST: {
    minutes: Array.from({ length: 24 }, (_, hour) => hour * 60 + 30),
    delayMinutes: 15,
  },
};

const KmaItemSchema = z.object({
  baseDate: z.string(),
  baseTime: z.string(),
  category: z.string(),
  fcstDate: z.string().optional(),
  fcstTime: z.string().optional(),
  fcstValue: z.string().optional(),
  obsrValue: z.string().optional(),
  nx: z.coerce.number(),
  ny: z.coerce.number(),
});

export const KmaResponseSchema = z.object({
  response: z.object({
    header: z.object({
      resultCode: z.string(),
      resultMsg: z.string(),
    }),
    body: z
      .object({
        items: z
          .object({
            item: z.preprocess((value) => {
              if (Array.isArray(value)) return value;
              if (value) return [value];
              return [];
            }, z.array(KmaItemSchema)),
          })
          .optional(),
      })
      .optional(),
  }),
});

const formatKmaDate = (kstDate: Date) => kstDate.toISOString().slice(0, 10).replace(/-/g, "");

const formatKmaTime = (minutes: number) => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${hours.toString().padStart(2, "0")}${minute.toString().padStart(2, "0")}`;
};

export const getKmaBaseDateTime = (endpoint: KmaEndpoint, now = new Date()): KmaBaseDateTime => {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const minutesOfDay = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const schedule = KMA_SCHEDULE[endpoint];
  const available = schedule.minutes.filter(
    (minutes) => minutes + schedule.delayMinutes <= minutesOfDay,
  );
  const selectedMinutes = available.at(-1);

  if (selectedMinutes !== undefined) {
    return { baseDate: formatKmaDate(kst), baseTime: formatKmaTime(selectedMinutes) };
  }

  const prev = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
  return { baseDate: formatKmaDate(prev), baseTime: formatKmaTime(schedule.minutes.at(-1) ?? 0) };
};

const getItemValue = (item: KmaForecastItem) => item.fcstValue ?? item.obsrValue ?? "";

const parseNumber = (value: string): number | null => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed >= 900 || parsed <= -900) return null;
  return parsed;
};

const parsePrecipitation = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "강수없음" || trimmed === "없음" || /^0(?:\.0+)?$/.test(trimmed)) {
    return 0;
  }
  if (/^1(?:\.0+)?mm\s*미만$/.test(trimmed)) return 0.5;

  const matches = [...trimmed.matchAll(/\d+(?:\.\d+)?/g)].map((match) =>
    Number.parseFloat(match[0]),
  );
  const valid = matches.filter(Number.isFinite);
  if (valid.length === 0) return null;

  return Math.max(...valid);
};

const parsePrecipitationType = (value: string): KmaPrecipitationType => {
  const code = Number.parseInt(value, 10);
  if (code === 0) return "NONE";
  if (code === 1) return "RAIN";
  if (code === 2) return "RAIN_SNOW";
  if (code === 3) return "SNOW";
  if (code === 4) return "SHOWER";
  if (code === 5) return "DRIZZLE";
  if (code === 6) return "DRIZZLE_SNOW";
  if (code === 7) return "SNOW_FLURRY";
  return "UNKNOWN";
};

const parseSky = (value: string): KmaSkyCondition => {
  const code = Number.parseInt(value, 10);
  if (code === 1) return "CLEAR";
  if (code === 3) return "MOSTLY_CLOUDY";
  if (code === 4) return "CLOUDY";
  return "UNKNOWN";
};

const getCategory = (category: string): KmaCategory | string => category;

const getKstDateTimeKey = (now: Date) => {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${formatKmaDate(kst)}${kst.getUTCHours().toString().padStart(2, "0")}${kst
    .getUTCMinutes()
    .toString()
    .padStart(2, "0")}`;
};

const selectForecastTimeItems = (items: KmaForecastItem[], nowKey: string) => {
  const forecastKeys = [
    ...new Set(
      items
        .map((item) =>
          item.fcstDate && item.fcstTime ? `${item.fcstDate}${item.fcstTime}` : null,
        )
        .filter((key): key is string => key !== null),
    ),
  ].sort();

  const selectedKey = forecastKeys.find((key) => key >= nowKey) ?? forecastKeys.at(-1);
  if (!selectedKey) return [];

  return items.filter(
    (item) => item.fcstDate && item.fcstTime && `${item.fcstDate}${item.fcstTime}` === selectedKey,
  );
};

export const selectKmaSnapshotItems = (
  results: KmaEndpointResult[],
  now = new Date(),
): KmaForecastItem[] => {
  const nowKey = getKstDateTimeKey(now);
  const resultByEndpoint = new Map(results.map((result) => [result.endpoint, result]));

  return [
    ...selectForecastTimeItems(resultByEndpoint.get("VILAGE_FCST")?.items ?? [], nowKey),
    ...selectForecastTimeItems(resultByEndpoint.get("ULTRA_SRT_FCST")?.items ?? [], nowKey),
    ...(resultByEndpoint.get("ULTRA_SRT_NCST")?.items ?? []),
  ];
};

export const normalizeKmaItems = (
  items: KmaForecastItem[],
  context: { nx: number; ny: number; baseDate: string; baseTime: string },
): KmaWeatherSnapshot => {
  const snapshot: KmaWeatherSnapshot = {
    source: "KMA",
    nx: context.nx,
    ny: context.ny,
    baseDate: context.baseDate,
    baseTime: context.baseTime,
    temperature: null,
    humidity: null,
    precipitationMm: null,
    precipitationProbability: null,
    windSpeed: null,
    windDirection: null,
    precipitationType: "NONE",
    sky: "UNKNOWN",
    updatedAt: new Date().toISOString(),
  };

  for (const item of items) {
    const category = getCategory(item.category);
    const value = getItemValue(item);

    if (category === "TMP" || category === "T1H") {
      snapshot.temperature = parseNumber(value) ?? snapshot.temperature;
    } else if (category === "REH") {
      snapshot.humidity = parseNumber(value) ?? snapshot.humidity;
    } else if (category === "PCP" || category === "RN1") {
      snapshot.precipitationMm = parsePrecipitation(value) ?? snapshot.precipitationMm;
    } else if (category === "POP") {
      snapshot.precipitationProbability = parseNumber(value) ?? snapshot.precipitationProbability;
    } else if (category === "WSD") {
      snapshot.windSpeed = parseNumber(value) ?? snapshot.windSpeed;
    } else if (category === "VEC") {
      snapshot.windDirection = parseNumber(value) ?? snapshot.windDirection;
    } else if (category === "PTY") {
      snapshot.precipitationType = parsePrecipitationType(value);
    } else if (category === "SKY") {
      snapshot.sky = parseSky(value);
    }
  }

  return snapshot;
};

const fetchKmaEndpoint = async (
  endpoint: KmaEndpoint,
  lat: number,
  lng: number,
): Promise<KmaEndpointResult> => {
  const apiKey = readServerEnv({ source: "KMA", names: ["PUBLIC_DATA_SERVICE_KEY"] });
  const { nx, ny } = latLngToGrid(lat, lng);
  const { baseDate, baseTime } = getKmaBaseDateTime(endpoint);
  const operation = KMA_OPERATION[endpoint];

  const url = buildOpenApiUrl(`${KMA_SERVICE_BASE_URL}/${operation}`, {
    serviceKey: apiKey,
    pageNo: 1,
    numOfRows: 1000,
    dataType: "JSON",
    base_date: baseDate,
    base_time: baseTime,
    nx,
    ny,
  });

  const response = await fetch(url);
  if (!response.ok) throw new Error(`KMA API Error: ${response.status}`);

  const data = await response.json();
  const parsed = KmaResponseSchema.parse(data);
  ensureOpenApiSuccess("KMA", parseKoreanOpenApiEnvelope(parsed));

  return {
    endpoint,
    nx,
    ny,
    baseDate,
    baseTime,
    items: parsed.response.body?.items?.item || [],
  };
};

export const fetchKmaVilageForecast = (lat: number, lng: number) =>
  fetchKmaEndpoint("VILAGE_FCST", lat, lng);

export const fetchKmaUltraShortNowcast = (lat: number, lng: number) =>
  fetchKmaEndpoint("ULTRA_SRT_NCST", lat, lng);

export const fetchKmaUltraShortForecast = (lat: number, lng: number) =>
  fetchKmaEndpoint("ULTRA_SRT_FCST", lat, lng);

export const fetchKmaWeatherSnapshot = async (
  lat: number,
  lng: number,
): Promise<KmaWeatherSnapshot> => {
  const { nx, ny } = latLngToGrid(lat, lng);
  const fallbackBase = getKmaBaseDateTime("VILAGE_FCST");
  const results = await Promise.allSettled([
    fetchKmaUltraShortNowcast(lat, lng),
    fetchKmaUltraShortForecast(lat, lng),
    fetchKmaVilageForecast(lat, lng),
  ]);

  const successful = results
    .filter(
      (result): result is PromiseFulfilledResult<KmaEndpointResult> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);

  if (successful.length === 0) {
    const firstFailure = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    throw firstFailure?.reason ?? new Error("KMA API failed");
  }

  const items = selectKmaSnapshotItems(successful);
  const latestBase =
    successful.find((result) => result.endpoint === "ULTRA_SRT_NCST") ??
    successful.find((result) => result.endpoint === "ULTRA_SRT_FCST") ??
    successful.find((result) => result.endpoint === "VILAGE_FCST") ?? {
    baseDate: fallbackBase.baseDate,
    baseTime: fallbackBase.baseTime,
  };

  return normalizeKmaItems(items, {
    nx,
    ny,
    baseDate: latestBase.baseDate,
    baseTime: latestBase.baseTime,
  });
};

export const fetchKmaForecast = async (lat: number, lng: number): Promise<LegacyKmaForecast> => {
  const snapshot = await fetchKmaWeatherSnapshot(lat, lng);
  return toLegacyKmaForecast(snapshot);
};
