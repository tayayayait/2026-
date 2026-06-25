import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill, CheckCircle2, AlertTriangle, HelpCircle, ShieldCheck } from "lucide-react";
import type { PesticideRecommendationView } from "@/domains/pesticides/safe-use";
import type { ReportSourceStatus } from "@/domains/reports/report-generation";

const SOURCE_STATUS_CONFIG: Record<ReportSourceStatus, { label: string; className: string }> = {
  LIVE: { label: "실 API 응답", className: "bg-emerald-100 text-emerald-700" },
  EMPTY: { label: "응답·결과 없음", className: "bg-gray-100 text-gray-700" },
  FALLBACK: { label: "대체 데이터", className: "bg-yellow-100 text-yellow-700" },
  FAILED: { label: "호출 실패", className: "bg-red-100 text-red-700" },
};

interface PesticideRecommendationCardProps {
  recommendations: PesticideRecommendationView;
  sourceStatus?: ReportSourceStatus;
}

export function PesticideRecommendationCard({
  recommendations,
  sourceStatus,
}: PesticideRecommendationCardProps) {
  const { usable, restricted, unknown, growthStageLabel, targetCrop, targetPest, totalCount } =
    recommendations;

  return (
    <Card className="overflow-hidden border-emerald-200">
      <CardHeader className="border-b border-emerald-100 bg-emerald-50/60 pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg text-emerald-950">
              <ShieldCheck className="h-5 w-5 text-emerald-700" /> 등록농약 안전사용기준
            </CardTitle>
            <p className="mt-1 text-sm text-emerald-900/75">
              {targetCrop} · {growthStageLabel}
              {targetPest ? ` · 대상 병해충 ${targetPest}` : " · 작물 전체 등록농약"}
            </p>
          </div>
          {sourceStatus ? (
            <span
              className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold ${SOURCE_STATUS_CONFIG[sourceStatus].className}`}
            >
              {SOURCE_STATUS_CONFIG[sourceStatus].label}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {totalCount === 0 ? (
          <div className="flex min-h-28 flex-col items-center justify-center text-center">
            <Pill className="mb-2 h-7 w-7 text-muted-foreground" />
            <p className="text-sm font-medium">등록된 농약 정보가 없습니다</p>
            <p className="mt-1 text-xs text-muted-foreground">
              PERS 농약등록정보 SVC01 응답이 비어 있거나 호출에 실패했습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-emerald-100 bg-emerald-50/70 p-3">
              <p className="text-sm font-medium text-emerald-950">
                현재 {growthStageLabel} 기준 살포 가능 {usable.length}종 · 제한{" "}
                {restricted.length}종
                {unknown.length > 0 ? ` · 정보 부족 ${unknown.length}종` : ""}
              </p>
              <p className="mt-1 text-xs text-emerald-900/70">
                PERS SVC01의 작물·병해충 등록정보와 수확전금지일수(PHI)를 기준으로 분류합니다.
              </p>
            </div>

            {usable.length > 0 ? (
              <PesticideSection title="살포 가능" tone="usable" entries={usable.slice(0, 8)} />
            ) : null}

            {restricted.length > 0 ? (
              <PesticideSection
                title="현재 생육단계에서 제한"
                tone="restricted"
                entries={restricted.slice(0, 8)}
              />
            ) : null}

            {unknown.length > 0 ? (
              <PesticideSection
                title="안전사용기간 미확인"
                tone="unknown"
                entries={unknown.slice(0, 5)}
              />
            ) : null}

            <p className="text-xs text-muted-foreground">
              이 화면은 농약등록정보 API 기준입니다. 등록취소 여부는 별도 API를 사용하지 않으므로 최종
              살포 전 제품 라벨과 현장 확인이 필요합니다.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type SectionTone = "usable" | "restricted" | "unknown";
type PesticideEntry = PesticideRecommendationView["usable"][number];

const SECTION_TONE: Record<SectionTone, { icon: React.ReactNode; badge: string; label: string }> =
  {
    usable: {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
      badge: "bg-emerald-100 text-emerald-700",
      label: "가능",
    },
    restricted: {
      icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
      badge: "bg-amber-100 text-amber-700",
      label: "제한",
    },
    unknown: {
      icon: <HelpCircle className="h-4 w-4 text-gray-500" />,
      badge: "bg-gray-100 text-gray-600",
      label: "미확인",
    },
  };

interface PesticideSectionProps {
  title: string;
  tone: SectionTone;
  entries: PesticideEntry[];
}

function PesticideSection({ title, tone, entries }: PesticideSectionProps) {
  const config = SECTION_TONE[tone];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {config.icon}
        {title} ({entries.length}종)
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-md border bg-background p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium leading-snug">{entry.brandName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[entry.productName, entry.company].filter(Boolean).join(" · ") || "품목 정보 없음"}
                </p>
              </div>
              <span
                className={`inline-flex h-5 shrink-0 items-center rounded px-2 text-[10px] font-semibold ${config.badge}`}
              >
                {config.label}
              </span>
            </div>

            <PesticideFacts entry={entry} />

            {entry.usabilityReason ? (
              <p className="mt-2 rounded-sm bg-amber-50 px-2 py-1 text-xs text-amber-800">
                {entry.usabilityReason}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function PesticideFacts({ entry }: { entry: PesticideEntry }) {
  const facts = [
    entry.diseaseWeedName ? ["적용", entry.diseaseWeedName] : null,
    entry.useName ? ["용도", entry.useName] : null,
    entry.useMethod ? ["방법", entry.useMethod] : null,
    entry.dilutionUnit ? ["희석/사용량", entry.dilutionUnit] : null,
    entry.useCount !== undefined ? ["횟수", `${entry.useCount}회 이내`] : null,
    entry.phiDays !== undefined ? ["PHI", `수확 ${entry.phiDays}일 전`] : null,
    entry.actionMechanism ? ["작용기작", entry.actionMechanism] : null,
    entry.activeIngredient ? ["주성분", entry.activeIngredient] : null,
  ].filter((fact): fact is [string, string] => fact !== null);

  if (facts.length === 0) {
    return <p className="mt-2 text-xs text-muted-foreground">세부 안전사용기준 정보 없음</p>;
  }

  return (
    <dl className="mt-2 grid gap-1 text-xs text-muted-foreground">
      {facts.map(([label, value]) => (
        <div key={`${label}-${value}`} className="grid grid-cols-[72px_1fr] gap-2">
          <dt className="font-medium text-foreground/70">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
