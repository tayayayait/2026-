import assert from "node:assert/strict";
import type { FarmParcelSearchRequest } from "./parcel-search-contract";
import type { FarmParcelCandidate } from "./types";

const module = await import("./region-candidate-search").catch(() => ({}));
const searchFirstRegionWithCandidates = Reflect.get(module, "searchFirstRegionWithCandidates") as
  | ((input: {
      targetRegionCodes: string[];
      landCodes: Array<"01" | "02" | "03" | "04">;
      minAreaSquareMeter?: number;
      maxAreaSquareMeter?: number;
      search: (request: Extract<FarmParcelSearchRequest, { mode: "REGION" }>) => Promise<unknown>;
    }) => Promise<{ ok: boolean; data?: { candidates: FarmParcelCandidate[] } }>)
  | undefined;

assert.equal(
  typeof searchFirstRegionWithCandidates,
  "function",
  "multi-ri region search use case must exist",
);

const candidate = {
  farmMapId: "farmmap-5221025024100060000",
  pnu: "5221025024100060000",
  representativeAddress: "전북특별자치도 김제시 만경읍 송상리",
  legalDongAddress: "전북특별자치도 김제시 만경읍 송상리",
  landCategory: "답",
  cropLandType: "논",
  areaSquareMeter: 2046,
  cultivatedAreaSquareMeter: null,
  cultivationRatio: null,
  cadastralMatchRate: null,
  aerialPhotoYear: null,
  updatedYear: "2024",
  geometry: null,
  centroid: { lat: 35.85, lng: 126.82 },
  source: "FARMMAP",
  raw: null,
} satisfies FarmParcelCandidate;

const requests: Array<Extract<FarmParcelSearchRequest, { mode: "REGION" }>> = [];
const result = await searchFirstRegionWithCandidates!({
  targetRegionCodes: ["5221025021", "5221025024"],
  landCodes: ["01", "02"],
  search: async (request) => {
    requests.push(request);
    const isMatchedRi = request.bjdCode === "5221025024";
    const isRiceOnly = request.landCodes.length === 1 && request.landCodes[0] === "01";
    const candidates =
      isMatchedRi && (isRiceOnly || request.landCodes.length === 2) ? [candidate] : [];
    return {
      ok: true,
      data: {
        status: candidates.length > 0 ? "SUCCESS" : "NOT_FOUND",
        candidates,
        warning: candidates.length > 0 ? null : "검색 결과 없음",
      },
    };
  },
});

assert.equal(result.ok, true);
assert.equal(result.data?.candidates[0]?.pnu, candidate.pnu);
assert.equal(requests.length, 3);
assert.deepEqual(requests[0]?.landCodes, ["01"]);
assert.deepEqual(requests[1]?.landCodes, ["01"]);
assert.deepEqual(requests[2]?.landCodes, ["01", "02"]);
assert.equal(requests[2]?.bjdCode, "5221025024");

console.log("multi-ri FarmMap region search behavior tests passed");
