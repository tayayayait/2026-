import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useMemo } from "react";
import {
  DashboardFarmCard,
  DashboardMarketPriceCard,
  DashboardRiskCard,
  DashboardWeatherCard,
} from "@/components/dashboard-analysis-card-content";
import { DataStatusBadge } from "@/components/data-status-badge";
import { useDashboardAnalysisSnapshot } from "@/components/use-dashboard-analysis-snapshot";
import { Button } from "@/components/ui/button";
import { FarmDecisionSummaryCard } from "@/components/farm-decision-summary-card";
import { buildFarmDecisionSummary } from "@/domains/analysis/farm-decision-summary";
import {
  clearDashboardAnalysisCache,
  DASHBOARD_ANALYSIS_CACHE_TTL_MS,
  readDashboardAnalysisCache,
  writeDashboardAnalysisCache,
} from "@/domains/dashboard/analysis-cache";
import {
  createDashboardLiveSummary,
  type DashboardAnalysisInput,
  type DashboardLiveSummary,
} from "@/domains/dashboard/live-summary";
import type { Farm } from "@/domains/farms/types";
import { analyzeFarmRisk } from "@/lib/api/analyze.functions";

const getDashboardAnalysisStorage = () =>
  typeof window === "undefined" ? null : window.sessionStorage;

const fetchDashboardAnalysis = async (farm: Farm): Promise<DashboardAnalysisInput> => {
  const storage = getDashboardAnalysisStorage();
  const requestedAt = Date.now();

  try {
    const result = await analyzeFarmRisk({ data: farm });
    if (!result.ok || !result.data) {
      throw new Error(result.error || "농장 분석에 실패했습니다.");
    }
    const analysis: DashboardAnalysisInput = {
      ...(result.data as Omit<DashboardAnalysisInput, "analyzedAt">),
      analyzedAt: new Date(requestedAt).toISOString(),
    };
    writeDashboardAnalysisCache(storage, farm.id, analysis, requestedAt);
    return analysis;
  } catch (error) {
    clearDashboardAnalysisCache(storage, farm.id);
    throw error;
  }
};

export const DashboardAnalysisCards = ({ farm }: { farm: Farm }) => {
  const cachedAnalysis = useMemo(
    () =>
      readDashboardAnalysisCache<DashboardAnalysisInput>(
        getDashboardAnalysisStorage(),
        farm.id,
        Date.now(),
      ),
    [farm.id],
  );
  const query = useQuery({
    queryKey: ["dashboard-analysis", farm.id],
    queryFn: () => fetchDashboardAnalysis(farm),
    initialData: () => cachedAnalysis?.data,
    initialDataUpdatedAt: () => cachedAnalysis?.storedAt,
    staleTime: DASHBOARD_ANALYSIS_CACHE_TTL_MS,
    gcTime: DASHBOARD_ANALYSIS_CACHE_TTL_MS,
    retry: 1,
  });
  const summary = query.data ? createDashboardLiveSummary(query.data) : null;
  const decisionSummary =
    query.data?.pesticideRecommendations && summary
      ? buildFarmDecisionSummary({
          risk: query.data.riskResult,
          pesticides: query.data.pesticideRecommendations,
          marketPrice: summary.marketPriceSummary,
        })
      : null;
  const persistence = useDashboardAnalysisSnapshot(
    farm,
    query.isFetchedAfterMount ? query.data : undefined,
  );
  const updatedAt = summary?.updatedAt ? new Date(summary.updatedAt) : undefined;

  return (
    <section className="space-y-3" aria-label={`${farm.name} 최신 분석`}>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <AnalysisStatus query={query} summary={summary} updatedAt={updatedAt} />
        {persistence.status && (
          <DataStatusBadge
            status={
              persistence.status === "SUPABASE"
                ? "SUCCESS"
                : persistence.status === "FAILED"
                  ? "ERROR"
                  : "PARTIAL"
            }
            label={
              persistence.status === "SAVING"
                ? "요약 저장 중"
                : persistence.status === "SUPABASE"
                  ? "요약 저장됨"
                  : persistence.status === "LOCAL"
                    ? "브라우저에 저장됨"
                    : "요약 저장 실패"
            }
          />
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {decisionSummary ? <FarmDecisionSummaryCard summary={decisionSummary} /> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardFarmCard farm={farm} />
        <DashboardWeatherCard query={query} summary={summary} />
        <DashboardRiskCard farm={farm} query={query} summary={summary} />
        <DashboardMarketPriceCard query={query} summary={summary} />
      </div>
    </section>
  );
};

const AnalysisStatus = ({
  query,
  summary,
  updatedAt,
}: {
  query: { isPending: boolean; isError: boolean };
  summary: DashboardLiveSummary | null;
  updatedAt?: Date;
}) => {
  if (query.isPending) return <DataStatusBadge status="STALE" label="분석 조회 중" />;
  if (query.isError) return <DataStatusBadge status="ERROR" label="분석 실패" />;
  if (!summary) return <DataStatusBadge status="STALE" label="분석 없음" />;
  return (
    <DataStatusBadge status={summary.status} label={summary.statusLabel} lastUpdated={updatedAt} />
  );
};
