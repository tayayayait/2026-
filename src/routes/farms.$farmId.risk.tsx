import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
  CloudRain,
  Database,
  Droplets,
  Loader2,
  MapPin,
  ShieldCheck,
  Thermometer,
  Wind,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFarmsStore } from "@/domains/farms/store";
import { analyzeFarmRisk } from "@/lib/api/analyze.functions";
import type { RiskAssessment } from "@/domains/shared/types";
import type { NcpmsPest } from "@/integrations/ncpms/disease";
import type { PestDetailPanel } from "@/domains/pests/detail-selection";
import type { AgriWeatherObservation } from "@/integrations/agriWeather/observation";
import type { PestPredictionMapView } from "@/domains/pests/prediction-map";
import { RiskOverviewCard } from "@/components/risk-overview-card";
import { PestMonitoringWorkspace } from "@/components/pest-monitoring/pest-monitoring-workspace";
import type { AnalysisSourceStatus, ReportSourceStatus } from "@/domains/reports/report-generation";
import type { PesticideRecommendationView } from "@/domains/pesticides/safe-use";
import { PesticideRecommendationCard } from "@/components/pesticide-recommendation-card";
import type { MarketPriceSummary } from "@/domains/market-prices/price-summary";
import { MarketPriceCard } from "@/components/market-price-card";
import { buildFarmDecisionSummary } from "@/domains/analysis/farm-decision-summary";
import { FarmDecisionSummaryCard } from "@/components/farm-decision-summary-card";

export const Route = createFileRoute("/farms/$farmId/risk")({
  component: FarmRiskPage,
});

interface FarmAnalysis {
  riskResult: RiskAssessment | null;
  weather: {
    temperature: number;
    humidity: number;
    rainfall: number;
    wind: number;
    baseDate?: string;
    baseTime?: string;
    nx?: number;
    ny?: number;
  } | null;
  agriWeather: AgriWeatherObservation | null;
  pests: NcpmsPest[];
  pestDetails: PestDetailPanel[];
  predictionMap: PestPredictionMapView | null;
  pesticideRecommendations: PesticideRecommendationView;
  marketPriceSummary: MarketPriceSummary | null;
  sourceStatus: AnalysisSourceStatus;
}

type CurrentWeather = NonNullable<FarmAnalysis["weather"]>;
type SignalTone = "good" | "watch" | "bad";

interface WeatherSignal {
  label: string;
  value: string;
  tone: SignalTone;
}

function FarmRiskPage() {
  const { farmId } = Route.useParams();
  const { farms, loadFarms } = useFarmsStore();
  const { data: analysis, isLoading: loading } = useQuery({
    queryKey: ["farmAnalysis", farmId],
    queryFn: async () => {
      let currentFarms = useFarmsStore.getState().farms;
      if (currentFarms.length === 0) {
        await useFarmsStore.getState().loadFarms();
        currentFarms = useFarmsStore.getState().farms;
      }
      
      const targetFarm = currentFarms.find((item) => item.id === farmId);
      if (!targetFarm) return null;

      const result = await analyzeFarmRisk({ data: targetFarm });
      return result.ok ? (result.data as FarmAnalysis) : null;
    },
    staleTime: 1000 * 60 * 5,
  });

  const farm = farms.find((item) => item.id === farmId);

  if (loading) {
    return (
      <AppShell title="상세 위험도 분석">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!farm || !analysis) {
    return (
      <AppShell title="상세 위험도 분석">
        <div className="p-8 text-center text-muted-foreground">농장 정보를 찾을 수 없습니다.</div>
      </AppShell>
    );
  }

  const {
    riskResult,
    weather,
    agriWeather,
    pests,
    pestDetails,
    predictionMap,
    pesticideRecommendations,
    marketPriceSummary,
    sourceStatus,
  } = analysis;
  const decisionSummary = buildFarmDecisionSummary({
    risk: riskResult,
    pesticides: pesticideRecommendations,
    marketPrice: marketPriceSummary,
  });

  return (
    <AppShell
      title="상세 위험도 분석"
      subtitle={`${farm.name} (${farm.crop})`}
      right={
        <Link
          to="/reports/$reportId"
          params={{ reportId: farm.id }}
          className="flex items-center text-sm font-medium text-primary hover:underline"
        >
          AI 리포트 생성 <ChevronRight className="w-4 h-4 ml-1" />
        </Link>
      }
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        <RiskOverviewCard risk={riskResult} />

        <FarmDecisionSummaryCard summary={decisionSummary} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="md:col-span-2 overflow-hidden border-blue-200 bg-gradient-to-br from-blue-50 via-background to-emerald-50">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Thermometer className="h-5 w-5 text-blue-600" /> 현재 작업 조건
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    기상청 실황·예보를 기준으로 농작업 가능 여부를 판단합니다.
                  </p>
                </div>
                {weather ? <WorkConditionBadge weather={weather} /> : null}
              </div>
            </CardHeader>
            <CardContent>
              {weather ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <WeatherStat
                      icon={<Thermometer className="mb-1 h-5 w-5 text-orange-500" />}
                      label="현재 기온"
                      value={`${weather.temperature.toFixed(1)}℃`}
                    />
                    <WeatherStat
                      icon={<CloudRain className="mb-1 h-5 w-5 text-blue-500" />}
                      label="습도"
                      value={`${weather.humidity}%`}
                    />
                    <WeatherStat
                      icon={<Droplets className="mb-1 h-5 w-5 text-cyan-500" />}
                      label="강수량"
                      value={`${weather.rainfall}mm`}
                    />
                    <WeatherStat
                      icon={<Wind className="mb-1 h-5 w-5 text-slate-500" />}
                      label="풍속"
                      value={`${weather.wind}m/s`}
                    />
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    {getCurrentWeatherSignals(weather).map((signal) => (
                      <ConditionSignal key={signal.label} signal={signal} />
                    ))}
                  </div>
                  {weather.baseDate && weather.baseTime ? (
                    <p className="text-xs text-muted-foreground">
                      기준: 기상청 {weather.baseDate} {weather.baseTime} · 격자 {weather.nx},{" "}
                      {weather.ny}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-32 flex-col items-center justify-center text-center">
                  <CloudRain className="mb-2 h-7 w-7 text-muted-foreground" />
                  <p className="text-sm font-medium">사용 가능한 기상청 실응답이 없습니다</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    임의 기본값은 표시하지 않습니다.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5 text-green-600" /> 농업기상 최근 일관측
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agriWeather ? (
                <div className="space-y-4">
                  <div className="rounded-md border bg-green-50/70 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-green-800">
                      <MapPin className="h-4 w-4" />
                      {agriWeather.stationName} · {agriWeather.distanceKm.toFixed(1)}km
                    </div>
                    <p className="mt-1 text-xs text-green-800/70">
                      관측일: {agriWeather.observedDate} · 현재 기온이 아닌 일 단위 관측값
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <WeatherStat
                      icon={<Thermometer className="mb-1 h-5 w-5 text-orange-500" />}
                      label="평균기온"
                      value={formatOptionalMetric(agriWeather.averageTemperature, "℃")}
                    />
                    <WeatherStat
                      icon={<Thermometer className="mb-1 h-5 w-5 text-red-500" />}
                      label="최고/최저"
                      value={formatTemperatureRange(agriWeather)}
                    />
                    <WeatherStat
                      icon={<Droplets className="mb-1 h-5 w-5 text-cyan-500" />}
                      label="강수량"
                      value={formatOptionalMetric(agriWeather.rainfall, "mm")}
                    />
                    <WeatherStat
                      icon={<Wind className="mb-1 h-5 w-5 text-slate-500" />}
                      label="풍속"
                      value={formatOptionalMetric(agriWeather.windSpeed, "m/s")}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex min-h-32 flex-col items-center justify-center text-center">
                  <CloudRain className="mb-2 h-7 w-7 text-muted-foreground" />
                  <p className="text-sm font-medium">농업기상 관측 데이터가 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5 text-primary" /> 데이터 근거
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <DataRoleRow
                  icon={<Thermometer className="h-4 w-4 text-blue-600" />}
                  label="기상청"
                  role="지금 작업 판단 기준"
                  value={
                    weather
                      ? `${weather.temperature.toFixed(1)}℃ · ${weather.rainfall}mm · ${weather.wind}m/s`
                      : "실응답 없음"
                  }
                />
                <DataRoleRow
                  icon={<CalendarDays className="h-4 w-4 text-green-600" />}
                  label="농업기상"
                  role="근처 관측소 최근 일관측"
                  value={
                    agriWeather
                      ? `${agriWeather.observedDate} · ${agriWeather.stationName}`
                      : "관측값 없음"
                  }
                />
                <DataRoleRow
                  icon={<ShieldCheck className="h-4 w-4 text-amber-600" />}
                  label="NCPMS"
                  role="병해충 후보·예측 근거"
                  value={SOURCE_STATUS_CONFIG[sourceStatus.pests].label}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <MarketPriceCard
          summary={marketPriceSummary}
          sourceStatus={sourceStatus.marketPrices}
        />

        <PesticideRecommendationCard
          recommendations={pesticideRecommendations}
          sourceStatus={sourceStatus.pesticides}
        />

        <PestMonitoringWorkspace
          key={`${farm.id}-${predictionMap?.cropCode ?? "none"}`}
          farm={farm}
          pests={pests}
          pestDetails={pestDetails}
          predictionMap={predictionMap}
          sourceStatus={sourceStatus.pests}
        />
      </div>
    </AppShell>
  );
}

const WORK_CONDITION_CLASS: Record<SignalTone, string> = {
  good: "border-green-200 bg-green-100 text-green-800",
  watch: "border-amber-200 bg-amber-100 text-amber-800",
  bad: "border-red-200 bg-red-100 text-red-800",
};

const SIGNAL_CLASS: Record<SignalTone, string> = {
  good: "border-green-200 bg-green-50 text-green-800",
  watch: "border-amber-200 bg-amber-50 text-amber-800",
  bad: "border-red-200 bg-red-50 text-red-800",
};

const formatOptionalMetric = (value: number | undefined, unit: string) =>
  value === undefined
    ? "-"
    : `${value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}${unit}`;

const formatTemperatureRange = (agriWeather: AgriWeatherObservation) => {
  if (agriWeather.maxTemperature === undefined || agriWeather.minTemperature === undefined) {
    return "-";
  }
  return `${formatOptionalMetric(agriWeather.maxTemperature, "℃")} / ${formatOptionalMetric(
    agriWeather.minTemperature,
    "℃",
  )}`;
};

const getWorkCondition = (weather: CurrentWeather) => {
  if (weather.rainfall >= 20 || weather.wind >= 10) {
    return {
      label: "작업 보류",
      detail: "호우 또는 강풍 조건",
      tone: "bad" as const,
    };
  }

  if (
    weather.rainfall >= 5 ||
    weather.wind >= 5 ||
    weather.temperature >= 33 ||
    weather.humidity >= 85
  ) {
    return {
      label: "주의 작업",
      detail: "현장 확인 후 제한 작업",
      tone: "watch" as const,
    };
  }

  return {
    label: "작업 가능",
    detail: "강수·풍속 기준 양호",
    tone: "good" as const,
  };
};

const getCurrentWeatherSignals = (weather: CurrentWeather): WeatherSignal[] => [
  {
    label: "강수",
    value: weather.rainfall >= 5 ? `${weather.rainfall}mm 주의` : "강수 낮음",
    tone: weather.rainfall >= 20 ? "bad" : weather.rainfall >= 5 ? "watch" : "good",
  },
  {
    label: "풍속",
    value: weather.wind >= 5 ? `${weather.wind}m/s 주의` : "작업 가능 범위",
    tone: weather.wind >= 10 ? "bad" : weather.wind >= 5 ? "watch" : "good",
  },
  {
    label: "고온·다습",
    value:
      weather.temperature >= 33
        ? "고온 주의"
        : weather.humidity >= 85
          ? "다습 주의"
          : "특이 조건 낮음",
    tone: weather.temperature >= 33 || weather.humidity >= 85 ? "watch" : "good",
  },
];

function WorkConditionBadge({ weather }: { weather: CurrentWeather }) {
  const condition = getWorkCondition(weather);

  return (
    <div
      className={`inline-flex min-w-40 items-center gap-2 rounded-md border px-3 py-2 ${WORK_CONDITION_CLASS[condition.tone]}`}
    >
      {condition.tone === "good" ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 shrink-0" />
      )}
      <div>
        <div className="text-sm font-bold">{condition.label}</div>
        <div className="text-xs opacity-80">{condition.detail}</div>
      </div>
    </div>
  );
}

function ConditionSignal({ signal }: { signal: WeatherSignal }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${SIGNAL_CLASS[signal.tone]}`}>
      <div className="text-xs font-semibold opacity-75">{signal.label}</div>
      <div className="mt-0.5 text-sm font-bold">{signal.value}</div>
    </div>
  );
}

const SOURCE_STATUS_CONFIG: Record<ReportSourceStatus, { label: string; className: string }> = {
  LIVE: { label: "실 API 응답", className: "bg-green-100 text-green-700" },
  EMPTY: { label: "응답·결과 없음", className: "bg-gray-100 text-gray-700" },
  FALLBACK: { label: "대체 데이터", className: "bg-yellow-100 text-yellow-700" },
  FAILED: { label: "호출 실패", className: "bg-red-100 text-red-700" },
};

function DataRoleRow({
  icon,
  label,
  role,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  role: string;
  value: string;
}) {
  return (
    <div className="flex min-h-16 items-start gap-3 rounded-md border bg-background p-3">
      <div className="mt-0.5 rounded-md bg-secondary p-2">{icon}</div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-sm font-bold">{label}</span>
          <span className="text-xs font-medium text-muted-foreground">{role}</span>
        </div>
        <div className="mt-1 break-words text-sm text-foreground/80">{value}</div>
      </div>
    </div>
  );
}

function WeatherStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-secondary/50 p-3 rounded-lg flex flex-col items-center justify-center text-center">
      {icon}
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-bold text-lg">{value}</span>
    </div>
  );
}
