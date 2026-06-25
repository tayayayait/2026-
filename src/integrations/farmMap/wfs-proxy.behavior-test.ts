import { proxyFarmMapWfs } from "./wfs-proxy";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

let upstreamUrl = "";
const success = await proxyFarmMapWfs(
  new Request(
    "https://farm-sync.example/api/farm-map/wfs?bbox=126.8,35.8,126.9,35.9",
  ),
  {
    apiKey: "server-secret-key",
    domain: "registered.example",
    fetcher: async (input) => {
      upstreamUrl = String(input);
      return new Response(JSON.stringify({ type: "FeatureCollection", features: [] }), {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    },
  },
);

assert(success.status === 200, "valid WFS response status mismatch");
assert(
  new URL(upstreamUrl).searchParams.get("bbox") ===
    "35.8,126.8,35.9,126.9,EPSG:4326",
  "WFS proxy must convert map bounds to the documented EPSG:4326 bbox",
);

const originalTimeout = AbortSignal.timeout;
let requestedTimeoutMs = 0;
AbortSignal.timeout = ((milliseconds: number) => {
  requestedTimeoutMs = milliseconds;
  return originalTimeout(milliseconds);
}) as typeof AbortSignal.timeout;
await proxyFarmMapWfs(
  new Request(
    "https://farm-sync.example/api/farm-map/wfs?bbox=126.8,35.8,126.9,35.9",
  ),
  {
    apiKey: "server-secret-key",
    domain: "registered.example",
    fetcher: async () =>
      new Response(JSON.stringify({ type: "FeatureCollection", features: [] }), {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
  },
);
AbortSignal.timeout = originalTimeout;
assert(
  requestedTimeoutMs >= 15_000,
  "FarmMap WFS proxy must allow slow official feature responses before timing out",
);

let retryAttempts = 0;
const retryResponse = await proxyFarmMapWfs(
  new Request(
    "https://farm-sync.example/api/farm-map/wfs?bbox=126.8,35.8,126.9,35.9",
  ),
  {
    apiKey: "server-secret-key",
    domain: "registered.example",
    fetcher: async () => {
      retryAttempts += 1;
      if (retryAttempts === 1) throw new DOMException("upstream timed out", "TimeoutError");
      return new Response(JSON.stringify({ type: "FeatureCollection", features: [] }), {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    },
  },
);

assert(retryAttempts === 2, "FarmMap WFS proxy must retry transient upstream failures once");
assert(retryResponse.status === 200, "FarmMap WFS proxy retry response status mismatch");

const applicationFailure = await proxyFarmMapWfs(
  new Request(
    "https://farm-sync.example/api/farm-map/wfs?bbox=126.8,35.8,126.9,35.9",
  ),
  {
    apiKey: "server-secret-key",
    domain: "registered.example",
    fetcher: async () =>
      new Response(
        JSON.stringify({ status: { result: "F", errorMsg: "invalid parameter" } }),
        { status: 200, headers: { "content-type": "text/plain" } },
      ),
  },
);

assert(
  applicationFailure.status === 502,
  "WFS application-level failure must not be exposed as HTTP 200",
);

console.log("FarmMap WFS proxy behavior tests passed");
