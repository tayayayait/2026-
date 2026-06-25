import type { FarmDataSource } from "./store";

export const FARMS_CACHE_TTL_MS = 5 * 60 * 1000;

export const shouldLoadFarms = ({
  loading,
  source,
  loadedAt,
  nowMs,
  force = false,
  maxAgeMs = FARMS_CACHE_TTL_MS,
}: {
  loading: boolean;
  source: FarmDataSource;
  loadedAt: number | null;
  nowMs: number;
  force?: boolean;
  maxAgeMs?: number;
}) => {
  if (loading) return false;
  if (force) return true;
  if (source === "ERROR") return true;
  if (loadedAt === null) return true;
  return nowMs - loadedAt >= maxAgeMs;
};
