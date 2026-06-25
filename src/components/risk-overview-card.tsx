import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { RiskGauge } from "@/components/risk-badge";
import { Card, CardContent } from "@/components/ui/card";
import type { RiskAssessment } from "@/domains/shared/types";

const getRiskCardClass = (risk: RiskAssessment) => {
  if (risk.level === "CRITICAL") return "border-risk-critical-bg bg-risk-critical-bg/5";
  if (risk.level === "WARNING") return "border-risk-warning-bg bg-risk-warning-bg/5";
  if (risk.level === "WATCH") return "border-risk-watch-bg bg-risk-watch-bg/5";
  return "border-risk-safe-bg bg-risk-safe-bg/5";
};

const getRiskMessage = (risk: RiskAssessment) => {
  if (risk.level === "CRITICAL") return "즉각적인 조치가 필요합니다.";
  if (risk.level === "WARNING") return "주의 깊은 관찰과 예방 조치가 필요합니다.";
  if (risk.level === "WATCH") return "위험 요인을 지속적으로 관찰해야 합니다.";
  return "현재 위험도는 관리 가능한 수준입니다.";
};

export const RiskOverviewCard = ({ risk }: { risk: RiskAssessment | null }) => {
  if (!risk) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold">위험도 계산 보류</h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            기상청 또는 NCPMS 실응답이 부족해 임의 기본값으로 점수를 계산하지 않습니다. 데이터 출처
            상태를 확인한 뒤 다시 조회하세요.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isCritical = risk.level === "CRITICAL";

  return (
    <Card className={`border-2 ${getRiskCardClass(risk)}`}>
      <CardContent className="flex flex-col items-center gap-8 p-6 md:flex-row md:p-8">
        <div className="shrink-0 text-center">
          <RiskGauge score={risk.score} level={risk.level} />
        </div>
        <div className="flex-1 space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            {isCritical ? (
              <AlertTriangle className="h-6 w-6 text-risk-critical-fg" />
            ) : (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            )}
            {getRiskMessage(risk)}
          </h2>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">위험 요인 분석</h3>
            {risk.factors.length > 0 ? (
              <ul className="space-y-2">
                {risk.factors.map((factor) => (
                  <li
                    key={`${factor.name}-${factor.score}`}
                    className="flex items-start gap-2 rounded-md border border-border/50 bg-background p-2 text-sm shadow-sm"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-risk-warning-fg" />
                    <div>
                      <span className="font-semibold">{factor.name}</span>
                      <span className="ml-2 text-muted-foreground">{factor.description}</span>
                      <span className="ml-2 text-xs font-bold text-risk-critical-fg">
                        +{factor.score}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm">현재 감지된 주요 위험 요인이 없습니다.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
