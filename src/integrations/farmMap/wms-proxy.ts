import { buildFarmMapWmsUrl } from "./wms-contract";

interface FarmMapWmsProxyConfig {
  apiKey: string;
  domain: string;
  fetcher?: typeof fetch;
}

const FARMMAP_PROXY_TIMEOUT_MS = 15_000;
const FARMMAP_PROXY_ATTEMPTS = 2;

const readParameter = (url: URL, name: string) => {
  for (const [key, value] of url.searchParams) {
    if (key.toLowerCase() === name.toLowerCase()) return value;
  }
  return "";
};

const readDimension = (url: URL, name: string) => {
  const value = Number.parseInt(readParameter(url, name), 10);
  return Number.isInteger(value) && value >= 1 && value <= 1024 ? value : null;
};

const isValidBbox = (bbox: string) => {
  const values = bbox.split(",").map(Number);
  return (
    values.length === 4 &&
    values.every(Number.isFinite) &&
    values[0]! < values[2]! &&
    values[1]! < values[3]!
  );
};

const fetchFarmMapUpstream = async (url: string, fetcher: typeof fetch) => {
  let lastError: unknown;
  for (let attempt = 0; attempt < FARMMAP_PROXY_ATTEMPTS; attempt += 1) {
    try {
      return await fetcher(url, {
        signal: AbortSignal.timeout(FARMMAP_PROXY_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

export const proxyFarmMapWms = async (
  request: Request,
  config: FarmMapWmsProxyConfig,
): Promise<Response> => {
  const requestUrl = new URL(request.url);
  const bbox = readParameter(requestUrl, "bbox");
  const width = readDimension(requestUrl, "width");
  const height = readDimension(requestUrl, "height");
  if (!isValidBbox(bbox) || width === null || height === null) {
    return new Response("Invalid FarmMap WMS tile request", { status: 400 });
  }

  const upstreamUrl = buildFarmMapWmsUrl(config.apiKey, config.domain, {
    bbox,
    width,
    height,
  });
  const upstream = await fetchFarmMapUpstream(upstreamUrl, config.fetcher ?? fetch);

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/png",
      "cache-control": upstream.ok
        ? "public, max-age=86400, stale-while-revalidate=604800"
        : "no-store",
    },
  });
};
