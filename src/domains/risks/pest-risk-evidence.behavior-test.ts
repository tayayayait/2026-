import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const analysisService = readFileSync(
  new URL("../analysis/farm-analysis-service.ts", import.meta.url),
  "utf8",
);

assert.doesNotMatch(
  analysisService,
  /pestCount:\s*pests\.length/,
  "작물 관련 지식 목록 건수는 위험도 입력으로 사용하면 안 됩니다.",
);
assert.match(
  analysisService,
  /pestEvidenceCount:\s*0/,
  "예찰·관측 근거가 없으면 병해충 위험 근거를 0으로 명시해야 합니다.",
);

console.log("pest risk evidence behavior tests passed");
