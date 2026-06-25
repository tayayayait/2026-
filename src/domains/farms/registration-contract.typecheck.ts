import {
  DEFAULT_FARMMAP_RADIUS_METERS,
  FARMMAP_RADIUS_OPTIONS,
  buildFallbackFarmMapParcel,
  extractFarmRegion,
  isJeonbukAddressCandidate,
  normalizeAddressCandidate,
  selectInitialFarmMapParcel,
  toFarmParcelSelection,
} from "./registration";
import type { AddressCandidate, Farm, FarmMapParcel, FarmParcelSelection } from "./types";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

assert(DEFAULT_FARMMAP_RADIUS_METERS === 50, "FarmMap default radius must remain bounded");
assert(FARMMAP_RADIUS_OPTIONS.includes(1000), "FarmMap lookup must expose 1000m retry radius");

const addressCandidate: AddressCandidate = normalizeAddressCandidate(
  {
    roadAddress: "전북특별자치도 김제시 만경읍 만경리 234-5",
    jibunAddress: "전북특별자치도 김제시 만경읍 만경리 234-5",
    x: "126.8123",
    y: "35.8421",
  },
  0,
);

const inServiceArea: boolean = isJeonbukAddressCandidate(addressCandidate);

const fallbackParcel: FarmMapParcel = buildFallbackFarmMapParcel({
  lat: addressCandidate.lat,
  lng: addressCandidate.lng,
  representativeAddress: addressCandidate.roadAddress || addressCandidate.jibunAddress,
});

const parcelSelection: FarmParcelSelection = toFarmParcelSelection(fallbackParcel);

const liveParcel: FarmMapParcel = {
  ...fallbackParcel,
  farmMapId: "451301230000001",
  pnu: "4513012300100010000",
  landCategory: "답",
  cropLandType: "논",
  areaSquareMeter: 1234.5,
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        { lat: 35.841, lng: 126.811 },
        { lat: 35.841, lng: 126.813 },
        { lat: 35.843, lng: 126.813 },
        { lat: 35.841, lng: 126.811 },
      ],
    ],
  },
  centroid: { lat: 35.842, lng: 126.812 },
  source: "FARMMAP",
};
const liveSelection = toFarmParcelSelection(liveParcel);
assert(liveSelection.landCategory === "답", "parcel selection must preserve land category");
assert(
  liveSelection.geometry?.coordinates[0]?.length === 4,
  "parcel selection must preserve geometry",
);
assert(liveSelection.centroid.lat === 35.842, "parcel selection must preserve centroid");
assert(
  selectInitialFarmMapParcel([liveParcel])?.farmMapId === liveParcel.farmMapId,
  "one FarmMap candidate must be selected automatically",
);
assert(
  selectInitialFarmMapParcel([liveParcel, { ...liveParcel, farmMapId: "parcel-2" }]) === null,
  "multiple FarmMap candidates must require an explicit selection",
);
assert(
  extractFarmRegion("전북특별자치도 김제시 만경읍 송상리 123-5") === "김제시 만경읍",
  "FarmMap parcel addresses must save a concise Jeonbuk city and town region",
);
assert(
  extractFarmRegion("전라북도 정읍시 신태인읍 화호리 산 102") === "정읍시 신태인읍",
  "legacy Jeonbuk aliases must save the same concise region",
);
assert(
  extractFarmRegion("서울특별시 종로구 청운동 1") === "서울특별시 종로구",
  "non-Jeonbuk addresses must retain province and city/district as the region",
);

const farm: Farm = {
  id: "farm-with-parcel",
  name: "필지 테스트 농장",
  address: addressCandidate.roadAddress,
  region: addressCandidate.region,
  lat: addressCandidate.lat,
  lng: addressCandidate.lng,
  crop: "벼",
  area: parcelSelection.areaSquareMeter || 1000,
  growthStageCode: "18602",
  interestedWork: ["방제"],
  parcel: parcelSelection,
  createdAt: new Date().toISOString(),
};

void inServiceArea;
void farm;
console.log("farm registration contract tests passed");
