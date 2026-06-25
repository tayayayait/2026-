import { readOptionalServerEnv } from "../openapi";

interface NcpmsProxyConfig {
  fetcher?: typeof fetch;
}

const NCPMS_SERVICE_URL = "http://ncpms.rda.go.kr/npmsAPI/service";
const NCPMS_PROXY_TIMEOUT_MS = 15_000;

const passthroughHeaders = ["content-type", "cache-control"];
const corsHeaders: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "Content-Type",
};

const buildUpstreamUrl = (requestUrl: URL): string => {
  const params = new URLSearchParams(requestUrl.searchParams);
  // 가이드 fore_ajax_callback.jsp: 프록시 전환 시 serviceType=AA001 을 강제로 붙임
  if (!params.has("serviceType")) params.set("serviceType", "AA001");
  return `${NCPMS_SERVICE_URL}?${params.toString()}`;
};

export const proxyNcpmsOpenApi = async (
  request: Request,
  config: NcpmsProxyConfig = {},
): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const apiKey = readOptionalServerEnv({ source: "NCPMS", names: ["NCPMS_API_KEY"] });
  if (!apiKey) {
    return new Response("NCPMS OpenAPI is not configured", { status: 503, headers: corsHeaders });
  }

  const requestUrl = new URL(request.url);
  // 클라이언트는 apiKey 를 보내지 않으므로 서버 측 키로 채운다.
  requestUrl.searchParams.set("apiKey", apiKey);

  const upstreamUrl = buildUpstreamUrl(requestUrl);
  const fetcher = config.fetcher ?? fetch;

  let upstream: Response;
  try {
    upstream = await fetcher(upstreamUrl, {
      signal: AbortSignal.timeout(NCPMS_PROXY_TIMEOUT_MS),
    });
  } catch {
    return new Response("NCPMS upstream unreachable", { status: 502 });
  }

  const headers = new Headers();
  for (const name of passthroughHeaders) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  for (const [name, value] of Object.entries(corsHeaders)) {
    headers.set(name, value);
  }
  if (!headers.has("content-type")) headers.set("content-type", "text/xml; charset=utf-8");

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
};
