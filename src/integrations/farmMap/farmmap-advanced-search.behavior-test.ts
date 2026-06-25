import assert from "node:assert/strict";
import type { FarmParcelCandidate } from "@/domains/farms/types";

const contractModule = await import("./farmmap-search-contract").catch(() => ({}));
const serviceModule = await import("./advanced-parcel-search").catch(() => ({}));

const buildFarmMapBjdLandUrl = Reflect.get(contractModule, "buildFarmMapBjdLandUrl");
const buildFarmMapAnalysisAreaUrl = Reflect.get(contractModule, "buildFarmMapAnalysisAreaUrl");
const buildFarmMapPnuSearchUrl = Reflect.get(contractModule, "buildFarmMapPnuSearchUrl");
const extractFarmMapPnus = Reflect.get(contractModule, "extractFarmMapPnus");
const searchAdvancedFarmMapParcels = Reflect.get(serviceModule, "searchAdvancedFarmMapParcels");

assert.equal(typeof buildFarmMapBjdLandUrl, "function", "BJD and land-code URL builder must exist");
const bjdUrl = new URL(
  buildFarmMapBjdLandUrl("test-key", "registered.example", {
    bjdCode: "4513035021",
    landCode: "02",
  }),
);
assert(bjdUrl.pathname.endsWith("/farmmapApi/getFarmmapDataSeachBjdAndLandCode.do"));
assert.equal(bjdUrl.searchParams.get("bjdCd"), "4513035021");
assert.equal(bjdUrl.searchParams.get("landCd"), "02");
assert.equal(bjdUrl.searchParams.get("apiVersion"), "v2");
assert.equal(bjdUrl.searchParams.get("columnType"), "KOR");

assert.equal(
  typeof buildFarmMapAnalysisAreaUrl,
  "function",
  "FarmMap area-analysis URL builder must exist",
);
const areaUrl = new URL(
  buildFarmMapAnalysisAreaUrl("test-key", "registered.example", {
    bjdCode: "4513035021",
    landCodes: ["01", "02"],
    minAreaSquareMeter: 100,
    maxAreaSquareMeter: 1000,
  }),
);
assert(areaUrl.pathname.endsWith("/farmmapApi/getFarmmapDataSeachAnalysisBaseAttr.do"));
assert.equal(areaUrl.searchParams.get("landCd"), "01,02");
assert.equal(areaUrl.searchParams.get("fromBaseArea"), "100");
assert.equal(areaUrl.searchParams.get("toBaseArea"), "1000");

assert.equal(
  typeof buildFarmMapPnuSearchUrl,
  "function",
  "Reference-compatible PNU URL builder must exist",
);
const pnuUrl = new URL(
  buildFarmMapPnuSearchUrl("test-key", "registered.example", "4513035021102340005"),
);
assert(pnuUrl.pathname.endsWith("/farmmapApi/getFarmmapDataSeachPnu.do"));
assert.equal(pnuUrl.searchParams.get("pnu"), "4513035021102340005");
assert.equal(pnuUrl.searchParams.get("columnType"), "KOR");

assert.equal(typeof extractFarmMapPnus, "function", "FarmMap PNU extractor must exist");
assert.deepEqual(
  extractFarmMapPnus({
    output: {
      data: [
        { 필지고유번호: "4513035021102340005" },
        { pnu: "4513035021102340005" },
        { 대표PNU: "4513035021102350000" },
      ],
    },
  }),
  ["4513035021102340005", "4513035021102350000"],
);

assert.equal(
  typeof searchAdvancedFarmMapParcels,
  "function",
  "Advanced FarmMap search service must exist",
);

const pnuResult = await searchAdvancedFarmMapParcels(
  { mode: "PNU", pnu: "4513035021102340005" },
  {
    apiKey: "test-key",
    domain: "registered.example",
    fetcher: async () =>
      Response.json({
        output: {
          farmmapData: {
            data: [
              {
                대표PNU: "4513035021102340005",
                법정동주소: "전북특별자치도 김제시 만경읍 만경리 234-5",
                분류명: "밭",
                면적: 1200,
              },
            ],
          },
        },
      }),
  },
);
assert.equal(pnuResult.status, "SUCCESS");
assert.equal(pnuResult.candidates[0]?.pnu, "4513035021102340005");
assert.equal(pnuResult.candidates[0]?.centroid, null);

const regionUrls: string[] = [];
const regionResult = await searchAdvancedFarmMapParcels(
  {
    mode: "REGION",
    bjdCode: "4513035021",
    landCodes: ["01", "02"],
  },
  {
    apiKey: "test-key",
    domain: "registered.example",
    fetcher: async (input: string | URL | Request) => {
      const url = String(input);
      regionUrls.push(url);
      const landCode = new URL(url).searchParams.get("landCd");
      return Response.json({
        output: {
          farmmapData: {
            data: [
              {
                대표PNU: landCode === "01" ? "4513035021100010000" : "4513035021100020000",
                법정동주소: "전북특별자치도 김제시 만경읍 만경리",
                분류명: landCode === "01" ? "논" : "밭",
              },
            ],
          },
        },
      });
    },
  },
);
assert.equal(regionUrls.length, 2);
assert.equal(regionResult.candidates.length, 2);

const landFilteredRegionResult = await searchAdvancedFarmMapParcels(
  {
    mode: "REGION",
    bjdCode: "4513035021",
    landCodes: ["02"],
  },
  {
    apiKey: "test-key",
    domain: "registered.example",
    fetcher: async () =>
      Response.json({
        output: {
          farmmapData: {
            data: [
              {
                대표PNU: "4513035021100010000",
                법정동주소: "전북특별자치도 김제시 만경읍 만경리",
                분류명: "논",
              },
              {
                대표PNU: "4513035021100020000",
                법정동주소: "전북특별자치도 김제시 만경읍 만경리",
                분류명: "밭",
              },
            ],
          },
        },
      }),
  },
);
assert.deepEqual(
  landFilteredRegionResult.candidates.map((candidate: FarmParcelCandidate) => candidate.cropLandType),
  ["밭"],
  "Region search must discard upstream rows that do not match the requested land code",
);

const areaFlowPaths: string[] = [];
const areaResult = await searchAdvancedFarmMapParcels(
  {
    mode: "REGION",
    bjdCode: "4513035021",
    landCodes: ["06"],
    minAreaSquareMeter: 100,
    maxAreaSquareMeter: 1000,
  },
  {
    apiKey: "test-key",
    domain: "registered.example",
    fetcher: async (input: string | URL | Request) => {
      const path = new URL(String(input)).pathname;
      areaFlowPaths.push(path);
      if (path.endsWith("getFarmmapDataSeachAnalysisBaseAttr.do")) {
        return Response.json({ output: { data: [{ 필지고유번호: "4513035021100030000" }] } });
      }
      return Response.json({
        output: {
          farmmapData: {
            data: [{ 대표PNU: "4513035021100030000", 분류명: "밭", 면적: 500 }],
          },
        },
      });
    },
  },
);
assert.equal(areaFlowPaths.length, 2);
assert(areaFlowPaths[0]?.endsWith("getFarmmapDataSeachAnalysisBaseAttr.do"));
assert(areaFlowPaths[1]?.endsWith("getFarmmapDataSeachPnu.do"));
assert.equal(areaResult.candidates[0]?.areaSquareMeter, 500);

const manyAreaFlowPaths: string[] = [];
const manyAreaPnus = Array.from(
  { length: 12 },
  (_, index) => `45130350211${String(index + 1).padStart(4, "0")}0000`,
);
const manyAreaResult = await searchAdvancedFarmMapParcels(
  {
    mode: "REGION",
    bjdCode: "4513035021",
    landCodes: ["06"],
    minAreaSquareMeter: 100,
    maxAreaSquareMeter: 1000,
  },
  {
    apiKey: "test-key",
    domain: "registered.example",
    fetcher: async (input: string | URL | Request) => {
      const url = new URL(String(input));
      manyAreaFlowPaths.push(url.pathname);
      if (url.pathname.endsWith("getFarmmapDataSeachAnalysisBaseAttr.do")) {
        return Response.json({ output: { data: manyAreaPnus.map((pnu) => ({ pnu })) } });
      }
      const pnu = url.searchParams.get("pnu") ?? "";
      return Response.json({
        output: {
          farmmapData: {
            data: [{ pnu, classification: "field", area: 500 }],
          },
        },
      });
    },
  },
);
assert.equal(
  manyAreaResult.candidates.length,
  manyAreaPnus.length,
  "area-analysis PNU results must all be resolved to parcel candidates",
);
assert.equal(
  manyAreaFlowPaths.filter((path) => path.endsWith("getFarmmapDataSeachPnu.do")).length,
  manyAreaPnus.length,
  "area-analysis search must not cap PNU detail requests",
);

const fallbackPaths: string[] = [];
const fallbackAreaResult = await searchAdvancedFarmMapParcels(
  {
    mode: "REGION",
    bjdCode: "5221025024",
    landCodes: ["01"],
    minAreaSquareMeter: 100,
    maxAreaSquareMeter: 1000,
  },
  {
    apiKey: "test-key",
    domain: "registered.example",
    fetcher: async (input: string | URL | Request) => {
      const path = new URL(String(input)).pathname;
      fallbackPaths.push(path);
      if (path.endsWith("getFarmmapDataSeachAnalysisBaseAttr.do")) {
        return new Response("<html>요청하신 페이지를 찾을 수 없습니다.</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      return Response.json({
        output: {
          farmmapData: {
            data: [
              { 대표PNU: "5221025024100010000", 분류명: "논", 면적: 50 },
              { 대표PNU: "5221025024100020000", 분류명: "논", 면적: 500 },
              { 대표PNU: "5221025024100030000", 분류명: "논", 면적: 1500 },
            ],
          },
        },
      });
    },
  },
);
assert(fallbackPaths[0]?.endsWith("getFarmmapDataSeachAnalysisBaseAttr.do"));
assert(fallbackPaths[1]?.endsWith("getFarmmapDataSeachBjdAndLandCode.do"));
assert.deepEqual(
  fallbackAreaResult.candidates.map((candidate: FarmParcelCandidate) => candidate.areaSquareMeter),
  [500],
);

console.log("advanced FarmMap search behavior tests passed");
