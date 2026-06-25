import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const routeSource = readSource("../../routes/farms.$farmId.risk.tsx");
const workspaceSource = readSource(
  "../../components/pest-monitoring/pest-monitoring-workspace.tsx",
);

assert.match(
  routeSource,
  /key=\{`\$\{farm\.id\}-\$\{predictionMap\?\.cropCode \?\? "none"\}`\}/,
  "농장 또는 예측 작물이 바뀌면 모니터링 작업공간 상태를 초기화해야 합니다.",
);
assert.doesNotMatch(
  routeSource,
  /useState<string \| null>\(null\)/,
  "예측 작물 선택 상태를 위험 상세 라우트에 유지하면 이전 농장 값이 남을 수 있습니다.",
);
assert.match(
  workspaceSource,
  /selectedCropCode=\{predictionMap\.cropCode\}/,
  "예측 지도는 항상 현재 농장의 예측 작물 코드를 사용해야 합니다.",
);
assert.match(
  workspaceSource,
  /farm\.parcel\?\.centroid \?\? \{ lat: farm\.lat, lng: farm\.lng \}/,
  "예측 지도는 등록 필지 centroid가 있으면 필지 좌표를 우선 사용해야 합니다.",
);
assert.match(
  workspaceSource,
  /selectedCropName=\{predictionMap\.cropName\}/,
  "예측 지도 제목은 현재 예측 작물명을 받아야 합니다.",
);
assert.match(
  workspaceSource,
  /selectedPestName=\{selectedPredictionPest\?\.name\}/,
  "예측 지도 제목은 선택된 예측 병해충명을 받아야 합니다.",
);
assert.match(
  workspaceSource,
  /selectedFieldCode=\{selectedPredictionModel\?\.fieldCode\}/,
  "농장 중심 예측 지도는 선택 모델의 NCPMS fieldCode를 받아야 합니다.",
);
assert.match(
  workspaceSource,
  /selectedLastRunAt=\{selectedPredictionModel\?\.lastRunAt\}/,
  "농장 중심 예측 지도는 선택 모델의 최신 실행 시각을 받아야 합니다.",
);
assert.match(
  workspaceSource,
  /selectedRiskLevels=\{selectedPredictionModel\?\.riskLevels\}/,
  "예측 지도는 선택 모델의 위험수준 범례를 받아야 합니다.",
);
assert.match(
  workspaceSource,
  /farmParcel=\{farm\.parcel\}/,
  "농장 중심 예측 지도는 등록 필지 정보를 받아야 합니다.",
);
assert.match(
  workspaceSource,
  /if \(cropCode !== predictionMap\.cropCode\) return;/,
  "iframe에서 다른 작물 이벤트가 오면 현재 농장 목록을 덮어쓰지 않아야 합니다.",
);

assert.match(
  workspaceSource,
  /model\.code,\s*\{ code: model\.code, fieldCode: model\.fieldCode, name: model\.name \}/,
  "prediction selector values must use NCPMS dbyhsMdlCode while retaining fieldCode for the map layer",
);

console.log("pest monitoring workspace behavior tests passed");
