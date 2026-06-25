import {
  mergeAnalysisSnapshots,
  type AnalysisSnapshot,
} from "@/domains/analysis/snapshot-operations";
import type { AuthenticatedUser } from "@/domains/auth/role";
import type { AnalysisSourceStatus } from "@/domains/reports/report-generation";
import type { RiskLevel, WorkType } from "@/domains/shared/types";
import { supabase } from "./client";
import { ensureSupabaseIdentity } from "./session";

const LEGACY_STORAGE_KEY = "farmsync.analysis-snapshots.v1";
const MAX_LOCAL_SNAPSHOTS = 200;

export type AnalysisSnapshotDataSource = "SUPABASE" | "SUPABASE_LOCAL" | "LOCAL" | "EMPTY";

export interface AnalysisSnapshotLoadResult {
  snapshots: AnalysisSnapshot[];
  source: AnalysisSnapshotDataSource;
  warning: string | null;
}

interface SnapshotRow {
  id: string;
  farm_id: string;
  farm_name: string;
  region: string;
  crop: string;
  score: number | null;
  level: string;
  weather: AnalysisSnapshot["weather"];
  source_status: AnalysisSourceStatus;
  pest_count: number;
  recommended_works: string[];
  analyzed_at: string;
}

type QueryResult<T> = PromiseLike<{
  data: T | null;
  error: { message?: string } | null;
}>;

interface SnapshotTable {
  upsert: (row: SnapshotRow, options: { onConflict: string }) => QueryResult<null>;
  select: (columns: string) => {
    order: (
      column: string,
      options: { ascending: boolean },
    ) => { limit: (count: number) => QueryResult<SnapshotRow[]> };
  };
}

const getSnapshotTable = () =>
  (supabase as unknown as { from: (table: string) => SnapshotTable }).from("analysis_snapshots");

const getStorageKey = (identity: AuthenticatedUser | null) =>
  identity ? `${LEGACY_STORAGE_KEY}.${identity.id}` : `${LEGACY_STORAGE_KEY}.device`;

const parseLocalSnapshots = (identity: AuthenticatedUser | null): AnalysisSnapshot[] => {
  if (typeof window === "undefined") return [];
  try {
    const storageKey = getStorageKey(identity);
    let raw = localStorage.getItem(storageKey);
    if (!raw && identity?.isAnonymous) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) localStorage.setItem(storageKey, raw);
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AnalysisSnapshot[]) : [];
  } catch {
    return [];
  }
};

const writeLocalSnapshots = (
  identity: AuthenticatedUser | null,
  snapshots: AnalysisSnapshot[],
): boolean => {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(
      getStorageKey(identity),
      JSON.stringify(snapshots.slice(0, MAX_LOCAL_SNAPSHOTS)),
    );
    return true;
  } catch {
    return false;
  }
};

const toRow = (snapshot: AnalysisSnapshot): SnapshotRow => ({
  id: snapshot.id,
  farm_id: snapshot.farmId,
  farm_name: snapshot.farmName,
  region: snapshot.region,
  crop: snapshot.crop,
  score: snapshot.score,
  level: snapshot.level,
  weather: snapshot.weather,
  source_status: snapshot.sourceStatus,
  pest_count: snapshot.pestCount,
  recommended_works: snapshot.recommendedWorks,
  analyzed_at: snapshot.analyzedAt,
});

const toRiskLevel = (value: string): RiskLevel => {
  if (value === "SAFE" || value === "WATCH" || value === "WARNING" || value === "CRITICAL") {
    return value;
  }
  return "UNKNOWN";
};

const fromRow = (row: SnapshotRow): AnalysisSnapshot => ({
  id: row.id,
  farmId: row.farm_id,
  farmName: row.farm_name,
  region: row.region,
  crop: row.crop,
  score: row.score,
  level: toRiskLevel(row.level),
  weather: row.weather,
  sourceStatus: row.source_status,
  pestCount: row.pest_count,
  recommendedWorks: row.recommended_works as WorkType[],
  analyzedAt: row.analyzed_at,
});

export const saveAnalysisSnapshot = async (
  snapshot: AnalysisSnapshot,
): Promise<{ source: "SUPABASE" | "LOCAL" | "FAILED"; warning: string | null }> => {
  const identity = await ensureSupabaseIdentity();
  const localSaved = writeLocalSnapshots(
    identity,
    mergeAnalysisSnapshots([snapshot], parseLocalSnapshots(identity)),
  );

  if (!identity) {
    return localSaved
      ? {
          source: "LOCAL",
          warning: "Supabase 인증을 사용할 수 없어 브라우저에 분석 스냅샷을 저장했습니다.",
        }
      : {
          source: "FAILED",
          warning: "Supabase와 브라우저 저장소 모두에 분석 스냅샷을 저장하지 못했습니다.",
        };
  }

  try {
    const { error } = await getSnapshotTable().upsert(toRow(snapshot), { onConflict: "id" });
    if (error) throw new Error(error.message || "Supabase snapshot upsert failed");
    return {
      source: "SUPABASE",
      warning: localSaved ? null : "브라우저 저장소에는 스냅샷을 저장하지 못했습니다.",
    };
  } catch {
    if (!localSaved) {
      return {
        source: "FAILED",
        warning: "Supabase와 브라우저 저장소 모두에 분석 스냅샷을 저장하지 못했습니다.",
      };
    }
    return {
      source: "LOCAL",
      warning: "분석 스냅샷을 브라우저에 저장했습니다. Supabase 마이그레이션 적용이 필요합니다.",
    };
  }
};

export const loadAnalysisSnapshots = async (): Promise<AnalysisSnapshotLoadResult> => {
  const identity = await ensureSupabaseIdentity();
  const localSnapshots = parseLocalSnapshots(identity);

  if (!identity) {
    return {
      snapshots: localSnapshots,
      source: localSnapshots.length > 0 ? "LOCAL" : "EMPTY",
      warning: "Supabase 인증을 사용할 수 없어 브라우저 저장 데이터를 사용합니다.",
    };
  }

  try {
    const { data, error } = await getSnapshotTable()
      .select("*")
      .order("analyzed_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message || "Supabase snapshot read failed");

    const remoteSnapshots = (data ?? []).map(fromRow);
    const snapshots = mergeAnalysisSnapshots(remoteSnapshots, localSnapshots);
    if (snapshots.length === 0) return { snapshots: [], source: "EMPTY", warning: null };
    return {
      snapshots,
      source: localSnapshots.some(
        (local) => !remoteSnapshots.some((remote) => remote.id === local.id),
      )
        ? "SUPABASE_LOCAL"
        : "SUPABASE",
      warning: null,
    };
  } catch {
    return {
      snapshots: localSnapshots,
      source: localSnapshots.length > 0 ? "LOCAL" : "EMPTY",
      warning:
        localSnapshots.length > 0
          ? "Supabase 스냅샷을 읽지 못해 브라우저 저장 데이터를 사용합니다."
          : "저장된 분석 스냅샷이 없습니다. 농장 분석을 먼저 실행하세요.",
    };
  }
};
