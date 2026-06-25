import { Check, Crosshair, MapPinOff } from "lucide-react";
import { formatParcelCandidateAddress } from "@/domains/farms/field-registration-ui";
import { getFarmMapLandTypeStyle } from "@/domains/farms/farm-map-presentation";
import type { FarmParcelCandidate } from "@/domains/farms/types";
import { cn } from "@/lib/utils";

interface FarmParcelCandidateListProps {
  candidates: FarmParcelCandidate[];
  selectedCandidateId: string | null;
  loading: boolean;
  onSelect: (candidate: FarmParcelCandidate) => void;
}

export const FarmParcelCandidateList = ({
  candidates,
  selectedCandidateId,
  loading,
  onSelect,
}: FarmParcelCandidateListProps) => (
  <section className="border-t border-stone-200/80 pt-4">
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-xs font-black tracking-[-0.01em] text-stone-900">필지 목록</h3>
      <span className="rounded-full bg-[#173d2d] px-2 py-0.5 text-[10px] font-bold text-white">
        {loading ? "조회 중" : `${candidates.length}개`}
      </span>
    </div>

    {candidates.length === 0 ? (
      <div className="rounded-xl border border-dashed border-stone-300 bg-white/45 px-4 py-6 text-center">
        <Crosshair className="mx-auto mb-2 h-5 w-5 text-stone-400" />
        <p className="text-xs font-semibold text-stone-600">
          검색하거나 지도에서 필지를 선택하세요.
        </p>
      </div>
    ) : (
      <div className="space-y-1.5">
        {candidates.map((candidate, index) => {
          const selected = selectedCandidateId === candidate.farmMapId;
          const landTypeStyle = getFarmMapLandTypeStyle(candidate.cropLandType);
          return (
            <button
              key={`${candidate.farmMapId}-${candidate.pnu ?? index}`}
              type="button"
              onClick={() => onSelect(candidate)}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition",
                selected
                  ? "border-[#1d5a3f] bg-[#e5efe8] shadow-[0_5px_18px_rgba(23,61,45,0.12)]"
                  : "border-stone-200 bg-white/70 hover:border-[#6c8c77] hover:bg-white",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                  selected ? "bg-[#173d2d] text-white" : "bg-stone-100 text-stone-500",
                )}
              >
                {selected ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span className="text-[9px]">{index + 1}</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-stone-900">
                  {formatParcelCandidateAddress(candidate)}
                </span>
                <span className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-stone-500">
                  <span>{Math.round(candidate.areaSquareMeter).toLocaleString()}㎡</span>
                  <span>{candidate.pnu ?? "PNU 없음"}</span>
                </span>
              </span>
              <span
                aria-label="경지 유형"
                className="mt-0.5 inline-flex h-6 shrink-0 items-center gap-1 rounded-md border bg-white/80 px-2 text-[10px] font-black"
                style={{
                  borderColor: landTypeStyle.strokeColor,
                  color: landTypeStyle.strokeColor,
                }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-[2px]"
                  style={{ backgroundColor: landTypeStyle.fillColor }}
                />
                {candidate.cropLandType}
              </span>
              {!candidate.centroid ? <MapPinOff className="mt-0.5 h-3.5 w-3.5 text-amber-600" /> : null}
            </button>
          );
        })}
      </div>
    )}
  </section>
);
