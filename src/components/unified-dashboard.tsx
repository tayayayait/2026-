import { Link } from "@tanstack/react-router";
import { BarChart3, Camera, Leaf, Plus, Tractor } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { DashboardAnalysisCards } from "@/components/dashboard-analysis-cards";
import { DataStatusBadge, type DataStatus } from "@/components/data-status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveDashboardFarmId } from "@/domains/dashboard/farm-selection";
import { type FarmDataSource, useFarmsStore } from "@/domains/farms/store";

const FARM_SOURCE_CONFIG: Record<FarmDataSource, { status: DataStatus; label: string }> = {
  SUPABASE: { status: "SUCCESS", label: "Supabase 농장 데이터" },
  LOCAL: { status: "PARTIAL", label: "브라우저 저장 농장" },
  EMPTY: { status: "STALE", label: "등록 농장 없음" },
  ERROR: { status: "ERROR", label: "농장 저장소 연결 오류" },
};

export const UnifiedDashboard = () => {
  const { farms, loading, loadFarms, source } = useFarmsStore();
  const [mounted, setMounted] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    loadFarms();
  }, [loadFarms]);

  if (!mounted || loading) {
    return (
      <AppShell title="통합 대시보드">
        <div
          className="flex h-64 items-center justify-center"
          role="status"
          aria-label="대시보드 불러오는 중"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </AppShell>
    );
  }

  const resolvedFarmId = resolveDashboardFarmId(farms, selectedFarmId);
  const selectedFarm = farms.find((farm) => farm.id === resolvedFarmId) ?? null;
  const farmSource = FARM_SOURCE_CONFIG[source];

  return (
    <AppShell title="통합 대시보드" subtitle="농장 위험도와 대응 작업을 한곳에서 확인합니다.">
      <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {selectedFarm && (
            <label className="grid min-w-0 gap-1.5 text-sm font-medium sm:max-w-sm sm:flex-1">
              <span>분석 농장 선택</span>
              <select
                value={resolvedFarmId ?? ""}
                onChange={(event) => setSelectedFarmId(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name} · {farm.crop} · {farm.region}
                  </option>
                ))}
              </select>
            </label>
          )}
          <DataStatusBadge status={farmSource.status} label={farmSource.label} />
        </div>

        {selectedFarm ? (
          <DashboardAnalysisCards key={selectedFarm.id} farm={selectedFarm} />
        ) : (
          <>
            <Card className="border-dashed bg-muted/50">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Leaf className="h-8 w-8 text-primary" />
                </div>
                <h2 className="mb-2 text-lg font-semibold">등록된 농장이 없습니다</h2>
                <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                  농장을 등록하면 기상 분석, 병해충 예측, 농기계 추천을 확인할 수 있습니다.
                </p>
                <Link
                  to="/farms/new"
                  className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="mr-2 h-4 w-4" /> 첫 농장 등록
                </Link>
              </CardContent>
            </Card>
          </>
        )}

        {selectedFarm && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DashboardLink
              to="/pests/photo-search"
              icon={Camera}
              title="병해충 사진검색"
              description="작물 분류와 사진 후보를 선택해 병·해충·잡초 상세정보를 조회합니다."
            />
            <DashboardLink
              to="/farms/$farmId/machines"
              params={{ farmId: selectedFarm.id }}
              icon={Tractor}
              title="농기계 추천 및 임대"
              description="현재 필요한 작업에 맞는 농기계를 추천하고 가까운 임대사업소를 표시합니다."
            />
            <DashboardLink
              to="/reports/$reportId"
              params={{ reportId: selectedFarm.id }}
              icon={BarChart3}
              title="AI 분석 리포트"
              description="기상, 농업기상 관측, 병해충 정보를 종합한 대응 가이드를 확인합니다."
            />
          </div>
        )}
      </div>
    </AppShell>
  );
};

type DashboardLinkProps =
  | { to: "/pests/photo-search"; params?: never }
  | { to: "/farms/$farmId/machines"; params: { farmId: string } }
  | { to: "/reports/$reportId"; params: { reportId: string } };

const DashboardLink = ({
  to,
  params,
  icon: Icon,
  title,
  description,
}: DashboardLinkProps & {
  icon: typeof Camera;
  title: string;
  description: string;
}) => (
  <Link
    to={to}
    params={params}
    className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <Card className="h-full cursor-pointer transition-colors duration-200 hover:border-primary/50 hover:bg-primary/[0.02] hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" /> {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  </Link>
);
