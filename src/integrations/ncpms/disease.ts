import { z } from "zod";
import { buildOpenApiUrl, extractXmlRows, extractXmlTag, readOptionalServerEnv } from "../openapi";
import { selectNcpmsCropSearchResult } from "./crop-search-result";
import type { NcpmsCropSearchResult } from "./crop-search-result";
import { matchesCropName } from "../../domains/farms/crop-name";

export { selectNcpmsCropSearchResult } from "./crop-search-result";

const NCPMS_SERVICE_URL = "http://ncpms.rda.go.kr/npmsAPI/service";

export const NcpmsPestSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["DISEASE", "INSECT", "WEED"]),
  crop: z.string(),
  scientificName: z.string().optional(),
  symptoms: z.string().optional(),
  imageUrl: z.string().optional(),
});

export type NcpmsPest = z.infer<typeof NcpmsPestSchema>;

export interface NcpmsDiseaseDetail {
  id: string;
  crop: string;
  name: string;
  symptoms?: string;
  developmentCondition?: string;
  preventionMethod?: string;
  imageUrls: string[];
}

export interface NcpmsInsectDetail {
  id: string;
  crop: string;
  name: string;
  ecologyInfo?: string;
  damageInfo?: string;
  preventMethod?: string;
  imageUrls: string[];
}

export interface NcpmsWeedDetail {
  id: string;
  crop: string;
  name: string;
  scientificName?: string;
  family?: string;
  japaneseName?: string;
  englishName?: string;
  shape?: string;
  ecology?: string;
  habitat?: string;
  literature?: string;
  imageUrls: string[];
}

interface NcpmsSearchOptions {
  startPoint?: number;
  displayCount?: number;
  cropName?: string;
  searchName?: string;
}

const stripHtml = (value: string | undefined) =>
  (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeNcpmsAssetUrl = (value: string | undefined) => {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    if (url.hostname === "ncpms.rda.go.kr") url.protocol = "https:";
    return url.toString();
  } catch {
    return value;
  }
};

const readSearchId = (detailUrl: string, fallback: string) => {
  try {
    const url = new URL(detailUrl);
    return (
      url.searchParams.get("sickKey") ||
      url.searchParams.get("insectKey") ||
      url.searchParams.get("weedsKey") ||
      url.searchParams.get("weedKey") ||
      url.searchParams.get("pestKey") ||
      fallback
    );
  } catch {
    return fallback;
  }
};

const inferPestType = (divName: string, detailUrl: string): NcpmsPest["type"] => {
  if (divName.includes("잡초")) return "WEED";
  if (divName.includes("해충") || divName.includes("곤충") || detailUrl.includes("insectKey")) {
    return "INSECT";
  }
  return "DISEASE";
};

const NCPMS_ERROR_MAP: Record<string, string> = {
  ERR_101: "인증키를 입력하지 않은 경우 발생",
  ERR_102: "병해충관리시스템 관리자가 요청자의 서비스를 중지시킨 경우 발생",
  ERR_103: "서비스코드를 잘못 입력하였을 경우 발생",
  ERR_104: "요청한 서비스를 수행할 권한이 없는 경우 발생",
  ERR_105: "인증받지 않은 도메인인 경우 발생",
  ERR_201: "서비스 수행에 필요한 파라미터가 없거나 잘못된 경우 발생",
  ERR_901: "병해충관리시스템에서 오류가 발생한 경우 발생",
};

const ensureNcpmsXmlSuccess = (xml: string) => {
  const errorCode = extractXmlTag(xml, "errorCode");
  if (!errorCode) return;

  const mappedMsg = NCPMS_ERROR_MAP[errorCode];
  const xmlMsg = extractXmlTag(xml, "errorMsg");
  const finalMsg = mappedMsg
    ? `${mappedMsg} (${xmlMsg || errorCode})`
    : xmlMsg || "NCPMS API error";

  throw new Error(`[NCPMS] ${errorCode}: ${finalMsg}`);
};

const imageUrlsFromXml = (xml: string): string[] => {
  const imageListXml = extractXmlTag(xml, "imageList");
  if (!imageListXml) return [];

  return extractXmlRows(imageListXml)
    .map((row) => row.image || row.imageUrl || row.imgUrl || row.oriImg || row.thumbImg || "")
    .map(normalizeNcpmsAssetUrl)
    .filter((url): url is string => Boolean(url));
};

export const buildNcpmsServiceUrl = (
  apiKey: string,
  params: Record<string, string | number | undefined>,
) => buildOpenApiUrl(NCPMS_SERVICE_URL, { apiKey, ...params });

export const buildNcpmsIntegratedSearchUrl = (apiKey: string, options: NcpmsSearchOptions = {}) =>
  buildNcpmsServiceUrl(apiKey, {
    serviceCode: "SVC16",
    serviceType: "AA001",
    startPoint: options.startPoint,
    displayCount: options.displayCount || 200,
    cropName: options.cropName,
    searchName: options.searchName,
  });

export const buildNcpmsDiseaseDetailUrl = (apiKey: string, sickKey: string) =>
  buildNcpmsServiceUrl(apiKey, { serviceCode: "SVC05", sickKey });

export const buildNcpmsInsectDetailUrl = (apiKey: string, insectKey: string) =>
  buildNcpmsServiceUrl(apiKey, { serviceCode: "SVC07", insectKey });

export const buildNcpmsInsectInfoDetailUrl = (apiKey: string, insectKey: string) =>
  buildNcpmsServiceUrl(apiKey, { serviceCode: "SVC08", insectKey });

export const buildNcpmsNaturalEnemyDetailUrl = (apiKey: string, insectKey: string) =>
  buildNcpmsServiceUrl(apiKey, { serviceCode: "SVC15", insectKey });

export const buildNcpmsWeedDetailUrl = (apiKey: string, weedsKey: string) =>
  buildNcpmsServiceUrl(apiKey, { serviceCode: "SVC10", weedsKey });

export const normalizeNcpmsSearchXml = (xml: string, cropFilter?: string): NcpmsPest[] => {
  ensureNcpmsXmlSuccess(xml);

  return extractXmlRows(xml)
    .map((row) => {
      const detailUrl = row.detailUrl || "";
      const name = stripHtml(row.korName || row.oprName || row.divName);
      const crop = stripHtml(row.cropName);
      if (!name || !crop) return null;
      if (cropFilter && !matchesCropName(cropFilter, crop)) return null;

      return NcpmsPestSchema.parse({
        id: readSearchId(detailUrl, `${crop}-${name}`),
        type: inferPestType(row.divName || "", detailUrl),
        name,
        scientificName: stripHtml(row.oprName),
        crop,
        imageUrl: normalizeNcpmsAssetUrl(row.thumbImg),
      });
    })
    .filter((item): item is NcpmsPest => item !== null);
};

export const normalizeNcpmsDiseaseDetailXml = (
  xml: string,
  sickKey: string,
): NcpmsDiseaseDetail => {
  ensureNcpmsXmlSuccess(xml);
  const name = extractXmlTag(xml, "sickNameKor") || extractXmlTag(xml, "sickNameEng") || sickKey;

  return {
    id: sickKey,
    crop: extractXmlTag(xml, "cropName") || "",
    name,
    symptoms: stripHtml(extractXmlTag(xml, "symptoms") || undefined),
    developmentCondition: stripHtml(extractXmlTag(xml, "developmentCondition") || undefined),
    preventionMethod: stripHtml(extractXmlTag(xml, "preventionMethod") || undefined),
    imageUrls: imageUrlsFromXml(xml),
  };
};

export const normalizeNcpmsInsectDetailXml = (
  xml: string,
  insectKey: string,
): NcpmsInsectDetail => {
  ensureNcpmsXmlSuccess(xml);
  const name =
    extractXmlTag(xml, "insectSpeciesKor") || extractXmlTag(xml, "insectSpecies") || insectKey;

  return {
    id: insectKey,
    crop: extractXmlTag(xml, "cropName") || "",
    name,
    ecologyInfo: stripHtml(extractXmlTag(xml, "ecologyInfo") || undefined),
    damageInfo: stripHtml(extractXmlTag(xml, "damageInfo") || undefined),
    preventMethod: stripHtml(extractXmlTag(xml, "preventMethod") || undefined),
    imageUrls: imageUrlsFromXml(xml),
  };
};

export const normalizeNcpmsWeedDetailXml = (xml: string, weedsKey: string): NcpmsWeedDetail => {
  ensureNcpmsXmlSuccess(xml);

  return {
    id: weedsKey,
    crop: extractXmlTag(xml, "cropName") || "",
    name: extractXmlTag(xml, "weedsKorName") || weedsKey,
    scientificName: stripHtml(extractXmlTag(xml, "weedsScientificName") || undefined),
    family: stripHtml(extractXmlTag(xml, "weedsFamily") || undefined),
    japaneseName: stripHtml(extractXmlTag(xml, "weedsJpnName") || undefined),
    englishName: stripHtml(extractXmlTag(xml, "weedsEngName") || undefined),
    shape: stripHtml(extractXmlTag(xml, "weedsShape") || undefined),
    ecology: stripHtml(extractXmlTag(xml, "weedsEcology") || undefined),
    habitat: stripHtml(extractXmlTag(xml, "weedsHabitat") || undefined),
    literature: stripHtml(extractXmlTag(xml, "literature") || undefined),
    imageUrls: imageUrlsFromXml(xml),
  };
};

export const fetchNcpmsIntegratedSearch = async (
  options: NcpmsSearchOptions = {},
): Promise<NcpmsPest[]> => {
  const apiKey = readOptionalServerEnv({ source: "NCPMS", names: ["NCPMS_API_KEY"] });
  if (!apiKey) return [];

  const response = await fetch(buildNcpmsIntegratedSearchUrl(apiKey, options));
  if (!response.ok) throw new Error(`NCPMS API Error: ${response.status}`);
  return normalizeNcpmsSearchXml(await response.text());
};

export const fetchNcpmsDiseaseDetail = async (sickKey: string): Promise<NcpmsDiseaseDetail> => {
  const apiKey = readOptionalServerEnv({ source: "NCPMS", names: ["NCPMS_API_KEY"] });
  if (!apiKey) throw new Error("NCPMS_API_KEY is not configured");

  const response = await fetch(buildNcpmsDiseaseDetailUrl(apiKey, sickKey));
  if (!response.ok) throw new Error(`NCPMS disease detail API Error: ${response.status}`);
  return normalizeNcpmsDiseaseDetailXml(await response.text(), sickKey);
};

export const fetchNcpmsInsectDetail = async (insectKey: string): Promise<NcpmsInsectDetail> => {
  const apiKey = readOptionalServerEnv({ source: "NCPMS", names: ["NCPMS_API_KEY"] });
  if (!apiKey) throw new Error("NCPMS_API_KEY is not configured");

  const response = await fetch(buildNcpmsInsectDetailUrl(apiKey, insectKey));
  if (!response.ok) throw new Error(`NCPMS insect detail API Error: ${response.status}`);
  return normalizeNcpmsInsectDetailXml(await response.text(), insectKey);
};

export const fetchNcpmsInsectInfoDetail = async (
  insectKey: string,
): Promise<NcpmsInsectDetail> => {
  const apiKey = readOptionalServerEnv({ source: "NCPMS", names: ["NCPMS_API_KEY"] });
  if (!apiKey) throw new Error("NCPMS_API_KEY is not configured");

  const response = await fetch(buildNcpmsInsectInfoDetailUrl(apiKey, insectKey));
  if (!response.ok) throw new Error(`NCPMS insect info detail API Error: ${response.status}`);
  return normalizeNcpmsInsectDetailXml(await response.text(), insectKey);
};

export const fetchNcpmsNaturalEnemyDetail = async (
  insectKey: string,
): Promise<NcpmsInsectDetail> => {
  const apiKey = readOptionalServerEnv({ source: "NCPMS", names: ["NCPMS_API_KEY"] });
  if (!apiKey) throw new Error("NCPMS_API_KEY is not configured");

  const response = await fetch(buildNcpmsNaturalEnemyDetailUrl(apiKey, insectKey));
  if (!response.ok) throw new Error(`NCPMS natural enemy detail API Error: ${response.status}`);
  return normalizeNcpmsInsectDetailXml(await response.text(), insectKey);
};

export const fetchNcpmsWeedDetail = async (weedsKey: string): Promise<NcpmsWeedDetail> => {
  const apiKey = readOptionalServerEnv({ source: "NCPMS", names: ["NCPMS_API_KEY"] });
  if (!apiKey) throw new Error("NCPMS_API_KEY is not configured");

  const response = await fetch(buildNcpmsWeedDetailUrl(apiKey, weedsKey));
  if (!response.ok) throw new Error(`NCPMS weed detail API Error: ${response.status}`);
  return normalizeNcpmsWeedDetailXml(await response.text(), weedsKey);
};

export const searchPestsByCropWithSource = async (crop: string): Promise<NcpmsCropSearchResult> => {
  const apiKey = readOptionalServerEnv({ source: "NCPMS", names: ["NCPMS_API_KEY"] });
  if (!apiKey) return selectNcpmsCropSearchResult(crop, []);

  const response = await fetch(buildNcpmsIntegratedSearchUrl(apiKey, { cropName: crop }));
  if (!response.ok) throw new Error(`NCPMS API Error: ${response.status}`);

  const pests = normalizeNcpmsSearchXml(await response.text(), crop);
  return selectNcpmsCropSearchResult(crop, pests);
};

export const searchPestsByCrop = async (crop: string): Promise<NcpmsPest[]> =>
  (await searchPestsByCropWithSource(crop)).items;
