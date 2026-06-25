export {};

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const modulePath = "./wms-proxy";
let proxyModule: Record<string, unknown> = {};
try {
  proxyModule = (await import(modulePath)) as Record<string, unknown>;
} catch {
  // RED: the production proxy does not exist yet.
}

const proxyFarmMapWms = proxyModule.proxyFarmMapWms as
  | ((
      request: Request,
      config: { apiKey: string; domain: string; fetcher: typeof fetch },
    ) => Promise<Response>)
  | undefined;

assert(typeof proxyFarmMapWms === "function", "FarmMap WMS proxy must be implemented");
if (!proxyFarmMapWms) throw new Error("FarmMap WMS proxy is unavailable");

let upstreamUrl = "";
const fetcher: typeof fetch = async (input) => {
  upstreamUrl = String(input);
  return new Response(new Uint8Array([137, 80, 78, 71]), {
    status: 200,
    headers: { "content-type": "image/png" },
  });
};

const response = await proxyFarmMapWms(
  new Request(
    "https://farm-sync.example/api/farm-map/wms?bbox=14172036,4364860,14173259,4366083&width=256&height=256",
  ),
  { apiKey: "server-secret-key", domain: "registered.example", fetcher },
);

assert(response.status === 200, "FarmMap WMS proxy success status mismatch");
assert(response.headers.get("content-type") === "image/png", "FarmMap WMS content type mismatch");
assert(
  response.headers.get("cache-control")?.includes("max-age"),
  "FarmMap WMS cache header missing",
);
assert(
  upstreamUrl.includes("apiKey=server-secret-key"),
  "FarmMap WMS proxy must add server API key",
);
assert(upstreamUrl.includes("domain=registered.example"), "FarmMap WMS proxy must add domain");

const originalTimeout = AbortSignal.timeout;
let requestedTimeoutMs = 0;
AbortSignal.timeout = ((milliseconds: number) => {
  requestedTimeoutMs = milliseconds;
  return originalTimeout(milliseconds);
}) as typeof AbortSignal.timeout;
await proxyFarmMapWms(
  new Request(
    "https://farm-sync.example/api/farm-map/wms?bbox=14172036,4364860,14173259,4366083&width=256&height=256",
  ),
  { apiKey: "server-secret-key", domain: "registered.example", fetcher },
);
AbortSignal.timeout = originalTimeout;
assert(
  requestedTimeoutMs >= 15_000,
  "FarmMap WMS proxy must allow slow official tile responses before timing out",
);

let retryAttempts = 0;
const retryResponse = await proxyFarmMapWms(
  new Request(
    "https://farm-sync.example/api/farm-map/wms?bbox=14172036,4364860,14173259,4366083&width=256&height=256",
  ),
  {
    apiKey: "server-secret-key",
    domain: "registered.example",
    fetcher: async () => {
      retryAttempts += 1;
      if (retryAttempts === 1) throw new DOMException("upstream timed out", "TimeoutError");
      return new Response(new Uint8Array([137, 80, 78, 71]), {
        status: 200,
        headers: { "content-type": "image/png" },
      });
    },
  },
);

assert(retryAttempts === 2, "FarmMap WMS proxy must retry transient upstream failures once");
assert(retryResponse.status === 200, "FarmMap WMS proxy retry response status mismatch");

let invalidRequestFetched = false;
const invalidResponse = await proxyFarmMapWms(
  new Request("https://farm-sync.example/api/farm-map/wms?bbox=invalid&width=256&height=256"),
  {
    apiKey: "server-secret-key",
    domain: "registered.example",
    fetcher: async () => {
      invalidRequestFetched = true;
      return new Response();
    },
  },
);
assert(invalidResponse.status === 400, "invalid FarmMap WMS request must be rejected");
assert(!invalidRequestFetched, "invalid FarmMap WMS request must not reach upstream");

console.log("FarmMap WMS proxy behavior tests passed");
