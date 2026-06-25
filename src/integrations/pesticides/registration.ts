import {
  buildOpenApiUrl,
  extractXmlRows,
  extractXmlTag,
  readOptionalServerEnv,
} from "../openapi";

const PERS_SERVICE_URL = "http://psis.rda.go.kr/openApi/service.do";
const PERS_LIST_SERVICE_CODE = "SVC01";
const PERS_XML_SERVICE_TYPE = "AA001";
const PERS_MAX_DISPLAY_COUNT = 50;

export interface PesticideRegistration {
  id: string;
  /** 농약 상표명. */
  brandName: string;
  /** 농약 품목명. */
  productName?: string;
  activeIngredient?: string;
  activeIngredientContent?: string;
  cropName: string;
  diseaseWeedName?: string;
  useName?: string;
  useMethod?: string;
  dilutionUnit?: string;
  /** 수확 전 금지일수 (PHI, days before harvest). */
  phiDays?: number;
  useCount?: number;
  company?: string;
  importType?: string;
  actionMechanism?: string;
  registrationDate?: string;
  pestiCode?: string;
  diseaseUseSeq?: string;
  cropCode?: string;
  cropCategoryCode?: string;
  cropCategoryName?: string;
}

export interface PesticideRegistrationSearchOptions {
  cropName: string;
  diseaseWeedName?: string;
  useName?: string;
  pestiKorName?: string;
  pestiBrandName?: string;
  compName?: string;
  exactCrop?: boolean;
  similarPest?: boolean;
  startPoint?: number;
  displayCount?: number;
}

const toNumber = (value: string | null, fallback?: number) => {
  if (value === null || value === undefined || value.trim() === "") return fallback;
  const match = value.replace(/,/g, "").match(/\d+/);
  if (!match) return fallback;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const stripHtml = (value: string | undefined) =>
  (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toText = (value: string | null | undefined) => {
  const text = stripHtml(value ?? undefined);
  return text || undefined;
};

const clampDisplayCount = (value: number | undefined) => {
  if (value === undefined) return PERS_MAX_DISPLAY_COUNT;
  if (!Number.isFinite(value)) return PERS_MAX_DISPLAY_COUNT;
  return Math.max(1, Math.min(Math.trunc(value), PERS_MAX_DISPLAY_COUNT));
};

/**
 * PERS error codes are the same ERR_1xx/9xx family used by the NCPMS service.
 * `ERR_101` is returned when the API key is missing or unregistered.
 */
const PERS_ERROR_MAP: Record<string, string> = {
  ERR_101: "인증키를 입력하지 않은 경우 발생",
  ERR_102: "서비스 수행이 중지된 경우 발생",
  ERR_103: "서비스코드를 잘못 입력한 경우 발생",
  ERR_104: "요청한 서비스를 수행할 권한이 없는 경우 발생",
  ERR_105: "인증받지 않은 도메인인 경우 발생",
  ERR_201: "서비스 수행에 필요한 파라미터가 없거나 잘못된 경우 발생",
  ERR_901: "농약안전정보시스템에서 오류가 발생한 경우 발생",
};

const ensurePesticideXmlSuccess = (xml: string) => {
  const errorCode = extractXmlTag(xml, "errorCode");
  if (!errorCode) return;

  const mappedMsg = PERS_ERROR_MAP[errorCode];
  const xmlMsg = extractXmlTag(xml, "errorMsg");
  const finalMsg = mappedMsg ? `${mappedMsg} (${xmlMsg || errorCode})` : xmlMsg || "PERS API error";

  throw new Error(`[PERS] ${errorCode}: ${finalMsg}`);
};

export const buildPesticideRegistrationUrl = (
  apiKey: string,
  options: PesticideRegistrationSearchOptions,
) =>
  buildOpenApiUrl(PERS_SERVICE_URL, {
    apiKey,
    serviceCode: PERS_LIST_SERVICE_CODE,
    serviceType: PERS_XML_SERVICE_TYPE,
    cropName: options.cropName,
    cropCheck: options.exactCrop === false ? undefined : "Y",
    diseaseWeedName: options.diseaseWeedName,
    similarFlag: options.similarPest ? "Y" : "N",
    useName: options.useName,
    pestiKorName: options.pestiKorName,
    pestiBrandName: options.pestiBrandName,
    compName: options.compName,
    startPoint: options.startPoint,
    displayCount: clampDisplayCount(options.displayCount),
  });

export const normalizePesticideRegistrationXml = (
  xml: string,
): PesticideRegistration[] => {
  ensurePesticideXmlSuccess(xml);

  return extractXmlRows(xml).flatMap((row): PesticideRegistration[] => {
    const brandName = stripHtml(row.pestiBrandName || row.pestiName || row.brandName);
    const productName = toText(row.pestiKorName);
    const cropName = stripHtml(row.cropName);
    const displayName = brandName || productName;
    if (!displayName || !cropName) return [];

    const diseaseWeedName = toText(row.diseaseWeedName || row.weedName);
    const pestiCode = toText(row.pestiCode);
    const diseaseUseSeq = toText(row.diseaseUseSeq);
    const rawId =
      pestiCode && diseaseUseSeq
        ? `${pestiCode}-${diseaseUseSeq}`
        : `${displayName}-${cropName}-${diseaseWeedName ?? "전체"}`;

    return [
      {
        id: rawId,
        brandName: displayName,
        productName,
        activeIngredient: toText(row.engName || row.activeIngredient || row.ingrntName),
        activeIngredientContent: toText(row.regCpntQnty),
        cropName,
        diseaseWeedName,
        useName: toText(row.useName),
        useMethod: toText(row.pestiUse),
        dilutionUnit: toText(row.dilutUnit || row.dilution),
        phiDays: toNumber(row.useSuittime ?? null, undefined),
        useCount: toNumber(row.useNum ?? null, undefined),
        company: toText(row.compName || row.companyName || row.company),
        importType: toText(row.cmpaItmNm),
        actionMechanism: toText(row.indictSymbl),
        registrationDate: toText(row.applyFirstRegDate),
        pestiCode,
        diseaseUseSeq,
        cropCode: toText(row.cropCd),
        cropCategoryCode: toText(row.cropLrclCd),
        cropCategoryName: toText(row.cropLrclNm),
      },
    ];
  });
};

export const fetchPesticideRegistrations = async (
  options: PesticideRegistrationSearchOptions,
): Promise<PesticideRegistration[]> => {
  const apiKey = readOptionalServerEnv({
    source: "PERS",
    names: ["PERS_API_KEY", "PESTICIDE_REGISTRATION_API_KEY"],
  });
  if (!apiKey) return [];

  const response = await fetch(buildPesticideRegistrationUrl(apiKey, options));
  if (!response.ok) throw new Error(`PERS registration API Error: ${response.status}`);
  return normalizePesticideRegistrationXml(await response.text());
};
