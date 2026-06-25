import { recommendMachines } from "./recommender";
import "./rental-office-recommendations.behavior-test";
import type { Rental } from "./types";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const rentals: Rental[] = [
  {
    id: "live-rental-1",
    name: "실시간 임대사업소",
    region: "전북특별자치도 전주시",
    lat: 35.8015,
    lng: 127.1088,
    phone: "063-000-0000",
    machines: [
      {
        id: "machine-1",
        type: "DRONE",
        name: "방제 드론",
        status: "AVAILABLE",
        count: 2,
      },
    ],
  },
];

const recommendations = recommendMachines({ lat: 35.8013, lng: 127.1086 }, ["방제"], 30, rentals);

assert(recommendations.length === 1, "recommendations should use injected rentals");
assert(recommendations[0]?.rental.id === "live-rental-1", "recommendation rental id mismatch");
assert(recommendations[0]?.type === "DRONE", "recommendation machine type mismatch");
assert(
  recommendations[0]?.machineName === "방제 드론",
  "recommendation should preserve the provider machine name",
);

const categoryAwareRentals = [
  {
    ...rentals[0],
    machines: [
      {
        id: "root-harvester-1",
        type: "OTHER" as const,
        category: "ROOT_CROP_HARVESTER" as const,
        name: "땅속작물 수확기",
        status: "REQUEST_ONLY" as const,
        count: 3,
        availabilityBasis: "HOLDING_COUNT" as const,
      },
    ],
  },
];
assert(
  recommendMachines({ lat: 35.8013, lng: 127.1086 }, ["방제"], 30, categoryAwareRentals).length ===
    0,
  "root crop harvesters must not be recommended for pesticide-control work",
);

console.log("machine recommender behavior tests passed");
