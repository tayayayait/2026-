import { Shield, Info } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";

interface PesticideGuideSectionProps {
  data: {
    available: string[];
    precautions: string[];
  };
}

export const PesticideGuideSection = ({ data }: PesticideGuideSectionProps) => {
  if (!data) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-6 w-6 text-emerald-600" />
        <h2 className="text-2xl font-bold text-foreground">약제 사용 가이드</h2>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-emerald-100 bg-emerald-50/20 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold text-emerald-800 text-lg">사용 가능 약제군</h3>
            <div className="flex flex-wrap gap-2">
              {data.available.map((item, idx) => (
                <Badge key={idx} variant="outline" className="bg-white border-emerald-200 text-emerald-700">
                  {item}
                </Badge>
              ))}
              {data.available.length === 0 && (
                <span className="text-muted-foreground text-sm">추천 약제 정보가 없습니다.</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-amber-50/20 shadow-sm">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold text-amber-800 text-lg flex items-center gap-2">
              <Info className="h-5 w-5" /> 필수 주의사항
            </h3>
            <ul className="space-y-2">
              {data.precautions.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-amber-900/90 leading-relaxed">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
