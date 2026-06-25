import { buildOpenApiUrl, readOptionalServerEnv } from "../openapi";
import {
  normalizeNcpmsPhotoCandidates,
  normalizeNcpmsPhotoCrops,
  normalizeNcpmsPhotoSections,
} from "./photo-search-normalizer";
import type {
  NcpmsPhotoCandidate,
  NcpmsPhotoCandidatesOptions,
  NcpmsPhotoCrop,
  NcpmsPhotoCropsOptions,
  NcpmsPhotoSearchPage,
  NcpmsPhotoSection,
} from "./photo-search.types";
import { isNcpmsGrowthStageCode } from "./growth-stage";

const NCPMS_SERVICE_URL = "http://ncpms.rda.go.kr/npmsAPI/service";

const buildPhotoSearchUrl = (
  apiKey: string,
  serviceCode: "SVC11" | "SVC12" | "SVC13",
  params: Record<string, string | number | undefined> = {},
) => buildOpenApiUrl(NCPMS_SERVICE_URL, { apiKey, serviceCode, ...params });

const emptyPage = <T>(startPoint = 1): NcpmsPhotoSearchPage<T> => ({
  items: [],
  startPoint,
  displayCount: 0,
  totalCount: 0,
});

const readApiKey = () => readOptionalServerEnv({ source: "NCPMS", names: ["NCPMS_API_KEY"] });

const fetchPhotoSearchResponse = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`NCPMS photo search API Error: ${response.status}`);
  return response.text();
};

const validateCandidateTarget = (options: NcpmsPhotoCandidatesOptions) => {
  const hasCropCode = Boolean(options.cropCode);
  const hasWeedSection = options.cropSectionCode === "6";
  if (hasCropCode === hasWeedSection) {
    throw new Error("SVC13 requires either cropCode or cropSectionCode=6");
  }
  if (options.categoryCode && !isNcpmsGrowthStageCode(options.categoryCode)) {
    throw new Error("SVC13 categoryCode must be a documented NCPMS growth-stage code");
  }
};

export const buildNcpmsPhotoSectionsUrl = (apiKey: string) => buildPhotoSearchUrl(apiKey, "SVC11");

export const buildNcpmsPhotoCropsUrl = (apiKey: string, options: NcpmsPhotoCropsOptions) =>
  buildPhotoSearchUrl(apiKey, "SVC12", {
    cropSectionCode: options.cropSectionCode,
    startPoint: options.startPoint,
  });

export const buildNcpmsPhotoCandidatesUrl = (
  apiKey: string,
  options: NcpmsPhotoCandidatesOptions,
) => {
  validateCandidateTarget(options);
  return buildPhotoSearchUrl(apiKey, "SVC13", {
    cropCode: options.cropCode,
    cropSectionCode: options.cropSectionCode,
    categoryCode: options.categoryCode,
    partName: options.partName,
    pestName: options.pestName,
    startPoint: options.startPoint,
  });
};

export const fetchNcpmsPhotoSections = async (): Promise<
  NcpmsPhotoSearchPage<NcpmsPhotoSection>
> => {
  const apiKey = readApiKey();
  if (!apiKey) return emptyPage();
  const response = await fetchPhotoSearchResponse(buildNcpmsPhotoSectionsUrl(apiKey));
  return normalizeNcpmsPhotoSections(response);
};

export const fetchNcpmsPhotoCrops = async (
  options: NcpmsPhotoCropsOptions,
): Promise<NcpmsPhotoSearchPage<NcpmsPhotoCrop>> => {
  const apiKey = readApiKey();
  if (!apiKey) return emptyPage(options.startPoint);
  const response = await fetchPhotoSearchResponse(buildNcpmsPhotoCropsUrl(apiKey, options));
  return normalizeNcpmsPhotoCrops(response);
};

export const fetchNcpmsPhotoCandidates = async (
  options: NcpmsPhotoCandidatesOptions,
): Promise<NcpmsPhotoSearchPage<NcpmsPhotoCandidate>> => {
  validateCandidateTarget(options);
  const apiKey = readApiKey();
  if (!apiKey) return emptyPage(options.startPoint);
  const response = await fetchPhotoSearchResponse(buildNcpmsPhotoCandidatesUrl(apiKey, options));
  return normalizeNcpmsPhotoCandidates(response);
};

export { normalizeNcpmsPhotoCandidates, normalizeNcpmsPhotoCrops, normalizeNcpmsPhotoSections };
export type {
  NcpmsPhotoCandidate,
  NcpmsPhotoCandidatesOptions,
  NcpmsPhotoCrop,
  NcpmsPhotoCropsOptions,
  NcpmsPhotoDetailServiceCode,
  NcpmsPhotoSearchPage,
  NcpmsPhotoSection,
} from "./photo-search.types";
