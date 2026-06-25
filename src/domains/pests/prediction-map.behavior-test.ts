import type { NcpmsPredictionMetadata } from "../../integrations/ncpms/prediction-map";
import {
  clampPredictionDate,
  getPredictionDateRange,
  selectPredictionMapForCrop,
} from "./prediction-map";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const metadata: NcpmsPredictionMetadata = {
  crops: [
    { code: "FC010101", name: "논벼" },
    { code: "FT010601", name: "사과" },
  ],
  models: [
    {
      cropCode: "FC010101",
      cropName: "논벼",
      code: "RICE-ACTIVE",
      name: "잎도열병",
      fieldCode: "RB_IR",
      driveCycle: "1",
      lastRunAt: "2026062012",
      beginMonth: 5,
      beginDay: 1,
      endMonth: 9,
      endDay: 30,
      riskLevels: [],
    },
    {
      cropCode: "FC010101",
      cropName: "논벼",
      code: "RICE-FUTURE",
      name: "세균벼알마름병",
      fieldCode: "TGRTH",
      driveCycle: "1",
      lastRunAt: "2026062712",
      beginMonth: 7,
      beginDay: 15,
      endMonth: 9,
      endDay: 10,
      riskLevels: [],
    },
    {
      cropCode: "FT010601",
      cropName: "사과",
      code: "APPLE-ACTIVE",
      name: "갈색무늬병",
      fieldCode: "AMB",
      driveCycle: "1",
      lastRunAt: "2026062012",
      beginMonth: 4,
      beginDay: 1,
      endMonth: 10,
      endDay: 31,
      riskLevels: [],
    },
  ],
};

const ricePrediction = selectPredictionMapForCrop(metadata, "벼");
assert(ricePrediction?.cropCode === "FC010101", "벼 must match the 논벼 prediction crop");
assert(ricePrediction?.models.length === 1, "models without an available date must be excluded");
assert(ricePrediction?.models[0]?.name === "잎도열병", "active rice model mismatch");

const applePrediction = selectPredictionMapForCrop(metadata, "사과");
assert(applePrediction?.models[0]?.fieldCode === "AMB", "exact crop prediction mismatch");
assert(selectPredictionMapForCrop(metadata, "콩") === null, "unsupported crop must return null");

const activeRange = getPredictionDateRange(metadata.models[0]);
assert(activeRange?.start === "2026-05-01", "prediction range start mismatch");
assert(activeRange?.end === "2026-06-20", "prediction range must end at the latest model run");
assert(getPredictionDateRange(metadata.models[1]) === null, "not-yet-run model must have no range");
assert(
  clampPredictionDate(metadata.models[0], "2026-04-01") === "2026-05-01",
  "prediction date must clamp to range start",
);
assert(
  clampPredictionDate(metadata.models[0], "2026-08-01") === "2026-06-20",
  "prediction date must clamp to latest model run",
);
assert(
  clampPredictionDate(metadata.models[0], "2026-06-18") === "2026-06-18",
  "in-range prediction date must be preserved",
);

console.log("pest prediction map behavior tests passed");
