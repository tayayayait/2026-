import { buildOpenApiUrl, extractXmlRows, extractXmlTag, readOptionalServerEnv } from "../openapi";

const RDA_PEST_OCCURRENCE_BASE_URL = "http://api.nongsaro.go.kr/service/dbyhsCccrrncInfo";

export interface RdaOccurrenceYear {
  yearCode: string;
  yearCount: number;
}

export interface RdaPestOccurrence {
  id: string;
  title: string;
  author?: string;
  registeredAt?: string;
  viewCount?: number;
  fileUrl?: string;
  fileName?: string;
}

export interface RdaPestOccurrenceList {
  items: RdaPestOccurrence[];
  pageNo: number;
  numOfRows: number;
  totalCount: number;
}

export interface RdaPestOccurrenceListOptions {
  sYear?: string;
  sType?: "sCntntsSj" | "sWriteNm";
  sText?: string;
  pageNo?: number;
}

const toNumber = (value: string | null, fallback = 0) => {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const stripHtml = (value: string | undefined) =>
  (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getEndpoint = (operationName: "dbyhsCccrrncInfoYear" | "dbyhsCccrrncInfoList") =>
  `${RDA_PEST_OCCURRENCE_BASE_URL}/${operationName}`;

const ensureRdaXmlSuccess = (xml: string) => {
  const errorCode = extractXmlTag(xml, "errorCode") || extractXmlTag(xml, "resultCode");
  if (!errorCode || errorCode === "00") return;
  const errorMsg =
    extractXmlTag(xml, "errorMsg") || extractXmlTag(xml, "resultMsg") || "RDA API error";
  throw new Error(`[RDA] ${errorCode}: ${errorMsg}`);
};

export const buildRdaPestOccurrenceYearsUrl = (apiKey: string) =>
  buildOpenApiUrl(getEndpoint("dbyhsCccrrncInfoYear"), { apiKey });

export const buildRdaPestOccurrenceListUrl = (
  apiKey: string,
  options: RdaPestOccurrenceListOptions = {},
) =>
  buildOpenApiUrl(getEndpoint("dbyhsCccrrncInfoList"), {
    apiKey,
    sYear: options.sYear,
    sType: options.sType,
    sText: options.sText,
    pageNo: options.pageNo,
  });

export const normalizeRdaOccurrenceYearsXml = (xml: string): RdaOccurrenceYear[] => {
  ensureRdaXmlSuccess(xml);
  return extractXmlRows(xml).map((row) => ({
    yearCode: row.yearCode || "",
    yearCount: toNumber(row.yearCnt || null),
  }));
};

export const normalizeRdaOccurrenceListXml = (xml: string): RdaPestOccurrenceList => {
  ensureRdaXmlSuccess(xml);
  const rows = extractXmlRows(xml).filter((row) => row.cntntsNo || row.cntntsSj);

  return {
    items: rows.map((row) => ({
      id: row.cntntsNo || row.cntntsSj || "unknown",
      title: stripHtml(row.cntntsSj),
      author: row.updusrEsntlNm || undefined,
      registeredAt: row.registDt || undefined,
      viewCount: row.cntntsRdcnt ? toNumber(row.cntntsRdcnt) : undefined,
      fileUrl: row.downFile || undefined,
      fileName: row.rtnOrginlFileNm || undefined,
    })),
    pageNo: toNumber(extractXmlTag(xml, "pageNo"), 1),
    numOfRows: toNumber(extractXmlTag(xml, "numOfRows"), rows.length),
    totalCount: toNumber(extractXmlTag(xml, "totalCount"), rows.length),
  };
};

export const fetchRdaPestOccurrenceYears = async (): Promise<RdaOccurrenceYear[]> => {
  const apiKey = readOptionalServerEnv({
    source: "RDA",
    names: ["RDA_PEST_OCCURRENCE_API_KEY", "NONGSARO_API_KEY"],
  });
  if (!apiKey) return [];

  const response = await fetch(buildRdaPestOccurrenceYearsUrl(apiKey));
  if (!response.ok) throw new Error(`RDA pest occurrence year API Error: ${response.status}`);
  return normalizeRdaOccurrenceYearsXml(await response.text());
};

export const fetchRdaPestOccurrenceList = async (
  options: RdaPestOccurrenceListOptions = {},
): Promise<RdaPestOccurrenceList> => {
  const apiKey = readOptionalServerEnv({
    source: "RDA",
    names: ["RDA_PEST_OCCURRENCE_API_KEY", "NONGSARO_API_KEY"],
  });
  if (!apiKey) {
    return { items: [], pageNo: options.pageNo ?? 1, numOfRows: 0, totalCount: 0 };
  }

  const response = await fetch(buildRdaPestOccurrenceListUrl(apiKey, options));
  if (!response.ok) throw new Error(`RDA pest occurrence list API Error: ${response.status}`);
  return normalizeRdaOccurrenceListXml(await response.text());
};
