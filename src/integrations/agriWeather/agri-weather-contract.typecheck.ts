import {
  buildMafraAgriWeatherUrl,
  createMafraPageRanges,
  normalizeMafraAgriWeatherPayload,
} from "./mafra-client";
import { selectNearestLatestAgriWeatherObservation } from "./observation-selection";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const url = buildMafraAgriWeatherUrl("test-key", 1, 1000);
assert(
  url === "http://211.237.50.150:7080/openapi/test-key/json/Grid_20250220000000000670_1/1/1000",
  "MAFRA agricultural weather URL mismatch",
);

const ranges = createMafraPageRanges(17_527);
assert(ranges.length === 18, "MAFRA page ranges must respect the 1,000 row limit");
assert(ranges[0]?.startIndex === 1 && ranges[0]?.endIndex === 1000, "first range mismatch");
assert(
  ranges.at(-1)?.startIndex === 17_001 && ranges.at(-1)?.endIndex === 17_527,
  "last range mismatch",
);

const payload = normalizeMafraAgriWeatherPayload({
  Grid_20250220000000000670_1: {
    totalCnt: 3,
    result: { code: "INFO-000", message: "정상 처리되었습니다." },
    row: [
      {
        ROW_NUM: "1",
        OBSV_YMD: "20260617",
        CRWTHR_OBSV_PNT_LAT: "35.81",
        CRWTHR_OBSV_PNT_LOT: "126.81",
        CRWTHR_RNFL_MSRVL: "2.5",
        CRWTHR_TOP_TMPRT_MSRVL: "29.1",
        CRWTHR_LOWST_TMPRT_MSRVL: "20.2",
        CRWTHR_AVG_TMPRT_MSRVL: "24.8",
        CRWTHR_SLRDQTY_MSRVL: "510",
        CRWTHR_HMDT_MSRVL: "81.4",
        CRWTHR_WNDDRT_CN: "서",
        CRWTHR_WNDSPD_MSRVL: "1.2",
        CRWTHR_DOBS_MSRVL: "7.5",
      },
      {
        ROW_NUM: "2",
        OBSV_YMD: "20260618",
        CRWTHR_OBSV_PNT_LAT: "35.81",
        CRWTHR_OBSV_PNT_LOT: "126.81",
        CRWTHR_RNFL_MSRVL: "0",
        CRWTHR_AVG_TMPRT_MSRVL: "25.3",
        CRWTHR_HMDT_MSRVL: "78.2",
      },
      {
        ROW_NUM: "3",
        OBSV_YMD: "20260619",
        CRWTHR_OBSV_PNT_LAT: "37.5",
        CRWTHR_OBSV_PNT_LOT: "128.5",
        CRWTHR_AVG_TMPRT_MSRVL: "18.2",
      },
    ],
  },
});

assert(payload.totalCount === 3, "MAFRA total count mismatch");
assert(payload.rows[0]?.averageTemperature === 24.8, "average temperature normalization failed");
assert(payload.rows[0]?.humidity === 81.4, "humidity normalization failed");
assert(payload.rows[0]?.rainfall === 2.5, "rainfall normalization failed");

const selected = selectNearestLatestAgriWeatherObservation(payload.rows, 35.82, 126.82);
assert(selected?.observedDate === "2026-06-18", "nearest station must use its latest record");
assert(selected?.averageTemperature === 25.3, "latest station value mismatch");
assert((selected?.distanceKm ?? 99) < 5, "nearest station distance mismatch");
assert(selected?.source === "MAFRA_AGRI_WEATHER", "agricultural weather source mismatch");

const missingCoreValues = normalizeMafraAgriWeatherPayload({
  Grid_20250220000000000670_1: {
    totalCnt: 1,
    result: { code: "INFO-000", message: "정상 처리되었습니다." },
    row: {
      ROW_NUM: "1",
      OBSV_YMD: "20260618",
      CRWTHR_OBSV_PNT_LAT: "35.28227",
      CRWTHR_OBSV_PNT_LOT: "126.46796",
      CRWTHR_TOP_TMPRT_MSRVL: "0",
      CRWTHR_LOWST_TMPRT_MSRVL: "0",
      CRWTHR_AVG_TMPRT_MSRVL: "0",
      CRWTHR_HMDT_MSRVL: "0",
      CRWTHR_RNFL_MSRVL: "0.5",
      CRWTHR_WNDSPD_MSRVL: "0.6",
    },
  },
});
assert(
  missingCoreValues.rows[0]?.averageTemperature === undefined &&
    missingCoreValues.rows[0]?.humidity === undefined,
  "all-zero temperature and humidity fields must be treated as missing",
);
assert(missingCoreValues.rows[0]?.rainfall === 0.5, "valid rainfall must remain available");

let invalidKeyRejected = false;
try {
  normalizeMafraAgriWeatherPayload({
    Grid_20250220000000000670_1: {
      result: { code: "INFO-100", message: "인증키가 유효하지 않습니다." },
    },
  });
} catch {
  invalidKeyRejected = true;
}
assert(invalidKeyRejected, "MAFRA API error responses must be rejected");

console.log("MAFRA agricultural weather contract tests passed");
