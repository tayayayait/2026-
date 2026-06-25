import type { FarmParcelSearchRequest } from "./parcel-search-contract";
import type { FarmParcelCandidateSearchResult } from "./types";

type RegionRequest = Extract<FarmParcelSearchRequest, { mode: "REGION" }>;

export type RegionCandidateSearchResponse =
  | { ok: true; data: FarmParcelCandidateSearchResult }
  | { ok: false; error: string };

interface RegionCandidateSearchInput {
  targetRegionCodes: string[];
  landCodes: RegionRequest["landCodes"];
  minAreaSquareMeter?: number;
  maxAreaSquareMeter?: number;
  search: (request: RegionRequest) => Promise<RegionCandidateSearchResponse>;
}

const requestForRegion = (
  input: RegionCandidateSearchInput,
  bjdCode: string,
  landCodes: RegionRequest["landCodes"],
): RegionRequest => ({
  mode: "REGION",
  bjdCode,
  landCodes,
  ...(input.minAreaSquareMeter === undefined
    ? {}
    : { minAreaSquareMeter: input.minAreaSquareMeter }),
  ...(input.maxAreaSquareMeter === undefined
    ? {}
    : { maxAreaSquareMeter: input.maxAreaSquareMeter }),
});

const notFoundResponse = (): RegionCandidateSearchResponse => ({
  ok: true,
  data: {
    status: "NOT_FOUND",
    candidates: [],
    warning: "선택한 읍면동의 하위 리에서 검색 조건에 맞는 팜맵 필지를 찾지 못했습니다.",
  },
});

export const searchFirstRegionWithCandidates = async (
  input: RegionCandidateSearchInput,
): Promise<RegionCandidateSearchResponse> => {
  if (input.targetRegionCodes.length === 0) {
    return { ok: false, error: "조회할 법정동코드가 없습니다." };
  }
  if (input.targetRegionCodes.length === 1) {
    return input.search(requestForRegion(input, input.targetRegionCodes[0]!, input.landCodes));
  }

  let firstError: string | null = null;
  let completedRequest = false;
  for (const landCode of input.landCodes) {
    const responses = await Promise.all(
      input.targetRegionCodes.map((bjdCode) =>
        input.search(requestForRegion(input, bjdCode, [landCode])),
      ),
    );
    const matchedIndex = responses.findIndex(
      (response) => response.ok && response.data.candidates.length > 0,
    );
    completedRequest ||= responses.some((response) => response.ok);
    firstError ??= responses.find((response) => !response.ok)?.error ?? null;
    if (matchedIndex < 0) continue;

    const matchedRegionCode = input.targetRegionCodes[matchedIndex]!;
    if (input.landCodes.length === 1) return responses[matchedIndex]!;
    return input.search(requestForRegion(input, matchedRegionCode, input.landCodes));
  }

  return completedRequest
    ? notFoundResponse()
    : { ok: false, error: firstError ?? "팜맵 지역 조회에 실패했습니다." };
};
