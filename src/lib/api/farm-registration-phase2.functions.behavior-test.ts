import assert from "node:assert/strict";

const farmMapFunctions = await import("./farm-map.functions");
const standardRegionFunctions = await import("./standard-region.functions").catch(() => ({}));

assert.equal(
  typeof Reflect.get(farmMapFunctions, "searchFarmParcelCandidates"),
  "function",
  "TanStack server API must expose all parcel search modes",
);
assert.equal(
  typeof Reflect.get(standardRegionFunctions, "searchStandardRegionCodes"),
  "function",
  "TanStack server API must expose legal-district search",
);
assert.equal(
  typeof Reflect.get(standardRegionFunctions, "getStandardRegionTree"),
  "function",
  "TanStack server API must expose legal-district hierarchy data",
);

console.log("farm registration Phase 2 server function contract tests passed");
