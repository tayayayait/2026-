import { buildFarmMapWfsUrl } from "./wfs-contract";

interface FarmMapWfsProxyConfig {
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

export const proxyFarmMapWfs = async (
  request: Request,
  config: FarmMapWfsProxyConfig,
): Promise<Response> => {
  const requestUrl = new URL(request.url);
  const bbox = readParameter(requestUrl, "bbox");
  
  if (!isValidBbox(bbox)) {
    return new Response("Invalid FarmMap WFS feature request", { status: 400 });
  }

  const upstreamUrl = buildFarmMapWfsUrl(config.apiKey, config.domain, {
    bbox: {
      minLng: Number(bbox.split(",")[0]),
      minLat: Number(bbox.split(",")[1]),
      maxLng: Number(bbox.split(",")[2]),
      maxLat: Number(bbox.split(",")[3]),
    },
  });
  
  const upstream = await fetchFarmMapUpstream(upstreamUrl, config.fetcher ?? fetch);

  const payload = (await upstream
    .clone()
    .json()
    .catch(() => null)) as { status?: { result?: string; errorMsg?: string } } | null;
  if (payload?.status?.result === "F") {
    return Response.json(
      { error: payload.status.errorMsg ?? "FarmMap WFS request failed" },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": upstream.ok
        ? "public, max-age=300, stale-while-revalidate=3600" // 5 minutes cache
        : "no-store",
    },
  });
};
