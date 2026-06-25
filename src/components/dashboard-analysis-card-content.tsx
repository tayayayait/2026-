import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ChevronRight,
  CircleDollarSign,
  CloudRain,
  Droplets,
  TrendingDown,
  TrendingUp,
  Leaf,
  Loader2,
  ThermometerSun,
  Wind,
} from "lucide-react";
import { RiskBadge } from "@/components/risk-badge";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardLiveSummary } from "@/domains/dashboard/live-summary";
import type { Farm } from "@/domains/farms/types";
import { getNcpmsGrowthStageLabel } from "@/domains/farms/growth-stage";
import type { RiskLevel } from "@/domains/shared/types";

const RISK_CARD_CLASS: Record<RiskLevel, string> = {
  SAFE: "border-risk-safe-bg/50 bg-risk-safe-bg/5",
  WATCH: "border-risk-watch-bg/50 bg-risk-watch-bg/5",
  WARNING: "border-risk-warning-bg/50 bg-risk-warning-bg/5",
  CRITICAL: "border-risk-critical-bg/50 bg-risk-critical-bg/5",
  UNKNOWN: "border-border bg-card",
};

interface AnalysisCardProps {
  query: { isPending: boolean; isError: boolean };
  summary: DashboardLiveSummary | null;
}

export const DashboardFarmCard = ({ farm }: { farm: Farm }) => (
  <Card className="border-primary/20 bg-primary/[0.04] shadow-sm">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-muted-foreground">재배 작물</p>
          <h2 className="text-2xl font-bold">{farm.crop}</h2>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
          <Leaf className="h-6 w-6 text-primary" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">
          {getNcpmsGrowthStageLabel(farm.growthStageCode) ?? "생육단계 재선택 필요"}
        </span>
        <span>{farm.area.toLocaleString()}㎡</span>
      </div>
    </CardContent>
  </Card>
);

export const DashboardWeatherCard = ({ query, summary }: AnalysisCardProps) => {
  const weather = summary?.weather;
  const agriWeather = summary?.agriWeather;
  const title = query.isPending
    ? "조회 중"
    : query.isError
      ? "분석 실패"
      : weather
        ? `${weather.temperature.toFixed(1)}℃`
        : agriWeather
          ? `${agriWeather.averageTemperature?.toFixed(1) ?? "-"}℃`
          : "조회 실패";

  return (
    <Card className="shadow-sm flex flex-col">
      <CardContent className="p-6 flex-1 flex flex-col">
        <div className="flex min-h-12 items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-muted-foreground">기상청 실황·예보</p>
              {agriWeather && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 rounded-sm">
                  농업기상 ✓
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            {query.isPending ? (
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            ) : (
              <ThermometerSun className="h-6 w-6 text-blue-600" />
            )}
          </div>
        </div>
        
        {weather ? (
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-4">
            <Metric icon={CloudRain} value={`${weather.humidity}%`} />
            <Metric icon={Wind} value={`${weather.wind}m/s`} />
            <Metric icon={Droplets} value={`${weather.rainfall}mm`} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">
            {summary?.note || "최신 데이터를 조회하고 있습니다."}
          </p>
        )}

        {agriWeather && (
          <div className="mt-auto pt-3 border-t border-border/50">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">최근 농업기상 ({agriWeather.distanceKm.toFixed(1)}km)</span>
              <span className="font-medium text-foreground/80">
                {agriWeather.averageTemperature !== undefined ? `${agriWeather.averageTemperature.toFixed(1)}℃` : "-"} / {agriWeather.humidity !== undefined ? `${agriWeather.humidity}%` : "-"} / {agriWeather.rainfall !== undefined ? `${agriWeather.rainfall}mm` : "-"}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const DashboardRiskCard = ({ farm, query, summary }: AnalysisCardProps & { farm: Farm }) => {
  const risk = summary?.risk;
  const title = query.isPending
    ? "계산 중"
    : query.isError
      ? "분석 실패"
      : risk
        ? "분석 완료"
        : "계산 보류";

  return (
    <Card className={`shadow-sm ${risk ? RISK_CARD_CLASS[risk.level] : ""}`}>
      <CardContent className="p-6">
        <div className="flex min-h-12 items-center justify-between gap-3">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">종합 위험도</p>
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
          {risk ? (
            <RiskBadge level={risk.level} score={risk.score} />
          ) : (
            <AlertTriangle className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="truncate text-muted-foreground">{summary?.note || "API 응답 대기"}</span>
          <Link
            to="/farms/$farmId/risk"
            params={{ farmId: farm.id }}
            className="inline-flex min-h-11 shrink-0 items-center font-medium text-primary hover:underline"
          >
            상세 분석 <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export const DashboardMarketPriceCard = ({ query, summary }: AnalysisCardProps) => {
  const marketPrice = summary?.marketPriceSummary ?? null;
  const title = query.isPending
    ? "조회 중"
    : query.isError
      ? "분석 실패"
      : marketPrice?.latestWholesaleKgPrice
        ? `${marketPrice.latestWholesaleKgPrice.toLocaleString("ko-KR")}원/kg`
        : "가격 없음";
  const change = marketPrice?.changeFromSevenDayAveragePercent;
  const trendClass =
    marketPrice?.trend === "UP"
      ? "text-red-700"
      : marketPrice?.trend === "DOWN"
        ? "text-blue-700"
        : "text-muted-foreground";
  const TrendIcon = marketPrice?.trend === "DOWN" ? TrendingDown : TrendingUp;

  return (
    <Card className="shadow-sm">
      <CardContent className="flex h-full flex-col p-6">
        <div className="flex min-h-12 items-center justify-between gap-3">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">KAMIS 가격 신호</p>
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            {query.isPending ? (
              <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
            ) : (
              <CircleDollarSign className="h-6 w-6 text-emerald-700" />
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="truncate text-muted-foreground">
            {marketPrice ? `${marketPrice.itemName} · ${marketPrice.latestDate ?? "조사일 없음"}` : "API 응답 대기"}
          </span>
          {change !== null && change !== undefined ? (
            <span className={`inline-flex shrink-0 items-center gap-1 font-bold ${trendClass}`}>
              <TrendIcon className="h-4 w-4" />
              {change > 0 ? "+" : ""}
              {change}%
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

const Metric = ({ icon: Icon, value }: { icon: typeof CloudRain; value: string }) => (
  <span className="inline-flex min-w-0 items-center gap-1">
    <Icon className="h-4 w-4 shrink-0" />
    <span className="truncate">{value}</span>
  </span>
);
