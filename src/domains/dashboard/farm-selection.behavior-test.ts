export {};

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

type FarmSelector = (farms: Array<{ id: string }>, selectedFarmId: string | null) => string | null;

const modulePath = "./farm-selection.ts";
const selectionModule = await import(modulePath).catch(() => null);
const resolveDashboardFarmId = (selectionModule as { resolveDashboardFarmId?: FarmSelector } | null)
  ?.resolveDashboardFarmId;

assert(typeof resolveDashboardFarmId === "function", "dashboard farm selector must be implemented");
if (!resolveDashboardFarmId) throw new Error("dashboard farm selector is unavailable");

const farms = [{ id: "farm-1" }, { id: "farm-2" }];
assert(
  resolveDashboardFarmId(farms, "farm-2") === "farm-2",
  "a valid selected farm must be preserved",
);
assert(
  resolveDashboardFarmId(farms, "missing") === "farm-1",
  "an invalid selection must fall back to the first farm",
);
assert(resolveDashboardFarmId([], "farm-1") === null, "empty farms must clear selection");

console.log("dashboard farm selection behavior tests passed");
