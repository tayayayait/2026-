import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (path: string) => {
  try {
    return readFileSync(new URL(path, import.meta.url), "utf8");
  } catch {
    return "";
  }
};

const routeSource = readSource("../../routes/farms.new.tsx");
const regionSearchSource = readSource("./region-candidate-search.ts");
const searchPanelSource = readSource("../../components/farm-registration-search-panel.tsx");
const formPanelSource = readSource("../../components/farm-registration-form-panel.tsx");
const selectionPanelSource = readSource("../../components/farm-registration-selection-panel.tsx");
const candidateListSource = readSource("../../components/farm-parcel-candidate-list.tsx");

assert.match(
  routeSource,
  /searchStandardRegionCodes/,
  "필지 등록 라우트는 법정동 검색 API를 사용해야 합니다.",
);
assert.match(
  routeSource,
  /getStandardRegionTree/,
  "필지 등록 라우트는 법정동 계층 API를 사용해야 합니다.",
);
assert.match(
  routeSource,
  /searchFarmParcelCandidates/,
  "필지 등록 라우트는 팜맵 통합 검색 API를 사용해야 합니다.",
);
assert.match(routeSource, /mode:\s*"PNU"/, "PNU 검색 요청을 연결해야 합니다.");
assert.match(
  `${routeSource}\n${regionSearchSource}`,
  /mode:\s*"REGION"/,
  "지역 조건 검색 요청을 연결해야 합니다.",
);
assert.match(routeSource, /mode:\s*"POINT"/, "지도 클릭 검색 요청을 연결해야 합니다.");

assert.match(
  searchPanelSource,
  /법정동\+지번/,
  "주소 탭에 법정동과 지번 입력 흐름이 있어야 합니다.",
);
assert.match(searchPanelSource, /PNU 19자리/, "주소 탭에 직접 PNU 조회 흐름이 있어야 합니다.");
assert.match(searchPanelSource, /지역 조건/, "시도·시군구·읍면동·리 지역 조건 탭이 있어야 합니다.");
assert.match(searchPanelSource, /필지 목록/, "팜맵 후보 필지 목록이 있어야 합니다.");

assert.match(selectionPanelSource, /선택 필지 정보/, "선택 필지 요약을 표시해야 합니다.");
assert.match(selectionPanelSource, /지역/, "선택 필지 요약에는 저장될 지역을 표시해야 합니다.");
assert.match(
  `${routeSource}\n${selectionPanelSource}`,
  /extractFarmRegion/,
  "필지 등록은 주소 정규식 대신 공통 지역 추출 helper를 사용해야 합니다.",
);
assert.match(
  selectionPanelSource,
  /NCPMS_GROWTH_STAGES/,
  "생육 단계는 NCPMS 공식 코드 사전을 사용해야 합니다.",
);
assert.match(
  selectionPanelSource,
  /<option className="text-stone-900" value="" disabled hidden>\s*<\/option>/,
  "생육 단계 placeholder는 비어 있는 상태로 렌더되어야 합니다.",
);
assert.match(
  formPanelSource,
  /<option value="" disabled hidden>\s*<\/option>/,
  "생육 단계 placeholder는 비어 있는 상태로 렌더되어야 합니다.",
);
assert.doesNotMatch(
  `${selectionPanelSource}\n${formPanelSource}`,
  /생육 단계 선택/,
  "생육 단계 placeholder 문구는 더 이상 표시되면 안 됩니다.",
);
assert.match(
  selectionPanelSource,
  /선택한 필지 등록/,
  "선택 필지를 농장으로 등록할 수 있어야 합니다.",
);
assert.match(
  routeSource,
  /clearParcelSearchResults/,
  "검색 실패 시 이전 필지 후보를 제거해야 합니다.",
);
assert.match(
  routeSource,
  /handleClassificationChange/,
  "경지 구분 변경 시 이전 필지 검색 결과를 제거해야 합니다.",
);
assert.match(
  candidateListSource,
  /경지 유형/,
  "필지 목록은 각 후보의 논·밭·과수·시설 유형을 우측 배지로 표시해야 합니다.",
);
assert.match(
  searchPanelSource,
  /5221025024100060000/,
  "직접 PNU 입력 예시는 실호출 검증된 필지를 사용해야 합니다.",
);

console.log("farm registration phase3 screen contract tests passed");
