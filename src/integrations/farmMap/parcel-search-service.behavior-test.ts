import assert from "node:assert/strict";
import { buildFallbackFarmMapParcel } from "../../domains/farms/registration";

const serviceModule = await import("./parcel-search-service").catch(() => ({}));
const searchFarmMapParcels = Reflect.get(serviceModule, "searchFarmMapParcels");

assert.equal(typeof searchFarmMapParcels, "function", "Unified FarmMap search service must exist");

const parcel = buildFallbackFarmMapParcel({
  lat: 35.8421,
  lng: 126.8123,
  representativeAddress: "전북특별자치도 김제시 만경읍",
});
let coordinateMode = "";
let advancedMode = "";
const dependencies = {
  lookupCoordinate: async (input: { lookupMode?: string }) => {
    coordinateMode = input.lookupMode ?? "";
    return { status: "SUCCESS", parcels: [parcel], warning: null };
  },
  lookupAdvanced: async (request: { mode: string }) => {
    advancedMode = request.mode;
    return { status: "SUCCESS", candidates: [parcel], warning: null };
  },
};

const radiusResult = await searchFarmMapParcels(
  {
    mode: "RADIUS",
    lat: 35.8421,
    lng: 126.8123,
    representativeAddress: "전북특별자치도 김제시 만경읍",
    radiusMeters: 100,
  },
  dependencies,
);
assert.equal(coordinateMode, "RADIUS");
assert.equal(radiusResult.candidates[0]?.farmMapId, parcel.farmMapId);

await searchFarmMapParcels(
  {
    mode: "POINT",
    lat: 35.8421,
    lng: 126.8123,
    representativeAddress: "지도 선택 위치",
  },
  dependencies,
);
assert.equal(coordinateMode, "POINT");

await searchFarmMapParcels(
  { mode: "PNU", pnu: "4513035021102340005" },
  dependencies,
);
assert.equal(advancedMode, "PNU");

await searchFarmMapParcels(
  { mode: "REGION", bjdCode: "4513035021", landCodes: ["01"] },
  dependencies,
);
assert.equal(advancedMode, "REGION");

console.log("unified FarmMap parcel search service tests passed");
