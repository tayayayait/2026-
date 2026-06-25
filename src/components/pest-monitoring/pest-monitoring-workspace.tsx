import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bug, Camera, Database, MapPinned, ScanSearch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NcpmsAjaxWidget, type NcpmsPestOption } from "@/components/ncpms-ajax-widget";
import { PestPredictionSelector } from "@/components/pest-prediction-selector";
import { PestCatalogList } from "./pest-catalog-list";
import { groupPestCatalog, summarizePestCatalog } from "@/domains/pests/catalog-groups";
import type { PestPredictionMapView } from "@/domains/pests/prediction-map";
import type { PestDetailPanel } from "@/domains/pests/detail-selection";
import type { NcpmsPest } from "@/integrations/ncpms/disease";
import type { ReportSourceStatus } from "@/domains/reports/report-generation";
import type { Farm } from "@/domains/farms/types";

interface PestMonitoringWorkspaceProps {
  farm: Pick<Farm, "id" | "name" | "crop" | "lat" | "lng" | "parcel">;
  pests: NcpmsPest[];
  pestDetails: PestDetailPanel[];
  predictionMap: PestPredictionMapView | null;
  sourceStatus: ReportSourceStatus;
}

const SOURCE_LABEL: Record<ReportSourceStatus, string> = {
  LIVE: "NCPMS 실데이터",
  EMPTY: "NCPMS 결과 없음",
  FALLBACK: "작물별 대체 데이터",
  FAILED: "NCPMS 조회 실패",
};

const toPredictionOptions = (predictionMap: PestPredictionMapView | null): NcpmsPestOption[] => {
  if (!predictionMap) return [];
  return [
    ...new Map(
      predictionMap.models.map((model) => [
        model.code,
        { code: model.code, fieldCode: model.fieldCode, name: model.name },
      ]),
    ).values(),
  ];
};

export const PestMonitoringWorkspace = ({
  farm,
  pests,
  pestDetails,
  predictionMap,
  sourceStatus,
}: PestMonitoringWorkspaceProps) => {
  const initialPredictionPests = useMemo(() => toPredictionOptions(predictionMap), [predictionMap]);
  const [predictionPests, setPredictionPests] = useState<NcpmsPestOption[]>(initialPredictionPests);
  const [selectedPestCode, setSelectedPestCode] = useState(initialPredictionPests[0]?.code ?? "");
  const groups = useMemo(() => groupPestCatalog(pests), [pests]);
  const summary = useMemo(() => summarizePestCatalog(groups, pests.length), [groups, pests.length]);
  const selectedPredictionPest = predictionPests.find((pest) => pest.code === selectedPestCode);
  const selectedPredictionModel = predictionMap?.models.find(
    (model) => model.code === selectedPestCode,
  );
  const predictionMapCenter = farm.parcel?.centroid ?? { lat: farm.lat, lng: farm.lng };
  const locationSourceLabel = farm.parcel ? "등록 필지 중심" : "농장 주소 좌표";

  const handlePestListChange = (cropCode: string | null, nextPests: NcpmsPestOption[]) => {
    if (!predictionMap) return;
    if (cropCode !== predictionMap.cropCode) return;
    setPredictionPests(nextPests);
    setSelectedPestCode((current) =>
      nextPests.some((pest) => pest.code === current) ? current : (nextPests[0]?.code ?? ""),
    );
  };

  return (
    <Card className="overflow-hidden border-[#cbd8ce] bg-[#fbfcf8] shadow-[0_18px_55px_-40px_rgba(20,61,45,0.55)]">
      <div className="relative overflow-hidden border-b border-[#cad7cd] bg-[linear-gradient(120deg,#173f30_0%,#235b43_58%,#315f49_100%)] px-5 py-5 text-white sm:px-6">
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.65)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.65)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-100/80">
              <span>Crop intelligence</span>
              <span className="h-1 w-1 rounded-full bg-emerald-200/60" />
              <span>{SOURCE_LABEL[sourceStatus]}</span>
            </div>
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-[-0.02em] sm:text-2xl">
              <Bug className="h-5 w-5 text-emerald-200" aria-hidden="true" />
              병해충 모니터링
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/80">
              {farm.crop}에 등록된 관련 정보와 예측 지원 범위를 분리해 확인합니다.
            </p>
          </div>
          <Link
            to="/pests/photo-search"
            search={{ farmId: farm.id }}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            사진으로 확인
          </Link>
        </div>
      </div>

      <CardContent className="space-y-5 p-4 sm:p-6">
        <div className="grid overflow-hidden rounded-xl border border-[#d6dfd8] bg-white sm:grid-cols-4">
          {[
            ["관련 병해충", `${summary.totalCount}종`],
            ["병", `${summary.diseaseCount}종`],
            ["해충", `${summary.insectCount}종`],
            ["예측 지원", `${predictionPests.length}종`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between border-b border-[#e2e8e3] px-4 py-3 last:border-b-0 sm:block sm:border-b-0 sm:border-r sm:last:border-r-0"
            >
              <div className="text-xs font-medium text-muted-foreground">{label}</div>
              <div className="mt-0.5 text-lg font-bold tabular-nums text-[#173f30]">{value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-[#d8dfd3] bg-[#f2f4ed] px-4 py-3 text-sm text-[#4c584f]">
          <ScanSearch className="mt-0.5 h-4 w-4 shrink-0 text-[#5e755f]" aria-hidden="true" />
          <p>
            <span className="font-semibold text-[#2f4135]">
              현재 발생 여부는 관련 목록만으로 판단할 수 없습니다.
            </span>{" "}
            경고 상태는 예찰·관측 근거가 연계될 때만 표시됩니다.
          </p>
        </div>

        <Tabs defaultValue="catalog" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl bg-[#e9eee9] p-1">
            <TabsTrigger value="catalog" className="min-h-10 rounded-lg text-xs sm:text-sm">
              <Database className="mr-1.5 hidden h-4 w-4 sm:block" aria-hidden="true" /> 관련 병해충
            </TabsTrigger>
            <TabsTrigger
              value="prediction"
              disabled={!predictionMap}
              className="min-h-10 rounded-lg text-xs sm:text-sm"
            >
              <Bug className="mr-1.5 hidden h-4 w-4 sm:block" aria-hidden="true" /> 예측 지원
            </TabsTrigger>
            <TabsTrigger
              value="map"
              disabled={!predictionMap}
              className="min-h-10 rounded-lg text-xs sm:text-sm"
            >
              <MapPinned className="mr-1.5 hidden h-4 w-4 sm:block" aria-hidden="true" /> 예측 지도
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalog">
            <PestCatalogList groups={groups} summary={summary} />
          </TabsContent>

          <TabsContent value="prediction" className="space-y-3">
            {predictionMap && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-[#21382b]">
                    {predictionMap.cropName} 예측 지원 병해충
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    예측 모델 지원 여부이며 현재 발생 경보를 의미하지 않습니다.
                  </p>
                </div>
                <PestPredictionSelector
                  cropName={predictionMap.cropName}
                  pests={predictionPests}
                  selectedPestCode={selectedPestCode}
                  onSelectPest={setSelectedPestCode}
                  pestDetails={pestDetails}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="map">
            {predictionMap && (
              <NcpmsAjaxWidget
                key={predictionMap.cropCode}
                farmName={farm.name}
                lat={predictionMapCenter.lat}
                lng={predictionMapCenter.lng}
                selectedCropName={predictionMap.cropName}
                selectedCropCode={predictionMap.cropCode}
                selectedPestCode={selectedPestCode}
                selectedPestName={selectedPredictionPest?.name}
                selectedFieldCode={selectedPredictionModel?.fieldCode}
                selectedDriveCycle={selectedPredictionModel?.driveCycle}
                selectedLastRunAt={selectedPredictionModel?.lastRunAt}
                selectedRiskLevels={selectedPredictionModel?.riskLevels}
                locationSourceLabel={locationSourceLabel}
                farmParcel={farm.parcel}
                onPestListChange={handlePestListChange}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
