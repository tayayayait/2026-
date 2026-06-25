import assert from "node:assert/strict";

const contractModule = await import("./parcel-search-contract").catch(() => ({}));
const requestSchema = Reflect.get(contractModule, "farmParcelSearchRequestSchema");

assert.equal(
  typeof requestSchema?.safeParse,
  "function",
  "Phase 1 must expose a Zod schema for every parcel search mode",
);

const radiusRequest = requestSchema.parse({
  mode: "RADIUS",
  lat: 35.8421,
  lng: 126.8123,
  representativeAddress: "  전북특별자치도 김제시 만경읍  ",
});
assert.deepEqual(radiusRequest, {
  mode: "RADIUS",
  lat: 35.8421,
  lng: 126.8123,
  representativeAddress: "전북특별자치도 김제시 만경읍",
  radiusMeters: 50,
});

const pointRequest = requestSchema.parse({
  mode: "POINT",
  lat: 35.8421,
  lng: 126.8123,
  representativeAddress: "지도 선택 위치",
});
assert.equal(pointRequest.mode, "POINT");

const pnuRequest = requestSchema.parse({
  mode: "PNU",
  pnu: "4513012300100010000",
});
assert.equal(pnuRequest.pnu, "4513012300100010000");
assert.equal(
  requestSchema.safeParse({ mode: "PNU", pnu: "45130" }).success,
  false,
  "PNU must contain exactly 19 digits",
);

const regionRequest = requestSchema.parse({
  mode: "REGION",
  bjdCode: "4513035021",
  landCodes: ["01", "02", "02"],
  minAreaSquareMeter: 100,
  maxAreaSquareMeter: 1000,
});
assert.deepEqual(regionRequest.landCodes, ["01", "02"]);
assert.equal(
  requestSchema.safeParse({
    mode: "REGION",
    bjdCode: "4513035021",
    landCodes: ["01"],
    minAreaSquareMeter: 1000,
    maxAreaSquareMeter: 100,
  }).success,
  false,
  "Region area range must be ordered",
);

console.log("parcel search request contract tests passed");
