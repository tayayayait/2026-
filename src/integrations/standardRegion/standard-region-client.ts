import type { StandardRegionCode, StandardRegionPage } from "@/domains/farms/standard-region";
import { createOpenApiError, readOptionalServerEnv, readServerEnv } from "@/integrations/openapi";
import {
  buildStandardRegionUrl,
  parseStandardRegionResponseText,
  type StandardRegionRequest,
} from "./standard-region-contract";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface StandardRegionClientConfig {
  serviceKey?: string;
  baseUrl?: string;
  fetcher?: FetchLike;
}

const PAGE_SIZE = 1000;
const MAX_PAGES = 30;

const resolveConfig = (config: StandardRegionClientConfig) => ({
  serviceKey:
    config.serviceKey ??
    readServerEnv({
      source: "STANDARD_REGION",
      names: ["STANDARD_REGION_API_KEY", "PUBLIC_DATA_SERVICE_KEY"],
    }),
  baseUrl:
    config.baseUrl ??
    readOptionalServerEnv({
      source: "STANDARD_REGION",
      names: ["STANDARD_REGION_BASE_URL"],
    }) ??
    undefined,
  fetcher: config.fetcher ?? fetch,
});

export const fetchStandardRegionPage = async (
  request: StandardRegionRequest = {},
  config: StandardRegionClientConfig = {},
): Promise<StandardRegionPage> => {
  const resolved = resolveConfig(config);
  const url = buildStandardRegionUrl(
    resolved.serviceKey,
    request,
    resolved.baseUrl,
  );
  const response = await resolved.fetcher(url, {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.text();
  if (!response.ok) {
    throw createOpenApiError(
      "STANDARD_REGION",
      "HTTP_ERROR",
      "행정표준코드 API 요청에 실패했습니다.",
      response.status,
    );
  }
  return parseStandardRegionResponseText(body);
};

export const fetchAllStandardRegions = async (
  config: StandardRegionClientConfig = {},
): Promise<StandardRegionCode[]> => {
  const firstPage = await fetchStandardRegionPage(
    { pageNo: 1, numOfRows: PAGE_SIZE },
    config,
  );
  const totalPages = Math.min(
    Math.max(Math.ceil((firstPage.totalCount ?? firstPage.rows.length) / PAGE_SIZE), 1),
    MAX_PAGES,
  );

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchStandardRegionPage(
        { pageNo: index + 2, numOfRows: PAGE_SIZE },
        config,
      ),
    ),
  );
  const rows = [firstPage, ...remainingPages].flatMap((page) => page.rows);
  return Array.from(new Map(rows.map((row) => [row.regionCode, row])).values());
};
