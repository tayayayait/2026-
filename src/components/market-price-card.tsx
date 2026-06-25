import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CircleDollarSign,
  MapPin,
  Store,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MarketPriceSummary, MarketPriceTrend } from "@/domains/market-prices/price-summary";
import type { ReportSourceStatus } from "@/domains/reports/report-generation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_LABEL: Record<ReportSourceStatus, string> = {
  LIVE: "KAMIS 응답",
  EMPTY: "가격 없음",
  FALLBACK: "대체 데이터",
  FAILED: "호출 실패",
};

const TREND_CONFIG: Record<
  MarketPriceTrend,
  { label: string; className: string; icon: typeof ArrowRight }
> = {
  UP: { label: "상승", className: "text-red-700 bg-red-50 border-red-200", icon: ArrowUpRight },
  DOWN: {
    label: "하락",
    className: "text-blue-700 bg-blue-50 border-blue-200",
    icon: ArrowDownRight,
  },
  FLAT: {
    label: "보합",
    className: "text-slate-700 bg-slate-50 border-slate-200",
    icon: ArrowRight,
  },
  UNKNOWN: {
    label: "판단 보류",
    className: "text-slate-600 bg-slate-50 border-slate-200",
    icon: ArrowRight,
  },
};

const formatPrice = (value: number | null | undefined) =>
  value === null || value === undefined ? "-" : `${value.toLocaleString("ko-KR")}원/kg`;

const formatDate = (value: string | null | undefined) => {
  if (!value || value.length !== 8) return "-";
  return `${value.slice(0, 4)}.${value.slice(4, 6)}.${value.slice(6, 8)}`;
};

const chartData = (summary: MarketPriceSummary) =>
  summary.points.slice(-14).map((point) => ({
    date: `${point.date.slice(4, 6)}/${point.date.slice(6, 8)}`,
    price: point.averageKgPrice,
  }));

export const MarketPriceCard = ({
  summary,
  sourceStatus,
}: {
  summary: MarketPriceSummary | null;
  sourceStatus?: ReportSourceStatus;
}) => {
  const status = sourceStatus ?? (summary ? "LIVE" : "EMPTY");

  if (!summary || summary.rowCount === 0) {
    return (
      <Card className="border-dashed bg-muted/40">
        <CardContent className="flex min-h-40 flex-col items-center justify-center text-center">
          <CircleDollarSign className="mb-2 h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-semibold">KAMIS 가격 정보가 없습니다</p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            작물 코드가 없거나 최근 조사 기간에 해당 품목의 도·소매 가격 응답이 비어 있습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const trend = TREND_CONFIG[summary.trend];
  const TrendIcon = trend.icon;

  return (
    <Card className="overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-50 via-background to-amber-50">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CircleDollarSign className="h-5 w-5 text-emerald-700" />
              KAMIS 도·소매 가격
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.itemName} · {summary.categoryName} · {STATUS_LABEL[status]}
            </p>
          </div>
          <div className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 ${trend.className}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-sm font-bold">
              {trend.label}
              {summary.changeFromSevenDayAveragePercent !== null
                ? ` ${summary.changeFromSevenDayAveragePercent > 0 ? "+" : ""}${
                    summary.changeFromSevenDayAveragePercent
                  }%`
                : ""}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <PriceMetric
            label="전국 중도매 최신가"
            value={formatPrice(summary.latestWholesaleKgPrice)}
            detail={formatDate(summary.latestDate)}
          />
          <PriceMetric
            label="전국 소매 최신가"
            value={formatPrice(summary.latestRetailKgPrice)}
            detail={summary.classNames.join(", ") || "조사 구분 없음"}
          />
          <PriceMetric
            label="30일 평균"
            value={formatPrice(summary.thirtyDayAverageKgPrice)}
            detail="kg 환산 기준"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
          <div className="h-44 rounded-md border bg-background/70 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData(summary)} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={54}
                  tickFormatter={(value) => Number(value).toLocaleString("ko-KR")}
                />
                <Tooltip
                  formatter={(value) => [`${Number(value).toLocaleString("ko-KR")}원/kg`, "가격"]}
                  labelFormatter={(label) => `조사일 ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#047857"
                  strokeWidth={2.5}
                  dot={{ r: 2.5 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {summary.localRetail ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
                  <MapPin className="h-4 w-4" />
                  {summary.localRetail.regionName} 소매 참고
                </div>
                <p className="mt-1 text-lg font-black text-amber-950">
                  {formatPrice(summary.localRetail.kgPrice)}
                </p>
                <p className="text-xs text-amber-900/75">
                  {formatDate(summary.localRetail.latestDate)} ·{" "}
                  {summary.localRetail.marketNames.join(", ") || "시장명 없음"}
                </p>
              </div>
            ) : (
              <div className="rounded-md border bg-background/70 p-3 text-sm text-muted-foreground">
                지역 소매 데이터는 전주·군산 등 일부 조사 지역에서만 제공됩니다.
              </div>
            )}
            <div className="rounded-md border bg-background/70 p-3">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Store className="h-4 w-4 text-emerald-700" />
                조사 시장
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {summary.marketNames.join(", ") || "시장명 없음"}
              </p>
            </div>
          </div>
        </div>

        {(summary.mappingNote || summary.warning) && (
          <p className="rounded-md border bg-background/70 p-3 text-xs text-muted-foreground">
            {summary.warning || summary.mappingNote}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          KAMIS 값은 중도매·소매 조사 가격입니다. 농가 실제 수취가격이나 계약 가격으로 단정하지
          않습니다.
        </p>
      </CardContent>
    </Card>
  );
};

const PriceMetric = ({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) => (
  <div className="rounded-md border bg-background/80 p-3">
    <p className="text-xs font-semibold text-muted-foreground">{label}</p>
    <p className="mt-1 text-xl font-black tracking-normal">{value}</p>
    <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
  </div>
);

