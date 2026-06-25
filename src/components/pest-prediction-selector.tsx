import { useQuery } from "@tanstack/react-query";
import { getPestsForCrop } from "@/lib/api/pest.functions";
import type { NcpmsPestOption } from "./ncpms-ajax-widget";
import { cn } from "@/lib/utils";
import { Loader2, Bug, Leaf } from "lucide-react";
import type { PestDetailPanel } from "@/domains/pests/detail-selection";

interface PestPredictionSelectorProps {
  cropName: string;
  pests: NcpmsPestOption[];
  selectedPestCode?: string;
  onSelectPest: (code: string) => void;
  pestDetails?: PestDetailPanel[];
}

export function PestPredictionSelector({
  cropName,
  pests,
  selectedPestCode,
  onSelectPest,
  pestDetails = [],
}: PestPredictionSelectorProps) {
  // cropName으로 API를 찔러 해당 작목에 매칭되는 전체 병해충 정보(이미지 포함)를 가져옵니다.
  const { data: searchResult, isLoading } = useQuery({
    queryKey: ["pestsForCrop", cropName],
    queryFn: () => getPestsForCrop({ data: { crop: cropName } }),
    enabled: !!cropName,
  });

  // iframe에서 받아온 pests(예측가능 병해충)와 API 결과(이미지) 매칭
  const pestsWithImages = pests.map((pest) => {
    // API 데이터 중에서 이름이 포함되는 것을 찾습니다
    const searchMatch = searchResult?.data?.find(
      (p) => p.name.includes(pest.name) || pest.name.includes(p.name),
    );
    // 현재 농장의 위험 분석 결과(pestDetails)에도 해당 병해충이 있다면 우선 사용 (이미지 캐시 등)
    const detailMatch = pestDetails.find(
      (d) => d.title.includes(pest.name) || pest.name.includes(d.title),
    );

    return {
      ...pest,
      imageUrl: detailMatch?.imageUrl || searchMatch?.imageUrl,
      type: searchMatch?.type || detailMatch?.type, // "DISEASE" | "INSECT" | "WEED"
    };
  });

  if (pests.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground border rounded-md border-dashed">
        선택된 작목의 병해충 예측 목록을 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div
      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
      role="list"
      aria-label={`${cropName} 예측 지원 모델`}
    >
      {pestsWithImages.map((pest) => {
        const isSelected = selectedPestCode === pest.code;
        const TypeIcon = pest.type === "DISEASE" ? Leaf : Bug;
        return (
          <button
            key={pest.code}
            type="button"
            role="listitem"
            aria-pressed={isSelected}
            className={cn(
              "flex min-h-20 items-center gap-3 rounded-xl border bg-white p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isSelected
                ? "border-[#247050] bg-[#f0f7f2] shadow-sm"
                : "border-[#d8e0d9] hover:border-[#9db1a2] hover:bg-[#fafcf9]",
            )}
            onClick={() => onSelectPest(pest.code)}
          >
            <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#edf2ed] text-[#6d8272]">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-label="이미지 확인 중" />
              ) : (
                <TypeIcon className="h-5 w-5" aria-hidden="true" />
              )}
              {!isLoading && pest.imageUrl && (
                <img
                  src={pest.imageUrl}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}
            </div>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate text-sm font-semibold",
                  isSelected ? "text-[#1e6548]" : "text-[#26372d]",
                )}
              >
                {pest.name}
              </span>
              <span className="mt-1 block text-[11px] font-medium text-muted-foreground">
                예측 지원 모델
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
