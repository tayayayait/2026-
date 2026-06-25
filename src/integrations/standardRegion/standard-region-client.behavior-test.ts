import assert from "node:assert/strict";

const clientModule = await import("./standard-region-client").catch(() => ({}));
const fetchStandardRegionPage = Reflect.get(clientModule, "fetchStandardRegionPage");
const fetchAllStandardRegions = Reflect.get(clientModule, "fetchAllStandardRegions");

assert.equal(typeof fetchStandardRegionPage, "function", "Standard-region page client must exist");

let requestedUrl = "";
let requestedAccept = "";
const pageResult = await fetchStandardRegionPage(
  { query: "김제시 만경읍", pageNo: 1, numOfRows: 50 },
  {
    serviceKey: "test-key",
    fetcher: async (input: string | URL | Request, init?: RequestInit) => {
      requestedUrl = String(input);
      requestedAccept = new Headers(init?.headers).get("accept") ?? "";
      return Response.json({
        StanReginCd: [
          { head: [{ totalCount: 1 }] },
          { row: [{ region_cd: "4513035000", locatadd_nm: "전북특별자치도 김제시 만경읍" }] },
        ],
      });
    },
  },
);
assert(requestedUrl.includes("locatadd_nm=%EA%B9%80%EC%A0%9C%EC%8B%9C+%EB%A7%8C%EA%B2%BD%EC%9D%8D"));
assert.equal(
  requestedAccept,
  "",
  "StanReginCd returns HTTP 500 when an explicit Accept header is sent",
);
assert.equal(pageResult.rows[0]?.regionCode, "4513035000");

assert.equal(typeof fetchAllStandardRegions, "function", "Standard-region pagination client must exist");
const requestedPages: number[] = [];
const allRows = await fetchAllStandardRegions({
  serviceKey: "test-key",
  fetcher: async (input: string | URL | Request) => {
    const page = Number(new URL(String(input)).searchParams.get("pageNo"));
    requestedPages.push(page);
    const regionCode = page === 1 ? "4500000000" : "4513000000";
    const addressName = page === 1 ? "전북특별자치도" : "전북특별자치도 김제시";
    return Response.json({
      StanReginCd: [
        { head: [{ totalCount: 1001 }, { pageNo: page }, { numOfRows: 1000 }] },
        { row: [{ region_cd: regionCode, locatadd_nm: addressName }] },
      ],
    });
  },
});
assert.deepEqual(requestedPages, [1, 2]);
assert.deepEqual(allRows.map((row: { regionCode: string }) => row.regionCode), ["4500000000", "4513000000"]);

const originalStandardRegionKey = process.env.STANDARD_REGION_API_KEY;
const originalPublicDataKey = process.env.PUBLIC_DATA_SERVICE_KEY;
delete process.env.STANDARD_REGION_API_KEY;
process.env.PUBLIC_DATA_SERVICE_KEY = "shared-public-data-key";
let fallbackKey = "";
try {
  try {
    await fetchStandardRegionPage(
      { pageNo: 1, numOfRows: 1 },
      {
        fetcher: async (input: string | URL | Request) => {
          fallbackKey = new URL(String(input)).searchParams.get("ServiceKey") ?? "";
          return Response.json({ StanReginCd: [{ head: [{ totalCount: 0 }] }, { row: [] }] });
        },
      },
    );
  } catch {
    // The assertion below records the missing fallback as the intended RED failure.
  }
} finally {
  if (originalStandardRegionKey === undefined) delete process.env.STANDARD_REGION_API_KEY;
  else process.env.STANDARD_REGION_API_KEY = originalStandardRegionKey;
  if (originalPublicDataKey === undefined) delete process.env.PUBLIC_DATA_SERVICE_KEY;
  else process.env.PUBLIC_DATA_SERVICE_KEY = originalPublicDataKey;
}
assert.equal(fallbackKey, "shared-public-data-key");

console.log("standard-region client behavior tests passed");
