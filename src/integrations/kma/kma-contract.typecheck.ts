import {
  fetchKmaForecast,
  fetchKmaUltraShortForecast,
  fetchKmaUltraShortNowcast,
  fetchKmaVilageForecast,
  getKmaBaseDateTime,
  normalizeKmaItems,
} from "./forecast";
import type {
  KmaEndpointResult,
  KmaForecastItem,
  KmaPrecipitationType,
  KmaSkyCondition,
  KmaWeatherSnapshot,
  LegacyKmaForecast,
} from "./types";

const baseTime = getKmaBaseDateTime("VILAGE_FCST", new Date("2026-06-18T03:20:00+09:00"));
const baseDate: string = baseTime.baseDate;
const baseTimeValue: string = baseTime.baseTime;

const items: KmaForecastItem[] = [
  {
    baseDate,
    baseTime: baseTimeValue,
    category: "TMP",
    fcstDate: baseDate,
    fcstTime: "0400",
    fcstValue: "28",
    nx: 57,
    ny: 74,
  },
  {
    baseDate,
    baseTime: baseTimeValue,
    category: "REH",
    fcstDate: baseDate,
    fcstTime: "0400",
    fcstValue: "86",
    nx: 57,
    ny: 74,
  },
  {
    baseDate,
    baseTime: baseTimeValue,
    category: "PCP",
    fcstDate: baseDate,
    fcstTime: "0400",
    fcstValue: "1mm 미만",
    nx: 57,
    ny: 74,
  },
  {
    baseDate,
    baseTime: baseTimeValue,
    category: "WSD",
    fcstDate: baseDate,
    fcstTime: "0400",
    fcstValue: "2.4",
    nx: 57,
    ny: 74,
  },
  {
    baseDate,
    baseTime: baseTimeValue,
    category: "PTY",
    fcstDate: baseDate,
    fcstTime: "0400",
    fcstValue: "1",
    nx: 57,
    ny: 74,
  },
  {
    baseDate,
    baseTime: baseTimeValue,
    category: "SKY",
    fcstDate: baseDate,
    fcstTime: "0400",
    fcstValue: "4",
    nx: 57,
    ny: 74,
  },
  {
    baseDate,
    baseTime: baseTimeValue,
    category: "VEC",
    fcstDate: baseDate,
    fcstTime: "0400",
    fcstValue: "270",
    nx: 57,
    ny: 74,
  },
];

const snapshot: KmaWeatherSnapshot = normalizeKmaItems(items, {
  nx: 57,
  ny: 74,
  baseDate,
  baseTime: baseTimeValue,
});

const rainType: KmaPrecipitationType = snapshot.precipitationType;
const sky: KmaSkyCondition = snapshot.sky;

const vilagePromise: Promise<KmaEndpointResult> = fetchKmaVilageForecast(35.8421, 126.8123);
const nowcastPromise: Promise<KmaEndpointResult> = fetchKmaUltraShortNowcast(35.8421, 126.8123);
const ultraPromise: Promise<KmaEndpointResult> = fetchKmaUltraShortForecast(35.8421, 126.8123);
const legacyPromise: Promise<LegacyKmaForecast> = fetchKmaForecast(35.8421, 126.8123);

void rainType;
void sky;
void vilagePromise;
void nowcastPromise;
void ultraPromise;
void legacyPromise;
