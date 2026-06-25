import assert from "node:assert/strict";
import type { KamisDailyPriceRow } from "../../integrations/kamis/daily-price";
import { listMarketPriceCropMappings, resolveMarketPriceCropMapping } from "./crop-price-mapping";
import {
  buildMarketPriceSummary,
  fetchMarketPriceSummaryForFarm,
  getMarketPriceDateRange,
} from "./price-summary";
import { resolveMarketPriceRegion } from "./region-code";

const potato = resolveMarketPriceCropMapping("감자");
assert(potato, "potato mapping must exist");
assert.equal(potato.categoryCode, "100");
assert.equal(potato.itemCode, "152");

const rice = resolveMarketPriceCropMapping("벼");
assert(rice, "rice mapping must exist");
assert.equal(rice.itemName, "쌀");
assert.equal(rice.note?.includes("벼"), true);

const pear = resolveMarketPriceCropMapping("배");
assert(pear, "pear mapping must exist");
assert.equal(pear.categoryCode, "400", "pear must map to fruit pear, not napa cabbage");
assert.equal(pear.itemCode, "412");

const greenOnion = resolveMarketPriceCropMapping("파");
assert(greenOnion, "green onion mapping must exist");
assert.equal(greenOnion.categoryCode, "200");
assert.equal(greenOnion.itemCode, "246");

const expectedAgriculturalMappings = [
  ["고구마", "100", "151"],
  ["오이", "200", "223"],
  ["복숭아", "400", "413"],
  ["표고버섯", "300", "322"],
  ["대파", "200", "246"],
  ["쪽파", "200", "246"],
  ["샤인머스켓", "400", "414"],
] as const;

for (const [cropName, categoryCode, itemCode] of expectedAgriculturalMappings) {
  const mapping = resolveMarketPriceCropMapping(cropName);
  assert(mapping, `${cropName} mapping must exist`);
  assert.equal(mapping.categoryCode, categoryCode);
  assert.equal(mapping.itemCode, itemCode);
}

assert(
  listMarketPriceCropMappings().length >= 100,
  "KAMIS agricultural item and alias mappings must be broadly available",
);

assert.equal(resolveMarketPriceRegion("전북특별자치도 전주시 완산구")?.regionCode, "3511");
assert.equal(resolveMarketPriceRegion("김제시 만경읍"), null);

assert.deepEqual(getMarketPriceDateRange(30, new Date("2026-06-24T03:00:00Z")), {
  startDate: "20260526",
  endDate: "20260624",
});

const row = (
  date: string,
  classCode: "01" | "02",
  price: number,
  marketName = "가락도매",
): KamisDailyPriceRow => ({
  surveyedDate: date,
  classCode,
  className: classCode === "02" ? "중도매" : "소매",
  categoryCode: "100",
  categoryName: "식량작물",
  itemCode: "152",
  itemName: "감자",
  varietyCode: "01",
  varietyName: "수미(노지)",
  gradeCode: "04",
  gradeName: "상품",
  regionCode: "1101",
  regionName: "서울",
  unit: "kg",
  unitSize: "20",
  marketCode: "0110211",
  marketName,
  price: price * 20,
  convertedKgPrice: price,
  originalRegisteredAt: `${date}T00:00:00Z`,
});

const summary = buildMarketPriceSummary({
  cropName: "감자",
  mapping: potato,
  nationalRows: [
    row("20260601", "02", 1000),
    row("20260602", "02", 1200),
    row("20260603", "02", 1500),
    row("20260603", "01", 3000, "B-유통"),
  ],
  localRegion: { regionCode: "3511", regionName: "전주" },
  localRetailRows: [row("20260603", "01", 2800, "남부")],
});

assert.equal(summary.latestDate, "20260603");
assert.equal(summary.latestKgPrice, 1500, "primary price must prefer wholesale rows");
assert.equal(summary.latestWholesaleKgPrice, 1500);
assert.equal(summary.latestRetailKgPrice, 3000);
assert.equal(summary.sevenDayAverageKgPrice, 1233);
assert.equal(summary.changeFromSevenDayAveragePercent, 21.7);
assert.equal(summary.trend, "UP");
assert.equal(summary.points.length, 3);
assert.equal(summary.localRetail?.regionName, "전주");
assert.equal(summary.localRetail?.kgPrice, 2800);

assert(summary.derived, "derived stats must be computed when enough points exist");
assert.equal(summary.derived!.pointCount, 3, "derived must reflect primary point count");
assert.equal(summary.derived!.minKgPrice, 1000, "derived min must come from primary series");
assert.equal(summary.derived!.maxKgPrice, 1500, "derived max must come from primary series");
assert.equal(summary.derived!.avgKgPrice, 1233, "derived avg must be the primary series average");
assert.equal(summary.derived!.volatilityPercent, 40.6, "derived volatility must be (max-min)/avg");
assert.equal(
  summary.derived!.aboveAveragePercent,
  21.7,
  "derived aboveAverage must position latest vs period average",
);

const sparseSummary = buildMarketPriceSummary({
  cropName: "감자",
  mapping: potato,
  nationalRows: [row("20260601", "02", 1000)],
});
assert.equal(
  sparseSummary.derived,
  null,
  "derived stats must be null when fewer than 2 points are available",
);

const originalFetch = globalThis.fetch;
const originalPublicDataKey = process.env.PUBLIC_DATA_SERVICE_KEY;
const requestedSummaryPages: string[] = [];

process.env.PUBLIC_DATA_SERVICE_KEY = "mock-key";
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const requestUrl = new URL(String(input));
  const pageNo = requestUrl.searchParams.get("pageNo") ?? "1";
  requestedSummaryPages.push(pageNo);
  const item =
    pageNo === "1"
      ? [
          {
            exmn_ymd: "20260601",
            se_cd: "02",
            se_nm: "중도매",
            ctgry_cd: "100",
            ctgry_nm: "식량작물",
            item_cd: "152",
            item_nm: "감자",
            exmn_dd_cnvs_prc: "1000",
          },
          {
            exmn_ymd: "20260612",
            se_cd: "02",
            se_nm: "중도매",
            ctgry_cd: "100",
            ctgry_nm: "식량작물",
            item_cd: "152",
            item_nm: "감자",
            exmn_dd_cnvs_prc: "1200",
          },
        ]
      : [
          {
            exmn_ymd: "20260622",
            se_cd: "02",
            se_nm: "중도매",
            ctgry_cd: "100",
            ctgry_nm: "식량작물",
            item_cd: "152",
            item_nm: "감자",
            exmn_dd_cnvs_prc: "2000",
          },
        ];

  return {
    ok: true,
    status: 200,
    statusText: "OK",
    text: async () =>
      JSON.stringify({
        response: {
          header: { resultCode: "0", resultMsg: "정상" },
          body: {
            dataType: "JSON",
            totalCount: 1371,
            pageNo,
            numOfRows: 1000,
            items: { item },
          },
        },
      }),
  } as Response;
}) as typeof fetch;

try {
  const pagedSummary = await fetchMarketPriceSummaryForFarm({
    cropName: "감자",
    region: "김제시 만경읍",
    now: new Date("2026-06-24T03:00:00Z"),
  });
  assert.deepEqual(requestedSummaryPages, ["1", "2"]);
  assert.equal(pagedSummary?.latestDate, "20260622");
  assert.equal(pagedSummary?.latestWholesaleKgPrice, 2000);
  assert.equal(pagedSummary?.rowCount, 3);
} finally {
  globalThis.fetch = originalFetch;
  if (originalPublicDataKey === undefined) {
    delete process.env.PUBLIC_DATA_SERVICE_KEY;
  } else {
    process.env.PUBLIC_DATA_SERVICE_KEY = originalPublicDataKey;
  }
}

const fallbackRequests: string[] = [];
process.env.PUBLIC_DATA_SERVICE_KEY = "mock-key";
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const requestUrl = new URL(String(input));
  const startDate = requestUrl.searchParams.get("cond[exmn_ymd::GTE]") ?? "";
  fallbackRequests.push(startDate);

  const isFallbackRange = startDate === "20250626";
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    text: async () =>
      JSON.stringify({
        response: {
          header: { resultCode: "0", resultMsg: "정상" },
          body: {
            dataType: "JSON",
            totalCount: isFallbackRange ? 1 : 0,
            pageNo: "1",
            numOfRows: 1000,
            items: isFallbackRange
              ? {
                  item: {
                    exmn_ymd: "20260406",
                    se_cd: "02",
                    se_nm: "중도매",
                    ctgry_cd: "400",
                    ctgry_nm: "과일류",
                    item_cd: "414",
                    item_nm: "포도",
                    exmn_dd_cnvs_prc: "4300",
                  },
                }
              : {},
          },
        },
      }),
  } as Response;
}) as typeof fetch;

try {
  const fallbackSummary = await fetchMarketPriceSummaryForFarm({
    cropName: "포도",
    region: "김제시 만경읍",
    now: new Date("2026-06-25T03:00:00Z"),
  });

  assert.deepEqual(fallbackRequests, ["20260527", "20250626"]);
  assert.equal(fallbackSummary?.rowCount, 1);
  assert.equal(fallbackSummary?.latestDate, "20260406");
  assert.equal(fallbackSummary?.latestWholesaleKgPrice, 4300);
  assert.equal(fallbackSummary?.warning?.includes("최근 30일"), true);
} finally {
  globalThis.fetch = originalFetch;
  if (originalPublicDataKey === undefined) {
    delete process.env.PUBLIC_DATA_SERVICE_KEY;
  } else {
    process.env.PUBLIC_DATA_SERVICE_KEY = originalPublicDataKey;
  }
}

console.log("market price summary behavior tests passed");
