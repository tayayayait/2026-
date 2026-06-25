import {
  buildPesticideRecommendationView,
  classifyPesticideUsability,
  groupByUsability,
} from "./safe-use";
import type { PesticideRegistration } from "@/integrations/pesticides/registration";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const highPhiPesticide: PesticideRegistration = {
  id: "high-phi",
  brandName: "High PHI pesticide",
  cropName: "벼",
  diseaseWeedName: "도열병",
  phiDays: 14,
  useCount: 3,
};

const lowPhiPesticide: PesticideRegistration = {
  id: "low-phi",
  brandName: "Low PHI pesticide",
  cropName: "벼",
  diseaseWeedName: "도열병",
  phiDays: 3,
  useCount: 2,
};

const boundaryPhiPesticide: PesticideRegistration = {
  id: "boundary-phi",
  brandName: "Boundary PHI pesticide",
  cropName: "벼",
  diseaseWeedName: "도열병",
  phiDays: 7,
  useCount: 4,
};

const noPhiPesticide: PesticideRegistration = {
  id: "no-phi",
  brandName: "Unknown PHI pesticide",
  cropName: "벼",
  diseaseWeedName: "도열병",
};

assert(
  classifyPesticideUsability(highPhiPesticide, "18605") === "RESTRICTED",
  "fruiting-stage PHI 14 pesticide must be restricted",
);
assert(
  classifyPesticideUsability(boundaryPhiPesticide, "18605") === "RESTRICTED",
  "fruiting-stage PHI 7 boundary pesticide must be restricted",
);
assert(
  classifyPesticideUsability(lowPhiPesticide, "18605") === "USABLE",
  "fruiting-stage PHI 3 pesticide must remain usable",
);
assert(
  classifyPesticideUsability(highPhiPesticide, "18604") === "RESTRICTED",
  "flowering-stage PHI 14 pesticide must be restricted",
);
assert(
  classifyPesticideUsability(boundaryPhiPesticide, "18604") === "USABLE",
  "flowering-stage PHI 7 pesticide must remain usable",
);
assert(
  classifyPesticideUsability(highPhiPesticide, "18603") === "USABLE",
  "mid-growth stage must not apply PHI restriction",
);
assert(
  classifyPesticideUsability(highPhiPesticide, null) === "UNKNOWN",
  "missing growth-stage code must return UNKNOWN",
);
assert(
  classifyPesticideUsability(noPhiPesticide, "18605") === "UNKNOWN",
  "missing PHI must return UNKNOWN",
);

const groups = groupByUsability(
  [highPhiPesticide, lowPhiPesticide, boundaryPhiPesticide, noPhiPesticide],
  "18605",
);
assert(groups.usable.length === 1, "fruiting-stage usable group count mismatch");
assert(groups.restricted.length === 2, "fruiting-stage restricted group count mismatch");
assert(groups.unknown.length === 1, "fruiting-stage unknown group count mismatch");
assert(
  groups.restricted[0]?.usabilityReason?.includes("14") === true,
  "restricted pesticide must include a PHI reason",
);

const view = buildPesticideRecommendationView(
  [highPhiPesticide, lowPhiPesticide, boundaryPhiPesticide, noPhiPesticide],
  {
    growthStageCode: "18605",
    growthStageLabel: "결실기",
    targetCrop: "벼",
    targetPest: "도열병",
  },
);
assert(view.totalCount === 4, "recommendation view total count mismatch");
assert(view.usable.length === 1, "recommendation view usable count mismatch");
assert(view.restricted.length === 2, "recommendation view restricted count mismatch");
assert(view.unknown.length === 1, "recommendation view unknown count mismatch");
assert(view.growthStageLabel === "결실기", "recommendation view growth-stage label mismatch");
assert(view.targetPest === "도열병", "recommendation view target pest mismatch");

console.log("pesticide safe-use behavior tests passed");
