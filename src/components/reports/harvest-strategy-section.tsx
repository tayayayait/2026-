import { Tractor, Clock, Banknote } from "lucide-react";
import { Card, CardContent } from "../ui/card";

interface HarvestStrategySectionProps {
  data: {
    expectedTiming: string;
    priceForecast: string;
    recommendation: string;
  };
}

export const HarvestStrategySection = ({ data }: HarvestStrategySectionProps) => {
  if (!data) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Tractor className="h-6 w-6 text-amber-600" />
        <h2 className="text-2xl font-bold text-foreground">수확 및 판매 시점 결정</h2>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6 shadow-sm">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="mt-1">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-1">예상 수확 시기</h4>
                <p className="text-foreground leading-relaxed">{data.expectedTiming}</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="mt-1">
                <Banknote className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-800 uppercase tracking-wider mb-1">수확 시점 가격 전망</h4>
                <p className="text-foreground leading-relaxed">{data.priceForecast}</p>
              </div>
            </div>
          </div>

          <Card className="border-none shadow-md bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <h4 className="font-bold text-lg text-foreground mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-sm">💡</span>
                최적의 판매 시점 제안
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                {data.recommendation}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
