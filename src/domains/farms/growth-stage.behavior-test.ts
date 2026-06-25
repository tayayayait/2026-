import {
  getNcpmsGrowthStageLabel,
  NCPMS_GROWTH_STAGES,
  parseNcpmsGrowthStageCode,
} from "./growth-stage";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

assert(
  NCPMS_GROWTH_STAGES.map((stage) => `${stage.code}:${stage.label}`).join(",") ===
    "18601:유묘기,18602:생육초기,18603:생육중기,18604:개화기,18605:결실기",
  "growth stages must match the documented NCPMS SVC13 category codes",
);
assert(getNcpmsGrowthStageLabel("18604") === "개화기", "growth-stage label lookup mismatch");
assert(parseNcpmsGrowthStageCode("18605") === "18605", "official code must be accepted");
assert(parseNcpmsGrowthStageCode("생육") === null, "ambiguous legacy labels must not be guessed");
assert(parseNcpmsGrowthStageCode("착과") === null, "non-NCPMS legacy labels must not be guessed");

console.log("NCPMS growth-stage behavior tests passed");
