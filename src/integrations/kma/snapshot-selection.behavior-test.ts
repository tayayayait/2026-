import {
  normalizeKmaItems,
  selectKmaSnapshotItems,
} from "./forecast";
import { toLegacyKmaForecast } from "./legacy-forecast";
import type { KmaEndpointResult } from "./types";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const nx = 59;
const ny = 88;
const baseDate = "20260622";

const results: KmaEndpointResult[] = [
  {
    endpoint: "ULTRA_SRT_NCST",
    nx,
    ny,
    baseDate,
    baseTime: "0900",
    items: [
      {
        baseDate,
        baseTime: "0900",
        category: "T1H",
        obsrValue: "20",
        nx,
        ny,
      },
      {
        baseDate,
        baseTime: "0900",
        category: "REH",
        obsrValue: "90",
        nx,
        ny,
      },
      {
        baseDate,
        baseTime: "0900",
        category: "WSD",
        obsrValue: "1",
        nx,
        ny,
      },
    ],
  },
  {
    endpoint: "ULTRA_SRT_FCST",
    nx,
    ny,
    baseDate,
    baseTime: "0830",
    items: [
      {
        baseDate,
        baseTime: "0830",
        category: "T1H",
        fcstDate: baseDate,
        fcstTime: "1000",
        fcstValue: "21",
        nx,
        ny,
      },
      {
        baseDate,
        baseTime: "0830",
        category: "T1H",
        fcstDate: baseDate,
        fcstTime: "1100",
        fcstValue: "22",
        nx,
        ny,
      },
    ],
  },
  {
    endpoint: "VILAGE_FCST",
    nx,
    ny,
    baseDate,
    baseTime: "0800",
    items: [
      {
        baseDate,
        baseTime: "0800",
        category: "TMP",
        fcstDate: baseDate,
        fcstTime: "1000",
        fcstValue: "23",
        nx,
        ny,
      },
      {
        baseDate,
        baseTime: "0800",
        category: "TMP",
        fcstDate: baseDate,
        fcstTime: "1100",
        fcstValue: "24",
        nx,
        ny,
      },
    ],
  },
];

const selected = selectKmaSnapshotItems(
  results,
  new Date("2026-06-22T09:20:00+09:00"),
);
const forecastTimes = selected
  .filter((item) => item.fcstTime)
  .map((item) => item.fcstTime);

assert(
  forecastTimes.length === 2 && forecastTimes.every((time) => time === "1000"),
  "each forecast endpoint must select only the nearest future forecast time",
);

const snapshot = normalizeKmaItems(selected, {
  nx,
  ny,
  baseDate,
  baseTime: "0900",
});

assert(snapshot.temperature === 20, "nowcast temperature must override forecast temperature");
assert(
  snapshot.precipitationMm === null,
  "missing precipitation category must remain unknown instead of becoming 0mm",
);

let missingPrecipitationRejected = false;
try {
  toLegacyKmaForecast(snapshot);
} catch {
  missingPrecipitationRejected = true;
}

assert(
  missingPrecipitationRejected,
  "legacy weather data must reject a snapshot with unknown precipitation",
);

const noRainSnapshot = normalizeKmaItems(
  [
    {
      baseDate,
      baseTime: "0800",
      category: "PCP",
      fcstDate: baseDate,
      fcstTime: "1000",
      fcstValue: "강수없음",
      nx,
      ny,
    },
  ],
  { nx, ny, baseDate, baseTime: "0800" },
);
assert(noRainSnapshot.precipitationMm === 0, "강수없음 must normalize to 0mm");

const underOneMillimeterSnapshot = normalizeKmaItems(
  [
    {
      baseDate,
      baseTime: "0800",
      category: "PCP",
      fcstDate: baseDate,
      fcstTime: "1000",
      fcstValue: "1.0mm 미만",
      nx,
      ny,
    },
  ],
  { nx, ny, baseDate, baseTime: "0800" },
);
assert(
  underOneMillimeterSnapshot.precipitationMm === 0.5,
  "1.0mm 미만 must normalize to the 0.5mm representative value",
);

console.log("KMA snapshot selection behavior tests passed");
