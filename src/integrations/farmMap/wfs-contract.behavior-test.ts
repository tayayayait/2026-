import { buildFarmMapWfsUrl } from "./wfs-contract";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const url = new URL(
  buildFarmMapWfsUrl("server-secret-key", "registered.example", {
    bbox: {
      minLng: 126.8,
      minLat: 35.8,
      maxLng: 126.9,
      maxLat: 35.9,
    },
  }),
);

assert(url.searchParams.get("service") === "WFS", "WFS service parameter mismatch");
assert(url.searchParams.get("version") === "2.0.0", "WFS version parameter mismatch");
assert(url.searchParams.get("request") === "GetFeature", "WFS request parameter mismatch");
assert(url.searchParams.get("typename") === "farm_map_api", "WFS typename must follow guide");
assert(url.searchParams.get("outputformat") === "json", "WFS outputformat must be json");
assert(url.searchParams.get("count") === "200", "WFS count must use the documented maximum");
assert(url.searchParams.get("srsname") === "EPSG:4326", "WFS response CRS mismatch");
assert(
  url.searchParams.get("bbox") === "35.8,126.8,35.9,126.9,EPSG:4326",
  "EPSG:4326 WFS bbox must use latitude/longitude axis order and include CRS",
);
assert(url.searchParams.get("apiKey") === "server-secret-key", "WFS API key mismatch");
assert(url.searchParams.get("domain") === "registered.example", "WFS domain mismatch");

console.log("FarmMap WFS contract behavior tests passed");
