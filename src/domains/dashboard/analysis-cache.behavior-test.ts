export {};

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

interface MemoryStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

const createMemoryStorage = (): MemoryStorage => {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

interface CacheModule {
  DASHBOARD_ANALYSIS_CACHE_TTL_MS: number;
  createDashboardAnalysisCacheKey: (farmId: string) => string;
  readDashboardAnalysisCache: <T>(
    storage: MemoryStorage | null,
    farmId: string,
    nowMs: number,
    maxAgeMs?: number,
  ) => { data: T; storedAt: number } | null;
  writeDashboardAnalysisCache: <T>(
    storage: MemoryStorage | null,
    farmId: string,
    data: T,
    storedAt: number,
  ) => void;
  clearDashboardAnalysisCache: (storage: MemoryStorage | null, farmId: string) => void;
}

const modulePath = "./analysis-cache.ts";
const cacheModule = (await import(modulePath).catch(() => null)) as CacheModule | null;
assert(cacheModule !== null, "dashboard analysis cache module must be implemented");
if (!cacheModule) throw new Error("dashboard analysis cache module is unavailable");

const {
  DASHBOARD_ANALYSIS_CACHE_TTL_MS,
  createDashboardAnalysisCacheKey,
  readDashboardAnalysisCache,
  writeDashboardAnalysisCache,
  clearDashboardAnalysisCache,
} = cacheModule;

assert(
  DASHBOARD_ANALYSIS_CACHE_TTL_MS > 0,
  "dashboard analysis cache must define a positive TTL",
);

const storage = createMemoryStorage();
const storedAt = 1_000;
const analysis = {
  analyzedAt: "2026-06-25T09:00:00+09:00",
  riskResult: null,
  weather: null,
  sourceStatus: { weather: "FAILED", agriWeather: "FAILED", pests: "FAILED" },
  pests: [],
};

assert(
  readDashboardAnalysisCache<typeof analysis>(storage, "farm-1", storedAt) === null,
  "missing cache must force an API call",
);

writeDashboardAnalysisCache(storage, "farm-1", analysis, storedAt);
const fresh = readDashboardAnalysisCache<typeof analysis>(
  storage,
  "farm-1",
  storedAt + DASHBOARD_ANALYSIS_CACHE_TTL_MS - 1,
);
if (!fresh) throw new Error("fresh cache must be available");
assert(
  fresh.data.analyzedAt === analysis.analyzedAt,
  "fresh cache must be reused for the same farm",
);
assert(fresh.storedAt === storedAt, "cache must preserve the successful fetch time");
assert(
  readDashboardAnalysisCache<typeof analysis>(
    storage,
    "farm-1",
    storedAt + DASHBOARD_ANALYSIS_CACHE_TTL_MS,
  ) === null,
  "expired cache must force a new API call",
);
assert(
  readDashboardAnalysisCache<typeof analysis>(storage, "farm-2", storedAt + 1) === null,
  "changing the analysis farm must use a separate cache entry",
);

writeDashboardAnalysisCache(storage, "farm-1", analysis, storedAt);
clearDashboardAnalysisCache(storage, "farm-1");
assert(
  readDashboardAnalysisCache<typeof analysis>(storage, "farm-1", storedAt + 1) === null,
  "failed API calls must clear cached results so the next entry retries",
);

storage.setItem(createDashboardAnalysisCacheKey("farm-3"), "{");
assert(
  readDashboardAnalysisCache<typeof analysis>(storage, "farm-3", storedAt + 1) === null,
  "invalid cached payloads must be ignored",
);

console.log("dashboard analysis cache behavior tests passed");
