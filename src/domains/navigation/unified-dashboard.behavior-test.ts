import { readFileSync } from "node:fs";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const indexRoute = readSource("../../routes/index.tsx");
const farmerRoute = readSource("../../routes/farmer.tsx");
const appShell = readSource("../../components/app-shell.tsx");
const dashboard = readSource("../../components/unified-dashboard.tsx");
const dashboardAnalysisCards = readSource("../../components/dashboard-analysis-cards.tsx");
const dashboardSnapshotHook = readSource("../../components/use-dashboard-analysis-snapshot.ts");
const alertsRoute = readSource("../../routes/alerts.tsx");
const adminRoute = readSource("../../routes/admin.tsx");
const adminRentalsRoute = readSource("../../routes/admin.rentals.tsx");
const analyzeFunctions = readSource("../../lib/api/analyze.functions.ts");

assert(/component:\s*UnifiedDashboard/.test(indexRoute), "root route must render the unified dashboard");
assert(
  /throw redirect\(\{\s*to:\s*["']\/["']\s*}\)/.test(farmerRoute),
  "legacy farmer route must redirect to the unified dashboard",
);

const directNavigationLinks = appShell.match(/to=\{tab\.to\}\s+reloadDocument/g) ?? [];
assert(
  directNavigationLinks.length === 0,
  "dashboard menus must use SPA navigation so in-memory analysis cache survives route changes",
);
assert(!appShell.includes('to: "/admin"'), "app navigation must not expose regional operations");
assert(!appShell.includes("Users"), "app navigation must not import the regional operations icon");
assert(appShell.includes("grid-cols-3"), "mobile navigation must fit the remaining three tabs");

assert(!dashboard.includes("22.4"), "dashboard must not render fabricated weather values");
assert(!dashboard.includes("65)"), "dashboard must not render a fabricated risk score");
assert(
  dashboard.includes("DashboardAnalysisCards"),
  "dashboard must render the live farm analysis cards",
);
assert(
  !dashboard.includes("ApiDecisionPreviewPanel"),
  "empty dashboard must not render fixed PERS/KAMIS sample preview data",
);
assert(
  dashboardAnalysisCards.includes("useDashboardAnalysisSnapshot"),
  "dashboard analysis must persist completed snapshots",
);
assert(
  /useDashboardAnalysisSnapshot\(\s*farm,\s*query\.isFetchedAfterMount \? query\.data : undefined,\s*\)/.test(
    dashboardAnalysisCards,
  ),
  "dashboard analysis must not persist snapshots again when rendering cached data after navigation",
);
assert(
  !dashboardSnapshotHook.includes("[analysis, farm]") &&
    dashboardSnapshotHook.includes("farm.id") &&
    dashboardSnapshotHook.includes("farm.name") &&
    dashboardSnapshotHook.includes("farm.region") &&
    dashboardSnapshotHook.includes("farm.crop"),
  "dashboard snapshot persistence must not rerun only because the farm object identity changed",
);
assert(
  dashboardAnalysisCards.includes("readDashboardAnalysisCache") &&
    dashboardAnalysisCards.includes("writeDashboardAnalysisCache"),
  "dashboard analysis must reuse a fresh cached result before calling external APIs",
);
assert(
  dashboardAnalysisCards.includes("clearDashboardAnalysisCache"),
  "dashboard analysis must clear cached data when the API call fails",
);
assert(
  dashboardAnalysisCards.includes("FarmDecisionSummaryCard") &&
    dashboardAnalysisCards.includes("buildFarmDecisionSummary"),
  "dashboard analysis must surface the combined PERS/KAMIS decision summary",
);
assert(!analyzeFunctions.includes("weather?.temp ?? 25.0"), "analysis must not invent temperature");
assert(!analyzeFunctions.includes("weather?.hum ?? 60"), "analysis must not invent humidity");
assert(!analyzeFunctions.includes("weather?.wind ?? 2.5"), "analysis must not invent wind speed");
assert(!alertsRoute.includes("const ALERTS"), "alerts route must not render fabricated alert records");
assert(
  alertsRoute.includes("loadAnalysisSnapshots"),
  "alerts route must load persisted analysis snapshots",
);

assert(
  adminRoute.includes("redirect") && /to:\s*["']\/["']/.test(adminRoute),
  "retired admin route must redirect to the unified dashboard",
);
assert(
  adminRentalsRoute.includes("redirect") && /to:\s*["']\/["']/.test(adminRentalsRoute),
  "retired admin rentals route must redirect to the unified dashboard",
);
assert(
  !adminRoute.includes("buildRegionalOperations") && !adminRoute.includes("loadAnalysisSnapshots"),
  "retired admin route must not load regional operations data",
);

console.log("unified dashboard behavior tests passed");
