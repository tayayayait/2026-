import type { RecommendationResult } from "./recommender";
import {
  buildRentalOfficeRecommendations,
  groupRentalOfficeRecommendations,
  selectRentalOfficeRecommendations,
} from "./rental-office-recommendations";
import { RENTAL_MACHINE_CATEGORY_OPTIONS } from "./rental-machine-categories";
import type { Rental } from "./types";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const mangyeongOffice: Rental = {
  id: "mangyeong-office",
  name: "김제시 농기계임대사업소 만경분소",
  address: "전북특별자치도 김제시 만경읍",
  region: "전북특별자치도 김제시",
  lat: 35.85,
  lng: 126.82,
  phone: "063-540-4560",
  machines: [],
};

const recommendations: RecommendationResult[] = [
  {
    type: "TRACTOR",
    machineName: "트랙터 및 작업기",
    rental: mangyeongOffice,
    status: "REQUEST_ONLY",
    count: 12,
    availabilityBasis: "HOLDING_COUNT",
    distanceKm: 8.4,
    reason: "방제 작업 권장",
    rank: 28,
  },
  {
    type: "OTHER",
    machineName: "기타 임대 농기계",
    rental: mangyeongOffice,
    status: "REQUEST_ONLY",
    count: 4,
    availabilityBasis: "HOLDING_COUNT",
    distanceKm: 8.4,
    reason: "방제 작업 권장",
    rank: 24,
  },
];

const offices = groupRentalOfficeRecommendations(recommendations);

assert(offices.length === 1, "recommendations from one rental office should be grouped");
assert(
  offices[0]?.rental.id === mangyeongOffice.id,
  "group should preserve rental office identity",
);
assert(offices[0]?.recommendations.length === 2, "group should preserve matched machines");
assert(offices[0]?.priorityRank === 28, "group priority should use the best machine rank");

const nearbyOffice: Rental = {
  ...mangyeongOffice,
  id: "nearby-office",
  name: "김제시 농기계임대사업소 본소",
};
const allOffices = groupRentalOfficeRecommendations([
  ...recommendations,
  {
    type: "PLANTER",
    machineName: "자주형 파종기",
    rental: nearbyOffice,
    status: "REQUEST_ONLY",
    count: 2,
    availabilityBasis: "HOLDING_COUNT",
    distanceKm: 3.1,
    reason: "파종 작업 권장",
    rank: 20,
  },
]);

const filtered = selectRentalOfficeRecommendations(allOffices, {
  maxDistanceKm: 10,
  machineName: "트랙터 및 작업기",
  sortBy: "DISTANCE",
});

assert(filtered.length === 1, "machine filter should keep offices with the selected machine");
assert(
  filtered[0]?.rental.id === mangyeongOffice.id,
  "machine filter should select matching office",
);
assert(
  filtered[0]?.recommendations.length === 1 &&
    filtered[0]?.recommendations[0]?.machineName === "트랙터 및 작업기",
  "machine filter should remove non-matching machines from the office card",
);
assert(
  selectRentalOfficeRecommendations(allOffices, {
    maxDistanceKm: 10,
    sortBy: "DISTANCE",
  })[0]?.rental.id === nearbyOffice.id,
  "distance sort should put the nearest office first",
);

const inventoryOffice: Rental = {
  ...mangyeongOffice,
  id: "inventory-office",
  machines: [
    {
      id: "inventory-tractor",
      type: "TRACTOR",
      category: "TRACTOR_EQUIPMENT",
      name: "트랙터 및 작업기",
      status: "REQUEST_ONLY",
      count: 12,
      availabilityBasis: "HOLDING_COUNT",
    },
    {
      id: "inventory-planter",
      type: "PLANTER",
      category: "SELF_PROPELLED_PLANTER",
      name: "자주형 파종기",
      status: "REQUEST_ONLY",
      count: 2,
      availabilityBasis: "HOLDING_COUNT",
    },
  ],
};
const inventoryRecommendations: RecommendationResult[] = [
  {
    ...recommendations[0],
    rental: inventoryOffice,
  },
];
const inventoryOffices = buildRentalOfficeRecommendations(
  { lat: inventoryOffice.lat, lng: inventoryOffice.lng },
  [inventoryOffice],
  inventoryRecommendations,
);

assert(
  RENTAL_MACHINE_CATEGORY_OPTIONS.length === 9,
  "filter options should expose all nine public rental inventory fields",
);
assert(
  inventoryOffices[0]?.recommendations.length === 2,
  "office cards should include inventory that is not part of the current work recommendation",
);
const planterOffices = selectRentalOfficeRecommendations(inventoryOffices, {
  maxDistanceKm: 10,
  machineCategory: "SELF_PROPELLED_PLANTER",
  sortBy: "PRIORITY",
});
assert(
  planterOffices.length === 1 &&
    planterOffices[0]?.recommendations[0]?.machineName === "자주형 파종기",
  "category filter should find non-recommended inventory held by a rental office",
);

console.log("rental office recommendation behavior tests passed");
