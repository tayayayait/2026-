import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Database, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { MachineRecommendationSummary } from "@/components/machines/machine-recommendation-summary";
import { RentalOfficeWorkspace } from "@/components/machines/rental-office-workspace";
import { useFarmsStore } from "@/domains/farms/store";
import { getNcpmsGrowthStageLabel } from "@/domains/farms/growth-stage";
import type { RecommendationResult } from "@/domains/machines/recommender";
import { getRentalSourceLabel } from "@/domains/machines/presentation";
import type { Rental, RentalDataSource } from "@/domains/machines/types";
import type { WorkType } from "@/domains/shared/types";
import { analyzeFarmRisk } from "@/lib/api/analyze.functions";
import { getMachineRecommendations } from "@/lib/api/rental-machines.functions";

const FarmMachinesPage = () => {
  const { farmId } = Route.useParams();
  const { farms, loadFarms } = useFarmsStore();
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [rentalCenters, setRentalCenters] = useState<Rental[]>([]);
  const [recommendedWorks, setRecommendedWorks] = useState<WorkType[]>([]);
  const [dataWarning, setDataWarning] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<RentalDataSource | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        if (useFarmsStore.getState().farms.length === 0) await loadFarms();
        const farm = useFarmsStore.getState().farms.find((item) => item.id === farmId);
        if (!farm || cancelled) return;

        let works: WorkType[] = farm.interestedWork.length > 0 ? farm.interestedWork : ["방제"];
        const analysis = await analyzeFarmRisk({ data: farm });
        if (analysis.ok && analysis.data?.riskResult?.recommendedWorks?.length) {
          works = analysis.data.riskResult.recommendedWorks as WorkType[];
        }

        const machineResult = await getMachineRecommendations({
          data: {
            farmLocation: { lat: farm.lat, lng: farm.lng },
            works,
            maxDistanceKm: 50,
          },
        });
        if (!machineResult.ok || !machineResult.data) {
          throw new Error("농기계 임대사업소 응답이 올바르지 않습니다.");
        }
        if (cancelled) return;

        setRecommendedWorks(works);
        setRecommendations(machineResult.data.recommendations as RecommendationResult[]);
        setRentalCenters(machineResult.data.rentals as Rental[]);
        setDataWarning(machineResult.data.warning || null);
        setDataSource(machineResult.data.source as RentalDataSource);
      } catch (error) {
        console.error("Rental machine recommendations failed:", error);
        if (!cancelled)
          setLoadError("임대사업소 정보를 불러오지 못했습니다. 잠시 후 다시 시도하세요.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [farmId, loadFarms]);

  const farm = farms.find((item) => item.id === farmId);

  if (loading) {
    return (
      <AppShell title="농기계 추천 및 임대">
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">
            작업 조건과 가까운 사업소를 확인하고 있습니다.
          </p>
        </div>
      </AppShell>
    );
  }

  if (!farm) {
    return (
      <AppShell title="농기계 추천">
        <div className="p-8 text-center text-muted-foreground">농장 정보를 찾을 수 없습니다.</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="농기계 추천 및 임대 안내"
      subtitle={`${farm.name} · ${farm.crop} · ${getNcpmsGrowthStageLabel(farm.growthStageCode) ?? "생육단계 재선택 필요"}`}
    >
      <div className="min-h-full bg-[radial-gradient(circle_at_15%_0%,rgba(55,118,86,0.08),transparent_26%),linear-gradient(180deg,#f8faf7_0%,#f3f7f3_100%)] px-4 py-5 md:px-8 md:py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <MachineRecommendationSummary
            works={recommendedWorks}
            recommendations={recommendations}
          />

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="flex items-start gap-3 rounded-xl border border-[#d8e3dc] bg-white/85 px-4 py-3 text-sm text-[#536b5e] backdrop-blur">
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-[#2e7657]" />
              <div>
                <strong className="font-black text-[#173d2c]">
                  {dataSource ? getRentalSourceLabel(dataSource) : "농기계 임대 공공데이터"}
                </strong>
                <span className="ml-2">보유 대수는 실시간 대여 가능 수량이 아닙니다.</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-[#d8e3dc] bg-[#eff6f1] px-4 py-3 text-xs font-bold text-[#315f49]">
              <ShieldCheck className="h-4 w-4" /> 최종 임대 여부는 사업소 확인
            </div>
          </div>

          {(dataWarning || loadError) && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{loadError || dataWarning}</span>
            </div>
          )}

          <RentalOfficeWorkspace
            farm={farm}
            rentals={rentalCenters}
            recommendations={recommendations}
          />
        </div>
      </div>
    </AppShell>
  );
};

export const Route = createFileRoute("/farms/$farmId/machines")({
  component: FarmMachinesPage,
});
