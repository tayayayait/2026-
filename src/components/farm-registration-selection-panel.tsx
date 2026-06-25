import { AlertTriangle, Loader2, MapPinCheck, Sprout } from "lucide-react";
import { formatParcelCandidateAddress } from "@/domains/farms/field-registration-ui";
import { NCPMS_GROWTH_STAGES } from "@/domains/farms/growth-stage";
import { extractFarmRegion } from "@/domains/farms/registration";
import type { Crop, FarmParcelCandidate, NcpmsGrowthStageCode } from "@/domains/farms/types";

const CROPS: Crop[] = ["감귤", "감자", "고추", "벼", "배", "사과", "파", "포도"];
const fieldClass =
  "h-10 rounded-lg border border-white/25 bg-white/10 px-3 text-xs font-semibold text-white outline-none placeholder:text-white/45 focus:border-lime-300";

interface FarmRegistrationSelectionPanelProps {
  selectedCandidate: FarmParcelCandidate | null;
  sourceLabel: string;
  name: string;
  crop: Crop;
  growthStageCode: NcpmsGrowthStageCode | "";
  area: number;
  submitting: boolean;
  canSubmit: boolean;
  error: string | null;
  onNameChange: (value: string) => void;
  onCropChange: (value: Crop) => void;
  onGrowthStageChange: (value: NcpmsGrowthStageCode | "") => void;
  onAreaChange: (value: number) => void;
  onCancel: () => void;
}

export const FarmRegistrationSelectionPanel = (props: FarmRegistrationSelectionPanelProps) => {
  const selectedAddress = props.selectedCandidate
    ? formatParcelCandidateAddress(props.selectedCandidate)
    : null;
  const selectedRegion = selectedAddress ? extractFarmRegion(selectedAddress) : null;

  return (
    <section className="overflow-hidden rounded-[20px] border border-white/20 bg-[#0d241b]/94 text-white shadow-[0_25px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
      <div className="grid gap-3 p-3.5 xl:grid-cols-[minmax(190px,0.9fr)_minmax(360px,1.6fr)_minmax(148px,auto)] xl:items-end">
        <div className="min-w-0">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-black tracking-[0.15em] text-lime-300">
            <MapPinCheck className="h-3.5 w-3.5" />
            선택 필지 정보 · {props.sourceLabel}
          </p>
          {props.selectedCandidate && selectedAddress ? (
            <>
              <p className="truncate text-sm font-black">{selectedAddress}</p>
              <p className="mt-1 text-[11px] text-white/60">
                지역 {selectedRegion || "확인 불가"} · {props.selectedCandidate.cropLandType} ·{" "}
                {Math.round(props.selectedCandidate.areaSquareMeter).toLocaleString()}㎡ ·{" "}
                {props.selectedCandidate.pnu ?? "PNU 없음"}
              </p>
              {!props.selectedCandidate.centroid && (
                <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-300">
                  <AlertTriangle className="h-3 w-3" />
                  좌표가 없어 등록할 수 없습니다.
                </p>
              )}
            </>
          ) : (
            <p className="text-xs font-semibold text-white/55">
              지도 또는 필지 목록에서 1개를 선택하세요.
            </p>
          )}
        </div>

        <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[1.2fr_0.72fr_0.9fr_0.7fr]">
          <label className="space-y-1">
            <span className="text-[10px] font-bold text-white/55">농장명</span>
            <input
              className={`${fieldClass} w-full`}
              value={props.name}
              placeholder="예: 만경 들녘 1필지"
              onChange={(event) => props.onNameChange(event.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold text-white/55">작물</span>
            <select
              className={`${fieldClass} w-full`}
              value={props.crop}
              onChange={(event) => props.onCropChange(event.target.value as Crop)}
            >
              {CROPS.map((crop) => (
                <option className="text-stone-900" key={crop}>
                  {crop}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold text-white/55">생육 단계</span>
            <select
              className={`${fieldClass} w-full`}
              required
              value={props.growthStageCode}
              onChange={(event) =>
                props.onGrowthStageChange(event.target.value as NcpmsGrowthStageCode | "")
              }
            >
              <option className="text-stone-900" value="" disabled hidden></option>
              {NCPMS_GROWTH_STAGES.map((stage) => (
                <option className="text-stone-900" key={stage.code} value={stage.code}>
                  {stage.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold text-white/55">재배면적(㎡)</span>
            <input
              className={`${fieldClass} w-full`}
              type="number"
              min={1}
              value={props.area || ""}
              onChange={(event) => props.onAreaChange(Number(event.target.value))}
            />
          </label>
        </div>

        <div className="flex min-w-0 gap-2 xl:flex-col">
          <button
            type="submit"
            disabled={!props.canSubmit || props.submitting}
            className="flex h-11 min-w-[148px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-lime-300 px-3.5 text-xs font-black text-[#10251b] transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {props.submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sprout className="h-4 w-4" />
            )}
            선택한 필지 등록
          </button>
          <button
            type="button"
            onClick={props.onCancel}
            className="h-9 rounded-lg border border-white/20 px-4 text-[11px] font-bold text-white/65 hover:bg-white/10"
          >
            취소
          </button>
        </div>
      </div>
      {props.error && (
        <div className="border-t border-red-300/20 bg-red-500/15 px-4 py-2 text-xs font-bold text-red-100">
          {props.error}
        </div>
      )}
    </section>
  );
};
