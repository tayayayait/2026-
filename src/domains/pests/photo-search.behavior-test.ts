import type { NcpmsPhotoCandidate } from "../../integrations/ncpms/photo-search";
import { enrichPhotoDetailPanel, resolveNcpmsPhotoDetailRequest } from "./photo-search";
import {
  createPhotoCandidateSearchTarget,
  findNcpmsPhotoCropMatch,
  loadPhotoCandidatesWithGrowthStageFallback,
  mergePhotoSearchPages,
  resolvePhotoCandidatePestNameFilter,
  resolveNcpmsPhotoCropSearchContext,
  resolveNcpmsPhotoCropContext,
} from "./photo-search-flow";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const candidate = (
  category: NcpmsPhotoCandidate["category"],
  detailServiceCode: NcpmsPhotoCandidate["detailServiceCode"],
): NcpmsPhotoCandidate => ({
  id: "P1",
  name: "후보",
  category,
  type:
    detailServiceCode === "SVC05" ? "DISEASE" : detailServiceCode === "SVC10" ? "WEED" : "INSECT",
  detailServiceCode,
  detailSupported: ["SVC05", "SVC07", "SVC08", "SVC10", "SVC15"].includes(detailServiceCode),
  imageUrl: "https://example.test/photo.jpg",
});

const diseaseRequest = resolveNcpmsPhotoDetailRequest(candidate("병생태", "SVC05"), "벼");
assert(diseaseRequest?.detailType === "DISEASE", "disease photo must connect to SVC05 detail");
assert(diseaseRequest?.detailServiceCode === "SVC05", "disease photo detailServiceCode must be SVC05");

const insectRequest = resolveNcpmsPhotoDetailRequest(candidate("해충생태", "SVC07"), "벼");
assert(insectRequest?.detailType === "INSECT", "insect photo must connect to SVC07 detail");
assert(insectRequest?.detailServiceCode === "SVC07", "insect photo detailServiceCode must be SVC07");

const weedRequest = resolveNcpmsPhotoDetailRequest(candidate("잡초", "SVC10"), "");
assert(weedRequest?.detailType === "WEED", "weed photo must connect to SVC10 detail");
assert(weedRequest?.detailServiceCode === "SVC10", "weed photo detailServiceCode must be SVC10");

const generalInsectRequest = resolveNcpmsPhotoDetailRequest(candidate("곤충", "SVC08"), "벼");
assert(generalInsectRequest !== null, "SVC08 곤충 candidate must be supported");
assert(generalInsectRequest?.detailType === "INSECT", "SVC08 곤충 must map to INSECT detail type");
assert(generalInsectRequest?.detailServiceCode === "SVC08", "SVC08 곤충 must preserve its service code");

const naturalEnemyRequest = resolveNcpmsPhotoDetailRequest(candidate("천적곤충", "SVC15"), "벼");
assert(naturalEnemyRequest !== null, "SVC15 천적곤충 candidate must be supported");
assert(naturalEnemyRequest?.detailType === "INSECT", "SVC15 천적곤충 must map to INSECT detail type");
assert(naturalEnemyRequest?.detailServiceCode === "SVC15", "SVC15 천적곤충 must preserve its service code");

const enrichedDetail = enrichPhotoDetailPanel(candidate("병생태", "SVC05"), "감자", {
  id: "P1",
  type: "DISEASE",
  title: "P1",
  crop: "",
  primaryLabel: "증상",
  primaryText: "증상 정보 없음",
  secondaryLabel: "발생환경",
  secondaryText: "발생환경 정보 없음",
  additionalDetails: [],
});
assert(enrichedDetail.title === "후보", "photo detail must fall back to the candidate name");
assert(enrichedDetail.crop === "감자", "photo detail must fall back to the selected crop");
assert(
  enrichedDetail.imageUrl === "https://example.test/photo.jpg",
  "photo detail must fall back to the candidate image",
);

const weedTarget = createPhotoCandidateSearchTarget({ code: "6", name: "잡초" }, null);
assert(weedTarget?.cropSectionCode === "6", "weed section must search SVC13 by cropSectionCode");
assert(!weedTarget?.cropCode, "weed section search must omit cropCode");

const missingCropTarget = createPhotoCandidateSearchTarget({ code: "1", name: "식량작물" }, null);
assert(missingCropTarget === null, "non-weed sections must wait for crop selection");

const cropTarget = createPhotoCandidateSearchTarget(
  { code: "1", name: "식량작물" },
  { code: "FC050501", name: "감자" },
  "18602",
);
assert(cropTarget?.cropCode === "FC050501", "crop candidate search must use selected cropCode");
assert(
  cropTarget?.categoryCode === "18602",
  "farm growth stage must be sent as the SVC13 categoryCode",
);

const weedTargetWithStage = createPhotoCandidateSearchTarget(
  { code: "6", name: "잡초" },
  null,
  "18604",
);
assert(
  !weedTargetWithStage?.categoryCode,
  "growth-stage categoryCode must not be applied to weed searches",
);

const fallbackRequests: string[] = [];
const fallbackCandidates = await loadPhotoCandidatesWithGrowthStageFallback(
  { cropCode: "FC050549", categoryCode: "18601", startPoint: 1 },
  async (options) => {
    fallbackRequests.push(options.categoryCode ?? "all");
    return options.categoryCode
      ? { items: [], startPoint: 1, displayCount: 0, totalCount: 0 }
      : { items: [candidate("disease", "SVC05")], startPoint: 1, displayCount: 1, totalCount: 1 };
  },
);
assert(fallbackCandidates.page.items.length === 1, "empty stage candidates must retry all stages");
assert(fallbackCandidates.usedGrowthStageFallback, "stage fallback must be reported");
assert(
  fallbackRequests.join(",") === "18601,all",
  "stage fallback must retry once without categoryCode",
);

const namedSearchRequests: string[] = [];
const namedSearchCandidates = await loadPhotoCandidatesWithGrowthStageFallback(
  { cropCode: "FC050549", categoryCode: "18601", pestName: "downy mildew", startPoint: 1 },
  async (options) => {
    namedSearchRequests.push(options.categoryCode ?? "all");
    return { items: [], startPoint: 1, displayCount: 0, totalCount: 0 };
  },
);
assert(namedSearchCandidates.page.items.length === 0, "explicit pestName search must stay filtered");
assert(
  namedSearchRequests.join(",") === "18601",
  "explicit pestName search must not retry all stages",
);

assert(
  resolvePhotoCandidatePestNameFilter("pea", { name: "pea" }) === "",
  "crop-name searches must not be resent as SVC13 pestName filters",
);
assert(
  resolvePhotoCandidatePestNameFilter("downy mildew", { name: "pea" }) === "downy mildew",
  "actual pest-name searches must remain SVC13 pestName filters",
);

const cropMatch = findNcpmsPhotoCropMatch(
  [
    { code: "FC010101", name: "논벼" },
    { code: "FC050501", name: "감자" },
  ],
  "벼",
);
assert(cropMatch?.code === "FC010101", "farm rice must match the NCPMS paddy-rice crop");
assert(
  findNcpmsPhotoCropMatch([{ code: "FC050501", name: "감자" }], "사과") === null,
  "unrelated crop names must not be guessed",
);

const requestedSections: string[] = [];
const resolvedContext = await resolveNcpmsPhotoCropContext(
  [
    { code: "1", name: "식량작물" },
    { code: "5", name: "채소" },
    { code: "6", name: "잡초" },
  ],
  "감자",
  async ({ cropSectionCode }) => {
    requestedSections.push(cropSectionCode);
    return {
      items:
        cropSectionCode === "5" ? [{ code: "FC050501", name: "감자" }] : [],
      startPoint: 1,
      displayCount: 10,
      totalCount: cropSectionCode === "5" ? 1 : 0,
    };
  },
);
assert(resolvedContext?.section.code === "5", "farm crop context must retain its NCPMS section");
assert(resolvedContext?.crop.code === "FC050501", "farm crop context must retain its NCPMS crop");
assert(
  requestedSections.sort().join(",") === "1,5",
  "first crop pages must be loaded for non-weed sections only",
);

const cropSearchRequests: string[] = [];
const searchedContext = await resolveNcpmsPhotoCropSearchContext(
  [
    { code: "1", name: "fruit" },
    { code: "5", name: "vegetables" },
    { code: "6", name: "weeds" },
  ],
  "scallion",
  async ({ cropSectionCode, startPoint }) => {
    cropSearchRequests.push(`${cropSectionCode}:${startPoint ?? 1}`);
    if (cropSectionCode === "1") {
      return {
        items: [{ code: "FC010101", name: "apple" }],
        startPoint: 1,
        displayCount: 1,
        totalCount: 1,
      };
    }
    if (cropSectionCode === "5" && startPoint === 2) {
      return {
        items: [{ code: "FC050502", name: "scallion" }],
        startPoint: 2,
        displayCount: 1,
        totalCount: 2,
      };
    }
    return {
      items: [{ code: "FC050501", name: "pepper" }],
      startPoint: 1,
      displayCount: 1,
      totalCount: 2,
    };
  },
);
assert(searchedContext?.section.code === "5", "crop search must move to the matched section");
assert(searchedContext?.crop.code === "FC050502", "crop search must select the matched crop");
assert(
  cropSearchRequests.join(",") === "1:1,5:1,5:2",
  "crop search must page through non-weed crop sections only until a match is found",
);

const exactPriorityContext = await resolveNcpmsPhotoCropSearchContext(
  [
    { code: "2", name: "fruit" },
    { code: "5", name: "vegetables" },
  ],
  "pea",
  async ({ cropSectionCode }) => ({
    items:
      cropSectionCode === "2"
        ? [{ code: "FC020101", name: "snow pea" }]
        : [{ code: "FC050501", name: "pea" }],
    startPoint: 1,
    displayCount: 1,
    totalCount: 1,
  }),
);
assert(
  exactPriorityContext?.crop.code === "FC050501",
  "exact crop search matches must take priority over earlier partial matches",
);

const mergedPage = mergePhotoSearchPages(
  { items: [{ code: "A", name: "first" }], startPoint: 1, displayCount: 1, totalCount: 2 },
  {
    items: [
      { code: "A", name: "duplicate" },
      { code: "B", name: "second" },
    ],
    startPoint: 2,
    displayCount: 1,
    totalCount: 2,
  },
  (item) => item.code,
);
assert(mergedPage.items.length === 2, "photo page merge must dedupe items by key");
assert(mergedPage.items[0]?.name === "first", "photo page merge must keep existing item order");

console.log("pest photo search behavior tests passed");
