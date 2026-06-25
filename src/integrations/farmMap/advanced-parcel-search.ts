import type { FarmParcelSearchRequest } from "@/domains/farms/parcel-search-contract";
import type { FarmParcelCandidate, FarmParcelCandidateSearchResult } from "@/domains/farms/types";
import { readOptionalServerEnv, readServerEnv } from "@/integrations/openapi";
import { normalizeFarmMapCandidates, parseFarmMapJsonp } from "./farmmap-contract";
import {
  buildFarmMapAnalysisAreaUrl,
  buildFarmMapBjdLandUrl,
  buildFarmMapPnuSearchUrl,
  extractFarmMapPnus,
} from "./farmmap-search-contract";

type AdvancedSearchRequest = Extract<FarmParcelSearchRequest, { mode: "PNU" | "REGION" }>;
type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface FarmMapAdvancedSearchConfig {
  apiKey?: string;
  domain?: string;
  baseUrl?: string;
  fetcher?: FetchLike;
}

const resolveConfig = (config: FarmMapAdvancedSearchConfig) => ({
  apiKey: config.apiKey ?? readServerEnv({ source: "FARMMAP", names: ["FARMMAP_API_KEY"] }),
  domain:
    config.domain ??
    readServerEnv({ source: "FARMMAP", names: ["FARMMAP_API_DOMAIN", "FARMMAP_DOMAIN"] }),
  baseUrl:
    config.baseUrl ??
    readOptionalServerEnv({ source: "FARMMAP", names: ["FARMMAP_API_BASE_URL"] }) ??
    undefined,
  fetcher: config.fetcher ?? fetch,
});

const fetchPayload = async (url: string, fetcher: FetchLike) => {
  const response = await fetcher(url, {
    method: "GET",
    headers: { Accept: "application/json, text/plain" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`FarmMap API HTTP 오류: ${response.status}`);
  return parseFarmMapJsonp(await response.text());
};

const dedupeCandidates = (candidates: FarmParcelCandidate[]) =>
  Array.from(
    new Map(
      candidates.map((candidate) => [candidate.pnu ?? candidate.farmMapId, candidate]),
    ).values(),
  );

const landTypeByCode: Record<string, FarmParcelCandidate["cropLandType"]> = {
  "01": "논",
  "02": "밭",
  "03": "과수",
  "04": "시설",
};

const filterCandidatesByLandCodes = (
  candidates: FarmParcelCandidate[],
  landCodes: string[],
) => {
  const allowedTypes = new Set(
    landCodes.map((landCode) => landTypeByCode[landCode]).filter(Boolean),
  );
  if (allowedTypes.size === 0) return candidates;
  return candidates.filter((candidate) => allowedTypes.has(candidate.cropLandType));
};

const toResult = (candidates: FarmParcelCandidate[]): FarmParcelCandidateSearchResult => ({
  status: candidates.length > 0 ? "SUCCESS" : "NOT_FOUND",
  candidates: dedupeCandidates(candidates),
  warning: candidates.length > 0 ? null : "검색 조건에 맞는 팜맵 필지가 없습니다.",
});

const searchByPnu = async (pnu: string, config: ReturnType<typeof resolveConfig>) => {
  const url = buildFarmMapPnuSearchUrl(config.apiKey, config.domain, pnu, config.baseUrl);
  const payload = await fetchPayload(url, config.fetcher);
  return normalizeFarmMapCandidates(payload);
};

const searchRegionByLand = async (
  request: Extract<AdvancedSearchRequest, { mode: "REGION" }>,
  config: ReturnType<typeof resolveConfig>,
) => {
  const payloads = await Promise.all(
    request.landCodes.map((landCode) =>
      fetchPayload(
        buildFarmMapBjdLandUrl(
          config.apiKey,
          config.domain,
          { bjdCode: request.bjdCode, landCode },
          config.baseUrl,
        ),
        config.fetcher,
      ),
    ),
  );
  return filterCandidatesByLandCodes(
    payloads.flatMap((payload) => normalizeFarmMapCandidates(payload)),
    request.landCodes,
  );
};

const searchRegionByArea = async (
  request: Extract<AdvancedSearchRequest, { mode: "REGION" }>,
  config: ReturnType<typeof resolveConfig>,
) => {
  try {
    const analysisUrl = buildFarmMapAnalysisAreaUrl(
      config.apiKey,
      config.domain,
      request,
      config.baseUrl,
    );
    const analysisPayload = await fetchPayload(analysisUrl, config.fetcher);
    const pnus = extractFarmMapPnus(analysisPayload);
    const details = await Promise.all(pnus.map((pnu) => searchByPnu(pnu, config)));
    return filterCandidatesByLandCodes(details.flat(), request.landCodes);
  } catch {
    const candidates = await searchRegionByLand(request, config);
    return candidates.filter((candidate) => {
      if (
        request.minAreaSquareMeter !== undefined &&
        candidate.areaSquareMeter < request.minAreaSquareMeter
      ) {
        return false;
      }
      if (
        request.maxAreaSquareMeter !== undefined &&
        candidate.areaSquareMeter > request.maxAreaSquareMeter
      ) {
        return false;
      }
      return true;
    });
  }
};

export const searchAdvancedFarmMapParcels = async (
  request: AdvancedSearchRequest,
  config: FarmMapAdvancedSearchConfig = {},
): Promise<FarmParcelCandidateSearchResult> => {
  const resolved = resolveConfig(config);
  if (request.mode === "PNU") return toResult(await searchByPnu(request.pnu, resolved));

  const hasAreaFilter =
    request.minAreaSquareMeter !== undefined || request.maxAreaSquareMeter !== undefined;
  const candidates = hasAreaFilter
    ? await searchRegionByArea(request, resolved)
    : await searchRegionByLand(request, resolved);
  return toResult(candidates);
};
