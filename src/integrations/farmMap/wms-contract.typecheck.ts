export {};

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const modulePath = "./wms-contract";
let wmsContract: Record<string, unknown> = {};
try {
  wmsContract = (await import(modulePath)) as Record<string, unknown>;
} catch {
  // RED: the production contract does not exist yet.
}

const buildFarmMapWmsUrl = wmsContract.buildFarmMapWmsUrl as
  | ((
      apiKey: string,
      domain: string,
      input: { bbox: string; width: number; height: number },
    ) => string)
  | undefined;

assert(typeof buildFarmMapWmsUrl === "function", "FarmMap WMS URL builder must be implemented");
if (!buildFarmMapWmsUrl) throw new Error("FarmMap WMS URL builder is unavailable");

const url = new URL(
  buildFarmMapWmsUrl("test-key", "registered.example", {
    bbox: "14172036,4364860,14173259,4366083",
    width: 256,
    height: 256,
  }),
);

assert(url.pathname.endsWith("/farmmapApi/wms.do"), "FarmMap WMS endpoint mismatch");
assert(url.searchParams.get("service") === "WMS", "FarmMap WMS service mismatch");
assert(url.searchParams.get("request") === "GetMap", "FarmMap WMS request mismatch");
assert(url.searchParams.get("version") === "1.1.1", "FarmMap WMS version mismatch");
assert(url.searchParams.get("format") === "image/png", "FarmMap WMS format mismatch");
assert(url.searchParams.get("transparent") === "true", "FarmMap WMS transparency mismatch");
assert(url.searchParams.get("layers") === "farm_map_api", "FarmMap WMS layer mismatch");
assert(url.searchParams.get("styles") === "01", "FarmMap WMS style mismatch");
assert(url.searchParams.get("landcd") === "01,02,03,04", "FarmMap WMS land codes mismatch");
assert(url.searchParams.get("crs") === "EPSG:3857", "FarmMap WMS CRS mismatch");
assert(
  url.searchParams.get("bbox") === "14172036,4364860,14173259,4366083",
  "FarmMap WMS BBOX mismatch",
);
assert(url.searchParams.get("width") === "256", "FarmMap WMS width mismatch");
assert(url.searchParams.get("height") === "256", "FarmMap WMS height mismatch");
assert(url.searchParams.get("apiKey") === "test-key", "FarmMap WMS API key mismatch");
assert(url.searchParams.get("domain") === "registered.example", "FarmMap WMS domain mismatch");

console.log("FarmMap WMS contract tests passed");
