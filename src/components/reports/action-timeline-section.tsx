import { Calendar, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

interface ActionTimelineSectionProps {
  data: {
    today: string[];
    thisWeek: string[];
    thisMonth: string[];
  };
}

export const ActionTimelineSection = ({ data }: ActionTimelineSectionProps) => {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-6 w-6 text-indigo-600" />
        <h2 className="text-2xl font-bold text-foreground">실행 타임라인</h2>
      </div>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="today" className="font-semibold text-base">오늘 즉시</TabsTrigger>
          <TabsTrigger value="thisWeek" className="font-semibold text-base">이번 주</TabsTrigger>
          <TabsTrigger value="thisMonth" className="font-semibold text-base">이번 달</TabsTrigger>
        </TabsList>
        
        <TabsContent value="today" className="space-y-3">
          <Card className="border-red-200 bg-red-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-800 text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" /> 24시간 내 긴급/우선 조치
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data.today.map((task, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                    <span className="text-foreground leading-relaxed font-medium">{task}</span>
                  </li>
                ))}
                {data.today.length === 0 && (
                  <li className="text-muted-foreground italic">오늘 즉시 수행해야 할 특이 작업은 없습니다.</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="thisWeek" className="space-y-3">
          <Card className="border-orange-200 bg-orange-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-orange-800 text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" /> 향후 7일 이내 예찰 및 준비
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data.thisWeek.map((task, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                    <span className="text-foreground leading-relaxed font-medium">{task}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="thisMonth" className="space-y-3">
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-800 text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" /> 이번 달 주요 농사 일정
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data.thisMonth.map((task, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                    <span className="text-foreground leading-relaxed font-medium">{task}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
};
