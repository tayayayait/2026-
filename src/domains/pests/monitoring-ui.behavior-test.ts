import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const workspace = readSource("../../components/pest-monitoring/pest-monitoring-workspace.tsx");
const catalog = readSource("../../components/pest-monitoring/pest-catalog-list.tsx");
const predictionSelector = readSource("../../components/pest-prediction-selector.tsx");
const ajaxWidget = readSource("../../components/ncpms-ajax-widget.tsx");
const farmRiskRoute = readSource("../../routes/farms.$farmId.risk.tsx");

assert.match(workspace, /병해충 모니터링/, "병해충 영역의 목적을 명확히 표시해야 합니다.");
assert.match(workspace, /관련 병해충/, "지식 목록은 관련 병해충으로 표현해야 합니다.");
assert.match(workspace, /예측 지원/, "예측 가능한 모델을 관련 목록과 분리해야 합니다.");
assert.match(workspace, /예측 지도/, "예측 지도는 별도의 탐색 영역이어야 합니다.");
assert.match(
  workspace,
  /현재 발생 여부는 관련 목록만으로 판단할 수 없습니다/,
  "관련 목록을 실제 발생 경보로 오인하지 않도록 안내해야 합니다.",
);
assert.doesNotMatch(workspace, /감시 필요/, "근거 없는 감시 상태를 고정 표시하면 안 됩니다.");
assert.doesNotMatch(
  catalog,
  /감시 필요/,
  "개별 관련 항목에도 근거 없는 경고를 표시하면 안 됩니다.",
);
assert.match(
  catalog,
  /학명·영문명/,
  "NCPMS oprName은 학명과 영문명을 함께 포함함을 표시해야 합니다.",
);
assert.match(catalog, /aria-label="병해충 검색"/, "검색 입력은 접근 가능한 이름을 가져야 합니다.");
assert.doesNotMatch(
  predictionSelector,
  /aspect-square/,
  "이미지가 없는 예측 모델을 큰 빈 정사각형 카드로 표시하면 안 됩니다.",
);
assert.match(predictionSelector, /loading="lazy"/, "예측 모델 이미지는 지연 로딩해야 합니다.");
assert.match(
  predictionSelector,
  /예측 지원 모델/,
  "예측 지원 여부와 실제 경보 상태를 구분해야 합니다.",
);

assert.doesNotMatch(
  ajaxWidget,
  /maps\.google|sensor=false/,
  "prediction map iframe must not load the deprecated Google Maps script",
);
assert.match(
  ajaxWidget,
  /sandbox="allow-scripts"/,
  "prediction map iframe must keep scripts sandboxed without same-origin escape risk",
);
assert.doesNotMatch(
  ajaxWidget,
  /allow-scripts allow-same-origin/,
  "prediction map iframe must not combine scripts with same-origin sandbox permission",
);
assert.match(
  ajaxWidget,
  /getDbyhsMdlCode\(\)/,
  "prediction iframe bridge must send NCPMS dbyhsMdlCode to React",
);
assert.match(
  ajaxWidget,
  /select\[name=dbyhsMdlcode\]/,
  "prediction iframe bridge must target the SDK's lowercase dbyhsMdlcode select",
);
assert.doesNotMatch(
  ajaxWidget,
  /select\[name=dbyhsMdlCode\]/,
  "prediction iframe bridge must not use the wrong dbyhsMdlCode select name",
);
assert.match(
  ajaxWidget,
  /scheduleSelectionSync\(\)/,
  "prediction iframe bridge must retry selection after the SDK creates its controls",
);
assert.match(
  ajaxWidget,
  /buildPredictionMapTitle/,
  "prediction map must build a visible title from the selected pest model",
);
assert.match(
  ajaxWidget,
  /예측 대상:/,
  "prediction map must display the current target pest model",
);
assert.match(
  ajaxWidget,
  /예측 기준/,
  "prediction map must show the selected crop, pest model, layer, and run time as the criteria",
);
assert.match(
  ajaxWidget,
  /색상 해석/,
  "prediction map must render the NCPMS risk-level legend outside the map",
);
assert.match(
  ajaxWidget,
  /미표시/,
  "prediction map legend must include an explicit no-color/no-data interpretation",
);
assert.match(
  ajaxWidget,
  /1단계로 해석하지 않습니다/,
  "prediction map legend must not let no-color areas be interpreted as the lowest risk level",
);
assert.match(
  ajaxWidget,
  /판단 방법/,
  "prediction map must explain how to interpret the overlay against the registered parcel",
);
assert.match(
  ajaxWidget,
  /팜맵 경계 색상은 병해충 위험도가 아닙니다/,
  "prediction map must separate FarmMap parcel colors from NCPMS risk colors",
);
assert.match(
  ajaxWidget,
  /전체 지도에서 분포 확인/,
  "prediction map must offer a direct nationwide fallback when farm-centered colors are unclear",
);
assert.match(
  ajaxWidget,
  /내 농장 중심/,
  "prediction map must default to a farm-centered map option",
);
assert.match(
  ajaxWidget,
  /FarmParcelBoundaryMap/,
  "farm-centered prediction map must use the same FarmMap-based renderer as farm registration",
);
assert.match(
  ajaxWidget,
  /predictionLayer=\{predictionLayer\}/,
  "farm-centered prediction map must overlay the selected NCPMS prediction layer",
);
assert.match(
  ajaxWidget,
  /enableWfsLookup=\{false\}/,
  "farm-centered prediction map must not refetch surrounding WFS parcels",
);
assert.match(
  ajaxWidget,
  /흰색 외곽선이 있는 자주색 굵은 경계와 보라색 점/,
  "farm-centered prediction map must explain the registered parcel and farm center overlay",
);
assert.match(
  ajaxWidget,
  /전체 지도/,
  "prediction map must provide a nationwide map option",
);
assert.match(
  ajaxWidget,
  /setCoordinateZoom\("\$\{mapCenterLat\}", "\$\{mapCenterLng\}", \$\{mapCenterZoom\}\)/,
  "prediction iframe must initialize from the selected farm or nationwide map center",
);

assert.doesNotMatch(
  farmRiskRoute,
  /mapAnalysisSourceEvidence|SourceStatusRow|분석 데이터 출처/,
  "farm risk screen must not render the removed analysis-source summary card",
);
assert.doesNotMatch(
  farmRiskRoute,
  /meaningfulPestDetails|hasMeaningfulPestDetail|NCPMS 병해충·잡초 상세 API 정보|getPestTypeLabel/,
  "farm risk screen must not render the removed standalone NCPMS detail API card",
);

console.log("pest monitoring UI behavior tests passed");
