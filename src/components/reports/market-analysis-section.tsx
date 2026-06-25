import { TrendingUp, BarChart3, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface MarketAnalysisSectionProps {
  data: {
    trendSummary: string;
    seasonality: string;
    strategy: string;
  };
  points?: { date: string; averageKgPrice: number; }[];
}

export const MarketAnalysisSection = ({ data, points }: MarketAnalysisSectionProps) => {
  if (!data) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-6 w-6 text-violet-600" />
        <h2 className="text-2xl font-bold text-foreground">가격 분석 및 출하 전략</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-violet-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-violet-100 rounded-full">
                <BarChart3 className="h-6 w-6 text-violet-700" />
              </div>
              <h3 className="font-bold text-violet-900">최근 가격 추세</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {data.trendSummary}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-fuchsia-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-fuchsia-100 rounded-full">
                <CalendarIcon className="h-6 w-6 text-fuchsia-700" />
              </div>
              <h3 className="font-bold text-fuchsia-900">계절성 특징</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {data.seasonality}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-indigo-100 rounded-full">
                <Target className="h-6 w-6 text-indigo-700" />
              </div>
              <h3 className="font-bold text-indigo-900">판매 전략</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {data.strategy}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {points && points.length > 0 && (
        <Card className="mt-4 border-violet-100 shadow-sm print-hide">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-violet-800">최근 가격 추이 (화면 전용)</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" fontSize={12} tickMargin={8} tickFormatter={(val) => val.slice(-4)} />
                <YAxis fontSize={12} width={60} tickFormatter={(val) => val.toLocaleString()} />
                <Tooltip formatter={(value: number) => [`${value.toLocaleString()}원`, "평균가"]} labelFormatter={(label) => `날짜: ${label}`} />
                <Line type="monotone" dataKey="averageKgPrice" stroke="#7c3aed" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground mt-3 text-right">
        * 본 분석은 KAMIS 도·소매 조사 가격을 바탕으로 하며 실제 수취가와 차이가 있을 수 있습니다.
      </p>
    </section>
  );
};

// SVG Icon Helper for Calendar as it's not exported from lucide-react directly or we want a specific look
function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}
