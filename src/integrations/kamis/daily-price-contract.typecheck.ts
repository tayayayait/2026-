import assert from "node:assert/strict";
import {
  buildKamisDailyPriceUrl,
  fetchAllKamisDailyPrices,
  KAMIS_DAILY_PRICE_BASE_URL,
  normalizeKamisDailyPriceRow,
  normalizeKamisServiceKey,
} from "./daily-price";

const encodedKey = "abc%3D%3D";
assert.equal(normalizeKamisServiceKey(encodedKey), "abc==", "encoded service key must be decoded once");

const url = buildKamisDailyPriceUrl(
  {
    startDate: "20260601",
    endDate: "20260624",
    categoryCode: "100",
    itemCode: "152",
    classCode: "02",
    regionCode: "3511",
    numOfRows: 5000,
  },
  encodedKey,
);
const parsed = new URL(url);
assert.equal(parsed.origin + parsed.pathname, KAMIS_DAILY_PRICE_BASE_URL);
assert.equal(parsed.searchParams.get("serviceKey"), "abc==");
assert.equal(parsed.searchParams.get("returnType"), "JSON");
assert.equal(parsed.searchParams.get("numOfRows"), "1000");
assert.equal(parsed.searchParams.get("cond[exmn_ymd::GTE]"), "20260601");
assert.equal(parsed.searchParams.get("cond[exmn_ymd::LTE]"), "20260624");
assert.equal(parsed.searchParams.get("cond[ctgry_cd::EQ]"), "100");
assert.equal(parsed.searchParams.get("cond[item_cd::EQ]"), "152");
assert.equal(parsed.searchParams.get("cond[se_cd::EQ]"), "02");
assert.equal(parsed.searchParams.get("cond[sgg_cd::EQ]"), "3511");

const row = normalizeKamisDailyPriceRow({
  exmn_ymd: "20260601",
  se_cd: "02",
  se_nm: "중도매",
  ctgry_cd: "100",
  ctgry_nm: "식량작물",
  item_cd: "152",
  item_nm: "감자",
  vrty_cd: "01",
  vrty_nm: "수미(노지)",
  grd_cd: "04",
  grd_nm: "상품",
  sgg_cd: "1101",
  sgg_nm: "서울",
  unit: "kg",
  unit_sz: "20",
  mrkt_cd: "0110211",
  mrkt_nm: "가락도매",
  exmn_dd_prc: "43,300",
  exmn_dd_cnvs_prc: "2165",
  orgnl_reg_dt: "2026-06-01T15:02:14Z",
});

assert.equal(row.surveyedDate, "20260601");
assert.equal(row.itemName, "감자");
assert.equal(row.varietyName, "수미(노지)");
assert.equal(row.price, 43300);
assert.equal(row.convertedKgPrice, 2165);

const originalFetch = globalThis.fetch;
const originalPublicDataKey = process.env.PUBLIC_DATA_SERVICE_KEY;
const requestedPages: string[] = [];

process.env.PUBLIC_DATA_SERVICE_KEY = "mock-key";
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const requestUrl = new URL(String(input));
  const pageNo = requestUrl.searchParams.get("pageNo") ?? "1";
  requestedPages.push(pageNo);
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
  const paged = await fetchAllKamisDailyPrices({
    startDate: "20260601",
    endDate: "20260624",
    categoryCode: "100",
    itemCode: "152",
    numOfRows: 1000,
  });
  assert.deepEqual(requestedPages, ["1", "2"]);
  assert.equal(paged.totalCount, 1371);
  assert.equal(paged.rows.length, 2);
  assert.equal(paged.rows.at(-1)?.surveyedDate, "20260622");
} finally {
  globalThis.fetch = originalFetch;
  if (originalPublicDataKey === undefined) delete process.env.PUBLIC_DATA_SERVICE_KEY;
  else process.env.PUBLIC_DATA_SERVICE_KEY = originalPublicDataKey;
}

console.log("KAMIS daily price contract tests passed");
