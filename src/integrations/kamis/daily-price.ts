import { readServerEnv } from "../openapi/environment";
import { createOpenApiError } from "../openapi/result-codes";
import { buildOpenApiUrl } from "../openapi/url-builder";

export const KAMIS_DAILY_PRICE_BASE_URL = "https://apis.data.go.kr/B552845/perDay/price";
export const KAMIS_DAILY_PRICE_MAX_ROWS = 1000;

export interface KamisDailyPriceRequest {
  startDate: string;
  endDate: string;
  categoryCode: string;
  itemCode: string;
  classCode?: string;
  varietyCode?: string;
  gradeCode?: string;
  regionCode?: string;
  marketCode?: string;
  pageNo?: number;
  numOfRows?: number;
}

export interface KamisDailyPriceRow {
  surveyedDate: string;
  classCode: string;
  className: string;
  categoryCode: string;
  categoryName: string;
  itemCode: string;
  itemName: string;
  varietyCode: string;
  varietyName: string;
  gradeCode: string;
  gradeName: string;
  regionCode: string;
  regionName: string;
  unit: string;
  unitSize: string;
  marketCode: string;
  marketName: string;
  price: number | null;
  convertedKgPrice: number | null;
  originalRegisteredAt: string;
}

type KamisRawRow = Record<string, unknown>;

type KamisDailyPricePayload = {
  response?: {
    header?: {
      resultCode?: unknown;
      resultMsg?: unknown;
    };
    body?: {
      items?: {
        item?: KamisRawRow | KamisRawRow[];
      };
      totalCount?: unknown;
      pageNo?: unknown;
      numOfRows?: unknown;
      dataType?: unknown;
    };
  };
};

export interface KamisDailyPriceResponse {
  rows: KamisDailyPriceRow[];
  totalCount: number;
  pageNo: number;
  numOfRows: number;
  dataType: string;
}

const readString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const readNumber = (value: unknown): number | null => {
  const text = readString(value).replace(/,/g, "").trim();
  if (!text || text === "-") return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
};

const clampNumOfRows = (value: number | undefined) => {
  if (value === undefined) return KAMIS_DAILY_PRICE_MAX_ROWS;
  return Math.max(1, Math.min(KAMIS_DAILY_PRICE_MAX_ROWS, Math.floor(value)));
};

export const normalizeKamisServiceKey = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed.includes("%")) return trimmed;

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
};

export const buildKamisDailyPriceUrl = (
  request: KamisDailyPriceRequest,
  serviceKey: string,
): string =>
  buildOpenApiUrl(KAMIS_DAILY_PRICE_BASE_URL, {
    serviceKey: normalizeKamisServiceKey(serviceKey),
    returnType: "JSON",
    pageNo: request.pageNo ?? 1,
    numOfRows: clampNumOfRows(request.numOfRows),
    "cond[exmn_ymd::GTE]": request.startDate,
    "cond[exmn_ymd::LTE]": request.endDate,
    "cond[ctgry_cd::EQ]": request.categoryCode,
    "cond[item_cd::EQ]": request.itemCode,
    "cond[se_cd::EQ]": request.classCode,
    "cond[vrty_cd::EQ]": request.varietyCode,
    "cond[grd_cd::EQ]": request.gradeCode,
    "cond[sgg_cd::EQ]": request.regionCode,
    "cond[mrkt_cd::EQ]": request.marketCode,
  });

export const normalizeKamisDailyPriceRow = (row: KamisRawRow): KamisDailyPriceRow => ({
  surveyedDate: readString(row.exmn_ymd),
  classCode: readString(row.se_cd),
  className: readString(row.se_nm),
  categoryCode: readString(row.ctgry_cd),
  categoryName: readString(row.ctgry_nm),
  itemCode: readString(row.item_cd),
  itemName: readString(row.item_nm),
  varietyCode: readString(row.vrty_cd),
  varietyName: readString(row.vrty_nm),
  gradeCode: readString(row.grd_cd),
  gradeName: readString(row.grd_nm),
  regionCode: readString(row.sgg_cd),
  regionName: readString(row.sgg_nm),
  unit: readString(row.unit),
  unitSize: readString(row.unit_sz),
  marketCode: readString(row.mrkt_cd),
  marketName: readString(row.mrkt_nm),
  price: readNumber(row.exmn_dd_prc),
  convertedKgPrice: readNumber(row.exmn_dd_cnvs_prc),
  originalRegisteredAt: readString(row.orgnl_reg_dt),
});

const ensureKamisDailyPriceSuccess = (payload: KamisDailyPricePayload) => {
  const resultCode = readString(payload.response?.header?.resultCode);
  if (resultCode === "0") return;

  throw createOpenApiError(
    "KAMIS",
    resultCode || "RESULT_MISSING",
    readString(payload.response?.header?.resultMsg) || "KAMIS daily price response failed",
  );
};

const parseKamisDailyPricePayload = (payload: KamisDailyPricePayload): KamisDailyPriceResponse => {
  ensureKamisDailyPriceSuccess(payload);

  const body = payload.response?.body;
  const item = body?.items?.item;
  const rawRows = Array.isArray(item) ? item : item ? [item] : [];

  return {
    rows: rawRows.map(normalizeKamisDailyPriceRow),
    totalCount: readNumber(body?.totalCount) ?? 0,
    pageNo: readNumber(body?.pageNo) ?? 1,
    numOfRows: readNumber(body?.numOfRows) ?? rawRows.length,
    dataType: readString(body?.dataType),
  };
};

const fetchKamisDailyPricePage = async (
  request: KamisDailyPriceRequest,
  serviceKey: string,
): Promise<KamisDailyPriceResponse> => {
  const url = buildKamisDailyPriceUrl(request, serviceKey);
  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw createOpenApiError("KAMIS", String(response.status), text || response.statusText, response.status);
  }

  try {
    return parseKamisDailyPricePayload(JSON.parse(text) as KamisDailyPricePayload);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw createOpenApiError("KAMIS", "INVALID_JSON", "KAMIS daily price response was not JSON");
    }
    throw error;
  }
};

const readKamisDailyPriceServiceKey = () =>
  readServerEnv({
    source: "KAMIS",
    names: ["KAMIS_DAILY_PRICE_API_KEY", "PUBLIC_DATA_SERVICE_KEY"],
  });

export const fetchKamisDailyPrices = async (
  request: KamisDailyPriceRequest,
): Promise<KamisDailyPriceResponse> =>
  fetchKamisDailyPricePage(request, readKamisDailyPriceServiceKey());

export const fetchAllKamisDailyPrices = async (
  request: KamisDailyPriceRequest,
): Promise<KamisDailyPriceResponse> => {
  const serviceKey = readKamisDailyPriceServiceKey();
  const pageSize = clampNumOfRows(request.numOfRows);
  const firstPage = await fetchKamisDailyPricePage(
    { ...request, pageNo: 1, numOfRows: pageSize },
    serviceKey,
  );
  const totalPages = Math.ceil(firstPage.totalCount / pageSize);

  if (totalPages <= 1) return firstPage;

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchKamisDailyPricePage(
        { ...request, pageNo: index + 2, numOfRows: pageSize },
        serviceKey,
      ),
    ),
  );

  return {
    ...firstPage,
    rows: [firstPage, ...remainingPages].flatMap((page) => page.rows),
    pageNo: 1,
    numOfRows: pageSize,
  };
};
