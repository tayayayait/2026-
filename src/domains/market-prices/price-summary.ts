import type { KamisDailyPriceRow } from "../../integrations/kamis/daily-price";
import {
  fetchAllKamisDailyPrices,
  type KamisDailyPriceRequest,
} from "../../integrations/kamis/daily-price";
import {
  resolveMarketPriceCropMapping,
  type MarketPriceCropMapping,
} from "./crop-price-mapping";
import { resolveMarketPriceRegion } from "./region-code";

export type MarketPriceTrend = "UP" | "DOWN" | "FLAT" | "UNKNOWN";

export interface MarketPricePoint {
  date: string;
  averageKgPrice: number;
  rowCount: number;
}

export interface MarketPriceLocalRetail {
  regionCode: string;
  regionName: string;
  latestDate: string;
  kgPrice: number;
  marketNames: string[];
}

/**
 * 30일(또는 fallback 조회 범위) 시계열에서 파생한 통계.
 * 별도의 평년(5년평균) API가 없으므로, 동일 시계열 내에서
 * 현재 가격의 상대적 위치(최소/최대/평균/변동성)를 기준으로
 * 추세와 계절성을 판단하는 데 사용한다.
 */
export interface MarketPriceDerivedStats {
  minKgPrice: number;
  maxKgPrice: number;
  avgKgPrice: number;
  /** (최대-최소)/평균 * 100, 시계열 내 가격 변동 폭(%) */
  volatilityPercent: number;
  /** 최신 가격이 기간 평균 대비 몇 % 위/아래인지 (+/- %) */
  aboveAveragePercent: number;
  /** 시계열 데이터 포인트 수 */
  pointCount: number;
}

export interface MarketPriceSummary {
  cropName: string;
  itemName: string;
  categoryCode: string;
  itemCode: string;
  categoryName: string;
  mappingNote?: string;
  latestDate: string | null;
  latestKgPrice: number | null;
  latestWholesaleKgPrice: number | null;
  latestRetailKgPrice: number | null;
  sevenDayAverageKgPrice: number | null;
  thirtyDayAverageKgPrice: number | null;
  changeFromSevenDayAveragePercent: number | null;
  trend: MarketPriceTrend;
  points: MarketPricePoint[];
  derived: MarketPriceDerivedStats | null;
  rowCount: number;
  classNames: string[];
  marketNames: string[];
  varietyNames: string[];
  gradeNames: string[];
  localRetail: MarketPriceLocalRetail | null;
  sourceLabel: string;
  isFallbackRange: boolean;
  lookupDays: number;
  warning?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const PRIMARY_LOOKBACK_DAYS = 30;
const FALLBACK_LOOKBACK_DAYS = 365;
const WHOLESALE_CLASS_CODE = "02";
const RETAIL_CLASS_CODE = "01";

const unique = (values: string[], limit = 6) =>
  Array.from(new Set(values.filter(Boolean))).slice(0, limit);

const average = (values: number[]) => {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const parseYmd = (value: string) => {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  return new Date(Date.UTC(year, month - 1, day));
};

const formatKstYmd = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replaceAll("-", "");

export const getMarketPriceDateRange = (days: number, now = new Date()) => {
  const endDate = formatKstYmd(now);
  const startDate = formatKstYmd(new Date(now.getTime() - (days - 1) * DAY_MS));
  return { startDate, endDate };
};

const groupAverageByDate = (rows: KamisDailyPriceRow[]): MarketPricePoint[] => {
  const byDate = new Map<string, number[]>();

  for (const row of rows) {
    if (!row.surveyedDate || row.convertedKgPrice === null) continue;
    const values = byDate.get(row.surveyedDate) ?? [];
    values.push(row.convertedKgPrice);
    byDate.set(row.surveyedDate, values);
  }

  return Array.from(byDate.entries())
    .map(([date, values]) => ({
      date,
      averageKgPrice: average(values) ?? 0,
      rowCount: values.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

const averageRowsSince = (rows: KamisDailyPriceRow[], latestDate: string, days: number) => {
  const minTime = parseYmd(latestDate).getTime() - (days - 1) * DAY_MS;
  return average(
    rows
      .filter((row) => row.surveyedDate && parseYmd(row.surveyedDate).getTime() >= minTime)
      .map((row) => row.convertedKgPrice)
      .filter((value): value is number => value !== null),
  );
};

const calculateTrend = (
  latestKgPrice: number | null,
  sevenDayAverageKgPrice: number | null,
): MarketPriceTrend => {
  if (latestKgPrice === null || sevenDayAverageKgPrice === null || sevenDayAverageKgPrice === 0) {
    return "UNKNOWN";
  }
  const change = ((latestKgPrice - sevenDayAverageKgPrice) / sevenDayAverageKgPrice) * 100;
  if (Math.abs(change) < 3) return "FLAT";
  return change > 0 ? "UP" : "DOWN";
};

const calculateChangePercent = (
  latestKgPrice: number | null,
  sevenDayAverageKgPrice: number | null,
) => {
  if (latestKgPrice === null || sevenDayAverageKgPrice === null || sevenDayAverageKgPrice === 0) {
    return null;
  }
  return Number((((latestKgPrice - sevenDayAverageKgPrice) / sevenDayAverageKgPrice) * 100).toFixed(1));
};

/**
 * 시계열 포인트에서 파생 통계(최소/최대/평균/변동성/평균대비 위치)를 계산한다.
 * 포인트가 부족하면 평가할 수 없으므로 null을 반환한다.
 */
const buildDerivedStats = (
  points: MarketPricePoint[],
  latestKgPrice: number | null,
): MarketPriceDerivedStats | null => {
  const priced = points.map((point) => point.averageKgPrice).filter((value) => Number.isFinite(value));
  if (priced.length < 2 || latestKgPrice === null) return null;

  const minKgPrice = Math.min(...priced);
  const maxKgPrice = Math.max(...priced);
  const avgKgPrice = average(priced) ?? 0;
  const volatilityPercent =
    avgKgPrice > 0
      ? Number((((maxKgPrice - minKgPrice) / avgKgPrice) * 100).toFixed(1))
      : 0;
  const aboveAveragePercent =
    avgKgPrice > 0
      ? Number((((latestKgPrice - avgKgPrice) / avgKgPrice) * 100).toFixed(1))
      : 0;

  return {
    minKgPrice,
    maxKgPrice,
    avgKgPrice,
    volatilityPercent,
    aboveAveragePercent,
    pointCount: priced.length,
  };
};

const selectPrimaryRows = (rows: KamisDailyPriceRow[]) => {
  const wholesaleRows = rows.filter((row) => row.classCode === WHOLESALE_CLASS_CODE);
  if (wholesaleRows.length > 0) return wholesaleRows;
  return rows;
};

const latestAverage = (rows: KamisDailyPriceRow[]) => {
  const datedRows = rows.filter((row) => row.surveyedDate && row.convertedKgPrice !== null);
  if (datedRows.length === 0) return { latestDate: null, kgPrice: null };

  const latestDate = datedRows
    .map((row) => row.surveyedDate)
    .sort((a, b) => b.localeCompare(a))[0];
  return {
    latestDate,
    kgPrice: average(
      datedRows
        .filter((row) => row.surveyedDate === latestDate)
        .map((row) => row.convertedKgPrice)
        .filter((value): value is number => value !== null),
    ),
  };
};

const buildLocalRetail = (
  rows: KamisDailyPriceRow[],
  region: { regionCode: string; regionName: string } | null,
): MarketPriceLocalRetail | null => {
  if (!region || rows.length === 0) return null;
  const localLatest = latestAverage(rows);
  if (!localLatest.latestDate || localLatest.kgPrice === null) return null;

  return {
    regionCode: region.regionCode,
    regionName: region.regionName,
    latestDate: localLatest.latestDate,
    kgPrice: localLatest.kgPrice,
    marketNames: unique(rows.map((row) => row.marketName)),
  };
};

export const buildMarketPriceSummary = ({
  cropName,
  mapping,
  nationalRows,
  localRetailRows = [],
  localRegion = null,
  isFallbackRange = false,
  lookupDays = PRIMARY_LOOKBACK_DAYS,
}: {
  cropName: string;
  mapping: MarketPriceCropMapping;
  nationalRows: KamisDailyPriceRow[];
  localRetailRows?: KamisDailyPriceRow[];
  localRegion?: { regionCode: string; regionName: string } | null;
  isFallbackRange?: boolean;
  lookupDays?: number;
}): MarketPriceSummary => {
  const primaryRows = selectPrimaryRows(nationalRows);
  const latestPrimary = latestAverage(primaryRows);
  const wholesale = latestAverage(nationalRows.filter((row) => row.classCode === WHOLESALE_CLASS_CODE));
  const retail = latestAverage(nationalRows.filter((row) => row.classCode === RETAIL_CLASS_CODE));
  const sevenDayAverageKgPrice = latestPrimary.latestDate
    ? averageRowsSince(primaryRows, latestPrimary.latestDate, 7)
    : null;
  const thirtyDayAverageKgPrice = latestPrimary.latestDate
    ? averageRowsSince(primaryRows, latestPrimary.latestDate, 30)
    : null;
  const points = groupAverageByDate(primaryRows);

  return {
    cropName,
    itemName: mapping.itemName,
    categoryCode: mapping.categoryCode,
    itemCode: mapping.itemCode,
    categoryName: mapping.categoryName,
    mappingNote: mapping.note,
    latestDate: latestPrimary.latestDate,
    latestKgPrice: latestPrimary.kgPrice,
    latestWholesaleKgPrice: wholesale.kgPrice,
    latestRetailKgPrice: retail.kgPrice,
    sevenDayAverageKgPrice,
    thirtyDayAverageKgPrice,
    changeFromSevenDayAveragePercent: calculateChangePercent(
      latestPrimary.kgPrice,
      sevenDayAverageKgPrice,
    ),
    trend: calculateTrend(latestPrimary.kgPrice, sevenDayAverageKgPrice),
    points,
    derived: buildDerivedStats(points, latestPrimary.kgPrice),
    rowCount: nationalRows.length + localRetailRows.length,
    classNames: unique(nationalRows.map((row) => row.className)),
    marketNames: unique(nationalRows.map((row) => row.marketName)),
    varietyNames: unique(nationalRows.map((row) => row.varietyName)),
    gradeNames: unique(nationalRows.map((row) => row.gradeName)),
    localRetail: buildLocalRetail(localRetailRows, localRegion),
    sourceLabel: "KAMIS 일별 도·소매 가격정보",
    isFallbackRange,
    lookupDays,
    warning:
      nationalRows.length === 0
        ? `최근 ${PRIMARY_LOOKBACK_DAYS}일 및 ${FALLBACK_LOOKBACK_DAYS}일 조회에서 해당 품목 가격 데이터가 없습니다.`
        : isFallbackRange
          ? [
              `최근 ${PRIMARY_LOOKBACK_DAYS}일 응답이 없어 최근 ${lookupDays}일 범위의 마지막 조사값을 표시합니다.`,
              mapping.note,
            ]
              .filter(Boolean)
              .join(" ")
          : mapping.note,
  };
};

const buildRequest = (
  mapping: MarketPriceCropMapping,
  dateRange: { startDate: string; endDate: string },
  overrides: Partial<KamisDailyPriceRequest> = {},
): KamisDailyPriceRequest => ({
  startDate: dateRange.startDate,
  endDate: dateRange.endDate,
  categoryCode: mapping.categoryCode,
  itemCode: mapping.itemCode,
  pageNo: 1,
  numOfRows: 1000,
  ...overrides,
});

export const fetchMarketPriceSummaryForFarm = async ({
  cropName,
  region,
  now = new Date(),
}: {
  cropName: string;
  region: string;
  now?: Date;
}): Promise<MarketPriceSummary | null> => {
  const mapping = resolveMarketPriceCropMapping(cropName);
  if (!mapping) return null;

  const dateRange = getMarketPriceDateRange(PRIMARY_LOOKBACK_DAYS, now);
  const localRegion = resolveMarketPriceRegion(region);

  const [nationalResponse, localRetailResponse] = await Promise.allSettled([
    fetchAllKamisDailyPrices(buildRequest(mapping, dateRange)),
    localRegion
      ? fetchAllKamisDailyPrices(
          buildRequest(mapping, dateRange, {
            classCode: RETAIL_CLASS_CODE,
            regionCode: localRegion.regionCode,
          }),
        )
      : Promise.resolve({ rows: [] }),
  ]);

  if (nationalResponse.status === "rejected") throw nationalResponse.reason;

  const localRetailRows =
    localRetailResponse.status === "fulfilled" ? localRetailResponse.value.rows : [];

  if (nationalResponse.value.rows.length === 0) {
    const fallbackDateRange = getMarketPriceDateRange(FALLBACK_LOOKBACK_DAYS, now);
    const [fallbackNationalResponse, fallbackLocalRetailResponse] = await Promise.allSettled([
      fetchAllKamisDailyPrices(buildRequest(mapping, fallbackDateRange)),
      localRegion
        ? fetchAllKamisDailyPrices(
            buildRequest(mapping, fallbackDateRange, {
              classCode: RETAIL_CLASS_CODE,
              regionCode: localRegion.regionCode,
            }),
          )
        : Promise.resolve({ rows: [] }),
    ]);

    if (
      fallbackNationalResponse.status === "fulfilled" &&
      fallbackNationalResponse.value.rows.length > 0
    ) {
      return buildMarketPriceSummary({
        cropName,
        mapping,
        nationalRows: fallbackNationalResponse.value.rows,
        localRetailRows:
          fallbackLocalRetailResponse.status === "fulfilled"
            ? fallbackLocalRetailResponse.value.rows
            : [],
        localRegion,
        isFallbackRange: true,
        lookupDays: FALLBACK_LOOKBACK_DAYS,
      });
    }
  }

  return buildMarketPriceSummary({
    cropName,
    mapping,
    nationalRows: nationalResponse.value.rows,
    localRetailRows,
    localRegion,
  });
};
