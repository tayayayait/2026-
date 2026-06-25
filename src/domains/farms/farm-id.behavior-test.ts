import assert from "node:assert/strict";

const farmIdModule = (await import("./farm-id.ts").catch(() => ({}))) as {
  createFarmId?: (source?: {
    randomUUID?: () => string;
    getRandomValues?: (values: Uint8Array) => Uint8Array;
  }) => string;
};

assert.equal(
  typeof farmIdModule.createFarmId,
  "function",
  "farm registration must provide a compatible ID generator",
);

if (farmIdModule.createFarmId) {
  const nativeId = "a7ab2f3e-5580-4b4e-9746-833c50f47f59";
  assert.equal(
    farmIdModule.createFarmId({ randomUUID: () => nativeId }),
    nativeId,
    "farm ID generation must use native randomUUID when available",
  );

  const compatibilityId = farmIdModule.createFarmId({
    getRandomValues: (values) => {
      values.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
      return values;
    },
  });
  assert.equal(
    compatibilityId,
    "00010203-0405-4607-8809-0a0b0c0d0e0f",
    "farm ID generation must work when randomUUID is unavailable",
  );
}

console.log("farm ID compatibility behavior tests passed");
