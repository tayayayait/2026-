import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const routeSource = readSource("../../routes/pests.photo-search.tsx");
const riskRouteSource = readSource("../../routes/farms.$farmId.risk.tsx");
const monitoringWorkspaceSource = readSource(
  "../../components/pest-monitoring/pest-monitoring-workspace.tsx",
);
const hookSource = readSource("../../components/pest-photo-search/use-pest-photo-search.ts");
const screenSource = readSource("../../components/pest-photo-search/pest-photo-search.tsx");

assert.match(
  routeSource,
  /validateSearch/,
  "사진검색 경로는 farmId 검색 파라미터를 검증해야 합니다.",
);
assert.match(routeSource, /farmId/, "사진검색 경로는 농장 컨텍스트를 읽어야 합니다.");
assert.match(
  monitoringWorkspaceSource,
  /search=\{\{\s*farmId:\s*farm\.id\s*\}\}/,
  "병해충 모니터링 작업공간은 선택 농장을 사진검색으로 전달해야 합니다.",
);
assert.match(
  riskRouteSource,
  /<PestMonitoringWorkspace[\s\S]*farm=\{farm\}/,
  "위험 화면은 선택 농장을 병해충 모니터링 작업공간으로 전달해야 합니다.",
);
assert.match(
  hookSource,
  /createPhotoCandidateSearchTarget\(section, crop, growthStageCode \|\| null\)/,
  "사진검색 요청은 농장 생육단계 코드를 SVC13 target에 포함해야 합니다.",
);
assert.match(screenSource, /NCPMS SVC13/, "화면은 실제 적용 중인 API 출처를 표시해야 합니다.");
assert.match(
  screenSource,
  /생육단계 재선택 필요/,
  "기존 모호한 단계는 재선택 상태를 표시해야 합니다.",
);

console.log("pest photo-search farm-context screen contract tests passed");
