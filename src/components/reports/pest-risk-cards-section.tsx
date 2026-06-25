import { Bug, Eye, Calendar, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

interface PestRiskCardsSectionProps {
  data: {
    pestName: string;
    riskProbability: string;
    observationMethod: string;
    actionTiming: string;
    treatmentType: string;
  }[];
}

export const PestRiskCardsSection = ({ data }: PestRiskCardsSectionProps) => {
  if (!data || data.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Bug className="h-6 w-6 text-rose-600" />
        <h2 className="text-2xl font-bold text-foreground">병해충 집중 관찰 가이드</h2>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((pest, idx) => (
          <Card key={idx} className="border-rose-100 shadow-sm">
            <CardHeader className="bg-rose-50/50 pb-3 border-b border-rose-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-rose-800 flex items-center gap-2">
                  <Bug className="h-5 w-5" />
                  {pest.pestName}
                </CardTitle>
                <Badge variant={pest.riskProbability.includes("높음") ? "destructive" : "secondary"}>
                  {pest.riskProbability}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-100 p-1.5 mt-0.5 shrink-0">
                  <Eye className="h-4 w-4 text-blue-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">관찰 포인트</h4>
                  <p className="text-sm leading-relaxed">{pest.observationMethod}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-amber-100 p-1.5 mt-0.5 shrink-0">
                  <Calendar className="h-4 w-4 text-amber-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">대응 시기</h4>
                  <p className="text-sm leading-relaxed">{pest.actionTiming}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-green-100 p-1.5 mt-0.5 shrink-0">
                  <ShieldCheck className="h-4 w-4 text-green-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">방제 성격</h4>
                  <p className="text-sm leading-relaxed">{pest.treatmentType}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};
