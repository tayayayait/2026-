import { CloudSun, ArrowRight } from "lucide-react";
import { Card, CardContent } from "../ui/card";

interface WeatherScheduleSectionProps {
  data: {
    condition: string;
    adjustment: string;
  }[];
}

export const WeatherScheduleSection = ({ data }: WeatherScheduleSectionProps) => {
  if (!data || data.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <CloudSun className="h-6 w-6 text-sky-500" />
        <h2 className="text-2xl font-bold text-foreground">기상 연계 일정 조정</h2>
      </div>
      
      <Card className="border-sky-200 overflow-hidden shadow-sm">
        <div className="bg-sky-50 px-6 py-3 border-b border-sky-100">
          <p className="text-sm font-medium text-sky-800">
            향후 기상 변화에 따른 필수 작업 일정 조정 가이드입니다.
          </p>
        </div>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {data.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center p-4 gap-4 hover:bg-slate-50 transition-colors">
                <div className="font-semibold text-foreground sm:w-1/3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                  {item.condition}
                </div>
                <div className="hidden sm:block text-muted-foreground">
                  <ArrowRight className="h-4 w-4" />
                </div>
                <div className="text-foreground/90 sm:w-2/3">
                  {item.adjustment}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
};
