import { z } from "zod";
import { buildOpenApiUrl, readOptionalServerEnv } from "@/integrations/openapi";

export const GeocodeResponseSchema = z.object({
  status: z.string(),
  meta: z
    .object({
      totalCount: z.number().optional(),
      count: z.number().optional(),
    })
    .optional(),
  addresses: z.array(
    z.object({
      roadAddress: z.string(),
      jibunAddress: z.string(),
      englishAddress: z.string(),
      x: z.string(),
      y: z.string(),
      distance: z.number().optional(),
    }),
  ),
  errorMessage: z.string().optional(),
});

export type GeocodeResponse = z.infer<typeof GeocodeResponseSchema>;

const NominatimAddressSchema = z.object({
  state: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  borough: z.string().optional(),
  municipality: z.string().optional(),
  town: z.string().optional(),
  village: z.string().optional(),
  suburb: z.string().optional(),
  quarter: z.string().optional(),
  neighbourhood: z.string().optional(),
  road: z.string().optional(),
  house_number: z.string().optional(),
  country: z.string().optional(),
  country_code: z.string().optional(),
});

const NominatimResponseSchema = z.array(
  z.object({
    lat: z.string(),
    lon: z.string(),
    display_name: z.string(),
    address: NominatimAddressSchema.optional(),
  }),
);

interface GeocodeConfig {
  clientId?: string | null;
  clientSecret?: string | null;
  fetcher?: typeof fetch;
  nominatimEndpoint?: string;
}

const NOMINATIM_DEFAULT_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NOMINATIM_MIN_INTERVAL_MS = 1_000;
const nominatimCache = new Map<string, { expiresAt: number; response: GeocodeResponse }>();
let nominatimLastRequestAt = 0;
let nominatimRequestChain: Promise<void> = Promise.resolve();

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const normalizeNominatimAddress = (
  address: z.infer<typeof NominatimAddressSchema> | undefined,
  displayName: string,
) => {
  const orderedParts = [
    address?.state,
    address?.city,
    address?.county,
    address?.borough,
    address?.municipality,
    address?.town,
    address?.village,
    address?.suburb,
    address?.quarter,
    address?.neighbourhood,
    address?.road,
    address?.house_number,
  ].filter((value): value is string => Boolean(value?.trim()));
  const uniqueParts = orderedParts.filter(
    (value, index) => orderedParts.indexOf(value) === index,
  );
  return uniqueParts.length > 0
    ? uniqueParts.join(" ")
    : displayName
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part && part !== "대한민국")
        .reverse()
        .join(" ");
};

const searchNominatim = async (
  query: string,
  fetcher: typeof fetch,
  endpoint: string,
): Promise<GeocodeResponse> => {
  const cacheKey = query.trim().replace(/\s+/g, " ").toLowerCase();
  const cached = nominatimCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.response;

  let releaseQueue: () => void = () => undefined;
  const previousRequest = nominatimRequestChain;
  nominatimRequestChain = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });

  await previousRequest;
  try {
    const cachedAfterWait = nominatimCache.get(cacheKey);
    if (cachedAfterWait && cachedAfterWait.expiresAt > Date.now()) {
      return cachedAfterWait.response;
    }

    const delay = Math.max(
      0,
      NOMINATIM_MIN_INTERVAL_MS - (Date.now() - nominatimLastRequestAt),
    );
    if (delay > 0) await wait(delay);

    const url = buildOpenApiUrl(endpoint, {
      q: query,
      format: "jsonv2",
      addressdetails: 1,
      countrycodes: "kr",
      limit: 5,
      "accept-language": "ko",
    });
    const response = await fetcher(url, {
      headers: {
        "User-Agent": "Farm-Sync/1.0 address-search",
        "Accept-Language": "ko",
      },
      signal: AbortSignal.timeout(15_000),
    });
    nominatimLastRequestAt = Date.now();
    if (!response.ok) {
      throw new Error(`Nominatim Geocoding API error: ${response.status} ${response.statusText}`);
    }

    const results = NominatimResponseSchema.parse(await response.json());
    const addresses = results.map((result) => {
      const normalizedAddress = normalizeNominatimAddress(
        result.address,
        result.display_name,
      );
      return {
        roadAddress: normalizedAddress,
        jibunAddress: normalizedAddress,
        englishAddress: "",
        x: result.lon,
        y: result.lat,
      };
    });
    const normalized: GeocodeResponse = {
      status: "OK",
      meta: {
        totalCount: addresses.length,
        count: addresses.length,
      },
      addresses,
    };
    nominatimCache.set(cacheKey, {
      expiresAt: Date.now() + NOMINATIM_CACHE_TTL_MS,
      response: normalized,
    });
    return normalized;
  } finally {
    releaseQueue();
  }
};

export const geocodeAddress = async (
  query: string,
  config: GeocodeConfig = {},
): Promise<GeocodeResponse> => {
  const clientId =
    config.clientId ??
    readOptionalServerEnv({
      source: "NAVER",
      names: ["NAVER_CLIENT_ID", "NAVER_MAPS_KEY_ID"],
    });
  const clientSecret =
    config.clientSecret ??
    readOptionalServerEnv({
      source: "NAVER",
      names: ["NAVER_CLIENT_SECRET", "NAVER_MAPS_KEY"],
    });
  const fetcher = config.fetcher ?? fetch;
  const nominatimEndpoint =
    config.nominatimEndpoint ??
    readOptionalServerEnv({
      source: "NAVER",
      names: ["NOMINATIM_GEOCODE_URL"],
    }) ??
    NOMINATIM_DEFAULT_ENDPOINT;

  if (!clientId || !clientSecret) {
    return searchNominatim(query, fetcher, nominatimEndpoint);
  }

  const url = buildOpenApiUrl("https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode", {
    query,
  });

  const response = await fetcher(url, {
    method: "GET",
    headers: {
      "X-NCP-APIGW-API-KEY-ID": clientId,
      "X-NCP-APIGW-API-KEY": clientSecret,
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return searchNominatim(query, fetcher, nominatimEndpoint);
    }
    throw new Error(`Naver Geocoding API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return GeocodeResponseSchema.parse(data);
};
