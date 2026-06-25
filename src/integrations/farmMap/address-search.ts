import proj4 from "proj4";
import { z } from "zod";
import { geocodeAddress, type GeocodeResponse } from "@/integrations/naverMaps/geocode";
import { readOptionalServerEnv } from "@/integrations/openapi/environment";
import { buildOpenApiUrl } from "@/integrations/openapi/url-builder";
import type { FarmAddressSearchType } from "@/domains/farms/registration";

const VWORLD_SEARCH_ENDPOINT = "https://api.vworld.kr/req/search";
const JUSO_SEARCH_ENDPOINT = "https://business.juso.go.kr/addrlink/addrLinkApi.do";
const JUSO_COORD_ENDPOINT = "https://business.juso.go.kr/addrlink/addrCoordApi.do";
const EPSG_5179 =
  "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs";

const VWorldResponseSchema = z.object({
  response: z.object({
    status: z.string(),
    record: z.object({ total: z.union([z.string(), z.number()]).optional() }).optional(),
    result: z
      .object({
        items: z.array(
          z.object({
            id: z.string().optional(),
            address: z.object({ road: z.string().optional(), parcel: z.string().optional() }),
            point: z.object({ x: z.union([z.string(), z.number()]), y: z.union([z.string(), z.number()]) }),
          }),
        ),
      })
      .optional(),
  }),
});

const JusoSearchResponseSchema = z.object({
  results: z.object({
    common: z.object({
      errorCode: z.string(),
      errorMessage: z.string().optional(),
      totalCount: z.union([z.string(), z.number()]).optional(),
    }),
    juso: z
      .array(
        z.object({
          roadAddr: z.string(),
          jibunAddr: z.string().optional(),
          admCd: z.string(),
          rnMgtSn: z.string(),
          udrtYn: z.string(),
          buldMnnm: z.string(),
          buldSlno: z.string(),
        }),
      )
      .optional(),
  }),
});

const JusoCoordResponseSchema = z.object({
  results: z.object({
    common: z.object({ errorCode: z.string(), errorMessage: z.string().optional() }),
    juso: z
      .array(
        z.object({
          entX: z.union([z.string(), z.number()]),
          entY: z.union([z.string(), z.number()]),
        }),
      )
      .optional(),
  }),
});

interface OfficialAddressSearchConfig {
  vworldApiKey?: string | null;
  jusoRoadApiKey?: string | null;
  jusoCoordApiKey?: string | null;
  fetcher?: typeof fetch;
  fallbackGeocoder?: (query: string) => Promise<GeocodeResponse>;
}

const fetchJson = async (url: string, fetcher: typeof fetch) => {
  const response = await fetcher(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Address API HTTP error: ${response.status}`);
  return response.json();
};

const searchVWorldParcel = async (
  query: string,
  apiKey: string,
  fetcher: typeof fetch,
): Promise<GeocodeResponse> => {
  const url = buildOpenApiUrl(VWORLD_SEARCH_ENDPOINT, {
    service: "search",
    request: "search",
    version: "2.0",
    crs: "EPSG:4326",
    size: 100,
    page: 1,
    query,
    type: "address",
    category: "parcel",
    format: "json",
    errorformat: "json",
    key: apiKey,
  });
  const payload = VWorldResponseSchema.parse(await fetchJson(url, fetcher));
  const items = payload.response.result?.items ?? [];
  return {
    status: payload.response.status,
    meta: {
      totalCount: Number(payload.response.record?.total ?? items.length),
      count: items.length,
    },
    addresses: items.map((item) => ({
      roadAddress: item.address.road ?? "",
      jibunAddress: item.address.parcel ?? item.address.road ?? "",
      englishAddress: "",
      x: String(item.point.x),
      y: String(item.point.y),
    })),
  };
};

const toWgs84 = (xValue: string | number, yValue: string | number) => {
  const x = Number(xValue);
  const y = Number(yValue);
  if (x >= 120 && x <= 135 && y >= 30 && y <= 40) return { x: String(x), y: String(y) };
  const [lng, lat] = proj4(EPSG_5179, "EPSG:4326", [x, y]);
  return { x: String(lng), y: String(lat) };
};

const searchJusoRoad = async (
  query: string,
  roadApiKey: string,
  coordApiKey: string,
  fetcher: typeof fetch,
): Promise<GeocodeResponse> => {
  const searchUrl = buildOpenApiUrl(JUSO_SEARCH_ENDPOINT, {
    confmKey: roadApiKey,
    currentPage: 1,
    countPerPage: 20,
    keyword: query,
    resultType: "json",
  });
  const searchPayload = JusoSearchResponseSchema.parse(await fetchJson(searchUrl, fetcher));
  if (searchPayload.results.common.errorCode !== "0") {
    throw new Error(searchPayload.results.common.errorMessage ?? "Juso address search failed");
  }
  const rows = (searchPayload.results.juso ?? []).slice(0, 5);
  const addresses = await Promise.all(
    rows.map(async (row) => {
      const coordUrl = buildOpenApiUrl(JUSO_COORD_ENDPOINT, {
        confmKey: coordApiKey,
        admCd: row.admCd,
        rnMgtSn: row.rnMgtSn,
        udrtYn: row.udrtYn,
        buldMnnm: row.buldMnnm,
        buldSlno: row.buldSlno,
        resultType: "json",
      });
      const coordPayload = JusoCoordResponseSchema.parse(await fetchJson(coordUrl, fetcher));
      if (coordPayload.results.common.errorCode !== "0") return null;
      const coordinate = coordPayload.results.juso?.[0];
      if (!coordinate) return null;
      const point = toWgs84(coordinate.entX, coordinate.entY);
      return {
        roadAddress: row.roadAddr,
        jibunAddress: row.jibunAddr ?? row.roadAddr,
        englishAddress: "",
        x: point.x,
        y: point.y,
      };
    }),
  );
  const resolved = addresses.filter((address): address is NonNullable<typeof address> => address !== null);
  return {
    status: "OK",
    meta: {
      totalCount: Number(searchPayload.results.common.totalCount ?? resolved.length),
      count: resolved.length,
    },
    addresses: resolved,
  };
};

export const searchOfficialFarmMapAddress = async (
  query: string,
  type: FarmAddressSearchType,
  config: OfficialAddressSearchConfig = {},
): Promise<GeocodeResponse> => {
  const fetcher = config.fetcher ?? fetch;
  const fallbackGeocoder = config.fallbackGeocoder ?? geocodeAddress;
  if (type === "PARCEL") {
    const apiKey =
      config.vworldApiKey ??
      readOptionalServerEnv({ source: "VWORLD", names: ["VWORLD_API_KEY", "VITE_VWORLD_API_KEY"] });
    if (apiKey) return searchVWorldParcel(query, apiKey, fetcher);
  } else {
    const roadApiKey =
      config.jusoRoadApiKey ??
      readOptionalServerEnv({ source: "JUSO", names: ["JUSO_ROAD_API_KEY", "JUSO_API_KEY"] });
    const coordApiKey =
      config.jusoCoordApiKey ??
      readOptionalServerEnv({ source: "JUSO", names: ["JUSO_COORD_API_KEY", "JUSO_API_KEY"] });
    if (roadApiKey && coordApiKey) return searchJusoRoad(query, roadApiKey, coordApiKey, fetcher);
  }
  return fallbackGeocoder(query);
};
