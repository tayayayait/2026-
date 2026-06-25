import { extractXmlRows, extractXmlTag } from "../openapi";
import type {
  NcpmsPhotoCandidate,
  NcpmsPhotoCrop,
  NcpmsPhotoDetailServiceCode,
  NcpmsPhotoSearchPage,
  NcpmsPhotoSection,
} from "./photo-search.types";

type PhotoRow = Record<string, unknown>;

interface NormalizedService {
  rows: PhotoRow[];
  startPoint: number;
  displayCount: number;
  totalCount: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toStringValue = (value: unknown) => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number.parseInt(toStringValue(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value: unknown) =>
  toStringValue(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeImageUrl = (value: unknown) => {
  const url = normalizeText(value);
  if (!url) return undefined;
  return url.replace(/^http:\/\/ncpms\.rda\.go\.kr\//i, "https://ncpms.rda.go.kr/");
};

const normalizeJsonRows = (list: unknown): PhotoRow[] => {
  if (Array.isArray(list)) return list.filter(isRecord);
  if (!isRecord(list)) return [];
  if (Array.isArray(list.item)) return list.item.filter(isRecord);
  return isRecord(list.item) ? [list.item] : [];
};

const ensureSuccess = (errorCode: string, errorMessage: string) => {
  if (!errorCode) return;
  throw new Error(`[NCPMS] ${errorCode}: ${errorMessage || "NCPMS photo search API error"}`);
};

const normalizeXmlService = (xml: string): NormalizedService => {
  ensureSuccess(extractXmlTag(xml, "errorCode") || "", extractXmlTag(xml, "errorMsg") || "");
  const rows = extractXmlRows(xml);

  return {
    rows,
    startPoint: toNumber(extractXmlTag(xml, "startPoint"), 1),
    displayCount: toNumber(extractXmlTag(xml, "displayCount"), rows.length),
    totalCount: toNumber(extractXmlTag(xml, "totalCount"), rows.length),
  };
};

const normalizeJsonService = (input: unknown): NormalizedService => {
  if (!isRecord(input)) throw new Error("NCPMS photo search response must be an object");
  const service = isRecord(input.service) ? input.service : input;
  ensureSuccess(
    normalizeText(service.errorCode),
    normalizeText(service.errorMsg || service.errorMessage),
  );
  const rows = normalizeJsonRows(service.list);

  return {
    rows,
    startPoint: toNumber(service.startPoint, 1),
    displayCount: toNumber(service.displayCount, rows.length),
    totalCount: toNumber(service.totalCount, rows.length),
  };
};

const normalizeService = (input: string | unknown): NormalizedService => {
  if (typeof input !== "string") return normalizeJsonService(input);
  const trimmedInput = input.trim();
  if (trimmedInput.startsWith("<")) return normalizeXmlService(trimmedInput);

  try {
    return normalizeJsonService(JSON.parse(trimmedInput));
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error("NCPMS photo search response is not valid JSON");
    throw error;
  }
};

const toPage = <T>(service: NormalizedService, items: T[]): NcpmsPhotoSearchPage<T> => ({
  items,
  startPoint: service.startPoint,
  displayCount: service.displayCount,
  totalCount: service.totalCount,
});

const getCandidateClassification = (
  category: string,
): Pick<NcpmsPhotoCandidate, "type" | "detailServiceCode" | "detailSupported"> => {
  const mapping: Record<
    string,
    { type: NcpmsPhotoCandidate["type"]; service: NcpmsPhotoDetailServiceCode }
  > = {
    병생태: { type: "DISEASE", service: "SVC05" },
    해충생태: { type: "INSECT", service: "SVC07" },
    곤충: { type: "INSECT", service: "SVC08" },
    잡초: { type: "WEED", service: "SVC10" },
    천적곤충: { type: "INSECT", service: "SVC15" },
  };
  const classification = mapping[category];
  if (!classification) {
    return { type: "UNKNOWN", detailServiceCode: "UNKNOWN", detailSupported: false };
  }

  return {
    type: classification.type,
    detailServiceCode: classification.service,
    detailSupported: ["SVC05", "SVC07", "SVC08", "SVC10", "SVC15"].includes(classification.service),
  };
};

export const normalizeNcpmsPhotoSections = (
  input: string | unknown,
): NcpmsPhotoSearchPage<NcpmsPhotoSection> => {
  const service = normalizeService(input);
  const items = service.rows
    .map((row) => ({
      code: normalizeText(row.cropSectionCode),
      name: normalizeText(row.cropSectionName),
      imageUrl: normalizeImageUrl(row.thumbImg),
    }))
    .filter((item) => Boolean(item.code && item.name));
  return toPage(service, items);
};

export const normalizeNcpmsPhotoCrops = (
  input: string | unknown,
): NcpmsPhotoSearchPage<NcpmsPhotoCrop> => {
  const service = normalizeService(input);
  const items = service.rows
    .map((row) => ({
      code: normalizeText(row.cropCode),
      name: normalizeText(row.cropName),
      imageUrl: normalizeImageUrl(row.thumbImg),
    }))
    .filter((item) => Boolean(item.code && item.name));
  return toPage(service, items);
};

export const normalizeNcpmsPhotoCandidates = (
  input: string | unknown,
): NcpmsPhotoSearchPage<NcpmsPhotoCandidate> => {
  const service = normalizeService(input);
  const items = service.rows
    .map((row) => {
      const category = normalizeText(row.category);
      return {
        id: normalizeText(row.pestKey),
        name: normalizeText(row.pestName),
        category,
        ...getCandidateClassification(category),
        imageUrl: normalizeImageUrl(row.thumbImg),
      };
    })
    .filter((item) => Boolean(item.id && item.name));
  return toPage(service, items);
};
