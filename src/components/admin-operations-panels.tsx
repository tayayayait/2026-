import { MapPin, Tractor, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RegionalOperations } from "@/domains/analysis/snapshot-operations";

export const RegionalRiskCard = ({ operations }: { operations: RegionalOperations }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        <MapPin className="h-5 w-5 text-primary" /> 지역별 최신 위험도
      </CardTitle>
    </CardHeader>
    <CardContent>
      {operations.regions.length > 0 ? (
        <div className="divide-y">
          {operations.regions.map((region) => (
            <div key={region.region} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{region.region}</div>
                <div className="text-xs text-muted-foreground">
                  농장 {region.farmCount} · 긴급 {region.criticalCount} · 주의 {region.warningCount}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-bold">{region.averageScore ?? "-"}</div>
                <div className="text-xs text-muted-foreground">평균 점수</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyOperationsState />
      )}
    </CardContent>
  </Card>
);

export const WorkDemandCard = ({ operations }: { operations: RegionalOperations }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        <Tractor className="h-5 w-5 text-primary" /> 권장 작업 수요
      </CardTitle>
    </CardHeader>
    <CardContent>
      {operations.workDemand.length > 0 ? (
        <div className="divide-y">
          {operations.workDemand.map((item) => (
            <div key={item.work} className="flex items-center justify-between py-3">
              <span className="font-medium">{item.work}</span>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold">
                {item.count}개 농장
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyOperationsState />
      )}
    </CardContent>
  </Card>
);

export const OperationsSummaryCard = ({
  icon: Icon,
  value,
  label,
  alert = false,
}: {
  icon: typeof Users;
  value: string;
  label: string;
  alert?: boolean;
}) => (
  <Card className={alert ? "border-risk-warning-bg/50" : undefined}>
    <CardContent className="flex items-center gap-3 p-4 sm:p-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold">{value}</div>
        <div className="truncate text-xs text-muted-foreground">{label}</div>
      </div>
    </CardContent>
  </Card>
);

const EmptyOperationsState = () => (
  <p className="py-10 text-center text-sm text-muted-foreground">
    저장된 농장 분석이 없습니다. 대시보드에서 분석을 실행하세요.
  </p>
);
