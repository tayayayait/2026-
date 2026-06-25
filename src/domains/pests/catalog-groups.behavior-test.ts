import assert from "node:assert/strict";
import type { NcpmsPest } from "../../integrations/ncpms/disease";
import { filterPestCatalogGroups, groupPestCatalog, summarizePestCatalog } from "./catalog-groups";

const pests: NcpmsPest[] = [
  {
    id: "D1",
    name: "갈색무늬병",
    type: "DISEASE",
    crop: "사과",
    scientificName: "Diplocarpon mali",
  },
  {
    id: "D2",
    name: " 갈색무늬병 ",
    type: "DISEASE",
    crop: "사과",
    scientificName: "Marssonia blotch",
  },
  {
    id: "D3",
    name: "갈색무늬병",
    type: "DISEASE",
    crop: "사과",
    scientificName: "Diplocarpon mali",
  },
  {
    id: "I1",
    name: "복숭아순나방",
    type: "INSECT",
    crop: "사과",
    scientificName: "molesta",
  },
  {
    id: "I2",
    name: "갈색무늬병",
    type: "INSECT",
    crop: "사과",
  },
];

const groups = groupPestCatalog(pests);

assert.equal(groups.length, 3, "같은 유형과 한글명은 하나의 표시 그룹으로 묶어야 합니다.");

const diseaseGroup = groups.find(
  (group) => group.type === "DISEASE" && group.name === "갈색무늬병",
);
assert.ok(diseaseGroup, "병 그룹이 생성되어야 합니다.");
assert.deepEqual(
  diseaseGroup.aliases,
  ["Diplocarpon mali", "Marssonia blotch"],
  "학명·영문명은 중복 없이 원본 순서로 보존해야 합니다.",
);
assert.equal(diseaseGroup.recordCount, 3, "그룹은 원본 레코드 수를 보존해야 합니다.");

const summary = summarizePestCatalog(groups, pests.length);
assert.deepEqual(
  summary,
  { rawCount: 5, totalCount: 3, diseaseCount: 1, insectCount: 2, weedCount: 0 },
  "요약은 원본 건수와 유형별 고유 그룹 수를 구분해야 합니다.",
);

assert.equal(
  filterPestCatalogGroups(groups, { query: "molesta", type: "ALL" }).length,
  1,
  "검색은 학명·영문명까지 포함해야 합니다.",
);
assert.equal(
  filterPestCatalogGroups(groups, { query: "", type: "DISEASE" }).length,
  1,
  "유형 필터는 병·해충·잡초 그룹에 공통 적용되어야 합니다.",
);

console.log("pest catalog grouping behavior tests passed");
