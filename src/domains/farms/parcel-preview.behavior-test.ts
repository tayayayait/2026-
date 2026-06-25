import * as parcelPreview from "./parcel-preview";
import type { FarmMapParcel } from "./types";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const parcel: FarmMapParcel = {
  farmMapId: "parcel-1",
  pnu: "4513012300100010000",
  representativeAddress: "전북특별자치도 김제시 만경읍",
  legalDongAddress: "전북특별자치도 김제시 만경읍",
  landCategory: "답",
  cropLandType: "논",
  areaSquareMeter: 1200,
  cultivatedAreaSquareMeter: 1200,
  cultivationRatio: null,
  cadastralMatchRate: 98,
  aerialPhotoYear: "2023",
  updatedYear: "2024",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        { lat: 35.841, lng: 126.811 },
        { lat: 35.841, lng: 126.813 },
        { lat: 35.843, lng: 126.813 },
        { lat: 35.843, lng: 126.811 },
        { lat: 35.841, lng: 126.811 },
      ],
    ],
  },
  centroid: { lat: 35.842, lng: 126.812 },
  source: "FARMMAP",
  raw: null,
};

const projectFarmMapParcels = parcelPreview.projectFarmMapParcels;
const createFarmParcelMapViewport = (
  parcelPreview as unknown as {
    createFarmParcelMapViewport?: (
      parcels: FarmMapParcel[],
      addressLocation: { lat: number; lng: number } | null,
    ) => {
      center: { lat: number; lng: number };
      bounds: { southWest: { lat: number; lng: number }; northEast: { lat: number; lng: number } };
    };
  }
).createFarmParcelMapViewport;
const createSelectedFarmParcelMapViewport = (
  parcelPreview as unknown as {
    createSelectedFarmParcelMapViewport?: (parcel: FarmMapParcel) => {
      center: { lat: number; lng: number };
      bounds: { southWest: { lat: number; lng: number }; northEast: { lat: number; lng: number } };
    };
  }
).createSelectedFarmParcelMapViewport;

assert(
  typeof createFarmParcelMapViewport === "function",
  "farm parcel map viewport must be implemented",
);
if (!createFarmParcelMapViewport) throw new Error("farm parcel map viewport is unavailable");
assert(
  typeof createSelectedFarmParcelMapViewport === "function",
  "selected parcel viewport must be implemented",
);
if (!createSelectedFarmParcelMapViewport) {
  throw new Error("selected parcel viewport is unavailable");
}

const addressOnlyViewport = createFarmParcelMapViewport([], { lat: 35.8, lng: 127.1 });
assert(addressOnlyViewport.center.lat === 35.8, "address-only map center latitude mismatch");
assert(addressOnlyViewport.center.lng === 127.1, "address-only map center longitude mismatch");

const parcelViewport = createFarmParcelMapViewport([parcel], { lat: 35.84, lng: 126.81 });
assert(parcelViewport.bounds.southWest.lat <= 35.841, "map bounds must include parcel south");
assert(parcelViewport.bounds.southWest.lng <= 126.811, "map bounds must include parcel west");
assert(parcelViewport.bounds.northEast.lat >= 35.843, "map bounds must include parcel north");
assert(parcelViewport.bounds.northEast.lng >= 126.813, "map bounds must include parcel east");

const selectedViewport = createSelectedFarmParcelMapViewport(parcel);
assert(selectedViewport.center.lat === parcel.centroid.lat, "selected parcel center latitude mismatch");
assert(selectedViewport.center.lng === parcel.centroid.lng, "selected parcel center longitude mismatch");
assert(selectedViewport.bounds.southWest.lng >= 126.8, "selected parcel viewport must not include unrelated areas");
assert(selectedViewport.bounds.northEast.lng <= 126.82, "selected parcel viewport must stay close to parcel geometry");

const projected = projectFarmMapParcels([parcel], 600, 320, 24);
assert(projected.length === 1, "one parcel polygon must be projected");
assert(projected[0]?.farmMapId === "parcel-1", "projected parcel id mismatch");
assert(projected[0]?.rings[0]?.length === 5, "projected parcel ring mismatch");
for (const point of projected[0]?.rings[0] ?? []) {
  assert(point.x >= 24 && point.x <= 576, "projected x is outside viewport");
  assert(point.y >= 24 && point.y <= 296, "projected y is outside viewport");
}

assert(
  projectFarmMapParcels([{ ...parcel, geometry: null }], 600, 320, 24).length === 0,
  "parcels without geometry must be excluded",
);

console.log("farm parcel preview behavior tests passed");
