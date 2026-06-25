import { buildOpenApiUrl } from "@/integrations/openapi";

const DEFAULT_FARMMAP_BASE_URL = "https://agis.epis.or.kr/ASD";

interface BjdLandRequest {
  bjdCode: string;
  landCode: string;
}

interface AreaAnalysisRequest {
  bjdCode: string;
  landCodes: string[];
  minAreaSquareMeter?: number;
  maxAreaSquareMeter?: number;
}

const endpoint = (baseUrl: string, path: string) => `${baseUrl.replace(/\/$/, "")}/${path}`;

const authenticationParams = (apiKey: string, domain: string) => ({ apiKey, domain });

export const buildFarmMapPnuSearchUrl = (
  apiKey: string,
  domain: string,
  pnu: string,
  baseUrl = DEFAULT_FARMMAP_BASE_URL,
) =>
  buildOpenApiUrl(endpoint(baseUrl, "farmmapApi/getFarmmapDataSeachPnu.do"), {
    ...authenticationParams(apiKey, domain),
    pnu,
    columnType: "KOR",
  });

export const buildFarmMapBjdLandUrl = (
  apiKey: string,
  domain: string,
  request: BjdLandRequest,
  baseUrl = DEFAULT_FARMMAP_BASE_URL,
) =>
  buildOpenApiUrl(endpoint(baseUrl, "farmmapApi/getFarmmapDataSeachBjdAndLandCode.do"), {
    ...authenticationParams(apiKey, domain),
    bjdCd: request.bjdCode,
    landCd: request.landCode,
    mapType: "farmmap",
    apiVersion: "v2",
    columnType: "KOR",
  });

export const buildFarmMapAnalysisAreaUrl = (
  apiKey: string,
  domain: string,
  request: AreaAnalysisRequest,
  baseUrl = DEFAULT_FARMMAP_BASE_URL,
) =>
  buildOpenApiUrl(endpoint(baseUrl, "farmmapApi/getFarmmapDataSeachAnalysisBaseAttr.do"), {
    ...authenticationParams(apiKey, domain),
    bjdCd: request.bjdCode,
    landCd: request.landCodes.join(","),
    fromBaseArea: request.minAreaSquareMeter,
    toBaseArea: request.maxAreaSquareMeter,
    columnType: "KOR",
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const collectPnus = (value: unknown, depth = 0): string[] => {
  if (depth > 8 || value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap((item) => collectPnus(item, depth + 1));
  if (!isRecord(value)) return [];

  const direct = Object.entries(value)
    .filter(([key]) => ["pnu", "대표pnu", "필지고유번호", "부pnu"].includes(key.toLowerCase()))
    .map(([, child]) => String(child))
    .filter((pnu) => /^\d{19}$/.test(pnu));
  return [...direct, ...Object.values(value).flatMap((child) => collectPnus(child, depth + 1))];
};

export const extractFarmMapPnus = (payload: unknown) =>
  Array.from(new Set(collectPnus(payload)));
