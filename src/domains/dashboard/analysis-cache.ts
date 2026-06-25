export const DASHBOARD_ANALYSIS_CACHE_TTL_MS = 5 * 60 * 1000;

export interface DashboardAnalysisCacheStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

interface DashboardAnalysisCacheEntry<T> {
  data: T;
  storedAt: number;
}

export const createDashboardAnalysisCacheKey = (farmId: string) =>
  `farmsync.dashboard.analysis.${farmId}.v1`;

const isCacheEntry = <T>(value: unknown): value is DashboardAnalysisCacheEntry<T> => {
  if (!value || typeof value !== "object") return false;
  const entry = value as { data?: unknown; storedAt?: unknown };
  return entry.data !== undefined && typeof entry.storedAt === "number";
};

export const readDashboardAnalysisCache = <T>(
  storage: DashboardAnalysisCacheStorage | null,
  farmId: string,
  nowMs: number,
  maxAgeMs = DASHBOARD_ANALYSIS_CACHE_TTL_MS,
): DashboardAnalysisCacheEntry<T> | null => {
  if (!storage) return null;
  const key = createDashboardAnalysisCacheKey(farmId);
  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isCacheEntry<T>(parsed)) {
      storage.removeItem(key);
      return null;
    }
    if (nowMs - parsed.storedAt >= maxAgeMs) {
      storage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    storage.removeItem(key);
    return null;
  }
};

export const writeDashboardAnalysisCache = <T>(
  storage: DashboardAnalysisCacheStorage | null,
  farmId: string,
  data: T,
  storedAt: number,
) => {
  if (!storage) return;
  storage.setItem(createDashboardAnalysisCacheKey(farmId), JSON.stringify({ data, storedAt }));
};

export const clearDashboardAnalysisCache = (
  storage: DashboardAnalysisCacheStorage | null,
  farmId: string,
) => {
  if (!storage) return;
  storage.removeItem(createDashboardAnalysisCacheKey(farmId));
};
