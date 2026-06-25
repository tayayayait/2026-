import { Loader2, MapPinned, Search } from "lucide-react";
import { FarmParcelCandidateList } from "@/components/farm-parcel-candidate-list";
import {
  FARM_PARCEL_CLASSIFICATION_OPTIONS,
  type FarmParcelClassificationFilter,
} from "@/domains/farms/field-registration-ui";
import type { StandardRegionCode } from "@/domains/farms/standard-region";
import type { FarmParcelCandidate } from "@/domains/farms/types";
import { cn } from "@/lib/utils";

export type FarmRegistrationSearchTab = "ADDRESS" | "REGION";
export type FarmRegistrationAddressMode = "PARCEL" | "PNU";

interface FarmRegistrationSearchPanelProps {
  searchTab: FarmRegistrationSearchTab;
  addressMode: FarmRegistrationAddressMode;
  regionQuery: string;
  directPnu: string;
  selectedAddressRegion: StandardRegionCode | null;
  addressRegionCandidates: StandardRegionCode[];
  sidoOptions: StandardRegionCode[];
  sigunguOptions: StandardRegionCode[];
  eupOptions: StandardRegionCode[];
  riOptions: StandardRegionCode[];
  selectedSidoCode: string;
  selectedSigunguCode: string;
  selectedEupCode: string;
  selectedRiCode: string;
  mainLot: string;
  subLot: string;
  isMountain: boolean;
  minArea: string;
  maxArea: string;
  classification: FarmParcelClassificationFilter;
  builtPnu: string | null;
  candidates: FarmParcelCandidate[];
  selectedCandidateId: string | null;
  regionLoading: boolean;
  parcelLoading: boolean;
  onSearchTabChange: (tab: FarmRegistrationSearchTab) => void;
  onAddressModeChange: (mode: FarmRegistrationAddressMode) => void;
  onRegionQueryChange: (value: string) => void;
  onDirectPnuChange: (value: string) => void;
  onSearchRegion: () => void;
  onSelectAddressRegion: (region: StandardRegionCode) => void;
  onSearchPnu: () => void;
  onSidoChange: (value: string) => void;
  onSigunguChange: (value: string) => void;
  onEupChange: (value: string) => void;
  onRiChange: (value: string) => void;
  onMainLotChange: (value: string) => void;
  onSubLotChange: (value: string) => void;
  onMountainChange: (checked: boolean) => void;
  onMinAreaChange: (value: string) => void;
  onMaxAreaChange: (value: string) => void;
  onClassificationChange: (value: FarmParcelClassificationFilter) => void;
  onSearchRegionParcels: () => void;
  onSelectCandidate: (candidate: FarmParcelCandidate) => void;
}

const selectClass =
  "h-10 w-full rounded-lg border border-stone-300 bg-white/80 px-2.5 text-xs font-semibold text-stone-800 outline-none focus:border-[#1d5a3f]";
const inputClass =
  "h-10 w-full rounded-lg border border-stone-300 bg-white/80 px-3 text-xs font-semibold text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d5a3f]";

const RegionSelect = ({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: StandardRegionCode[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) => (
  <label className="space-y-1">
    <span className="text-[10px] font-bold text-stone-500">{label}</span>
    <select
      className={selectClass}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">선택</option>
      {options.map((region) => (
        <option key={region.regionCode} value={region.regionCode}>
          {region.localName ?? region.addressName}
        </option>
      ))}
    </select>
  </label>
);

export const FarmRegistrationSearchPanel = (props: FarmRegistrationSearchPanelProps) => {
  const selectedTreeRegion = props.selectedRiCode || props.selectedEupCode;

  return (
    <aside className="max-h-full overflow-y-auto rounded-[24px] border border-white/65 bg-[#f7f4ed]/95 p-4 shadow-[0_28px_80px_rgba(3,18,12,0.34)] backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#173d2d] text-white">
          <MapPinned className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[10px] font-black tracking-[0.18em] text-[#5b7868]">FARMMAP PARCEL</p>
          <h2 className="text-lg font-black tracking-[-0.04em] text-stone-950">필지 등록</h2>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 rounded-xl bg-stone-200/75 p-1">
        {(["ADDRESS", "REGION"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => props.onSearchTabChange(tab)}
            className={cn(
              "h-9 rounded-lg text-xs font-black transition",
              props.searchTab === tab ? "bg-[#173d2d] text-white shadow" : "text-stone-600",
            )}
          >
            {tab === "ADDRESS" ? "주소 / PNU" : "지역 조건"}
          </button>
        ))}
      </div>

      {props.searchTab === "ADDRESS" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-stone-200 bg-white/55 p-1">
            {(["PARCEL", "PNU"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => props.onAddressModeChange(mode)}
                className={cn(
                  "h-8 rounded-md text-[11px] font-bold",
                  props.addressMode === mode ? "bg-stone-900 text-white" : "text-stone-500",
                )}
              >
                {mode === "PARCEL" ? "법정동+지번" : "PNU 19자리"}
              </button>
            ))}
          </div>

          {props.addressMode === "PARCEL" ? (
            <>
              <label className="block space-y-1">
                <span className="text-[10px] font-bold text-stone-500">법정동 검색</span>
                <span className="flex gap-2">
                  <input
                    className={inputClass}
                    value={props.regionQuery}
                    placeholder="예: 김제시 만경읍 대동리"
                    onChange={(event) => props.onRegionQueryChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        props.onSearchRegion();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={props.onSearchRegion}
                    disabled={props.regionLoading}
                    className="grid h-10 w-11 shrink-0 place-items-center rounded-lg bg-[#173d2d] text-white disabled:opacity-50"
                  >
                    {props.regionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </button>
                </span>
              </label>

              {props.addressRegionCandidates.length > 0 && (
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-stone-200 bg-white/60 p-1.5">
                  {props.addressRegionCandidates.map((region) => (
                    <button
                      key={region.regionCode}
                      type="button"
                      onClick={() => props.onSelectAddressRegion(region)}
                      className={cn(
                        "w-full rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold",
                        props.selectedAddressRegion?.regionCode === region.regionCode
                          ? "bg-[#dfece3] text-[#173d2d]"
                          : "hover:bg-stone-100",
                      )}
                    >
                      {region.addressName}
                    </button>
                  ))}
                </div>
              )}

              <p className="rounded-lg bg-[#e8eee7] px-3 py-2 text-[11px] font-semibold text-[#294f3c]">
                {props.selectedAddressRegion?.addressName ?? "법정동 검색 결과를 선택하세요."}
              </p>
              <LotFields {...props} />
              <p className="break-all rounded-lg bg-stone-900 px-3 py-2 font-mono text-[10px] text-lime-200">
                {props.builtPnu ?? "법정동과 본번을 입력하면 PNU가 생성됩니다."}
              </p>
              <ActionButton
                loading={props.parcelLoading}
                label="PNU로 필지 조회"
                onClick={props.onSearchPnu}
              />
            </>
          ) : (
            <>
              <label className="block space-y-1">
                <span className="text-[10px] font-bold text-stone-500">PNU 19자리</span>
                <input
                  className={`${inputClass} font-mono`}
                  inputMode="numeric"
                  maxLength={19}
                  value={props.directPnu}
                  placeholder="5221025024100060000"
                  onChange={(event) => props.onDirectPnuChange(event.target.value)}
                />
              </label>
              <ActionButton
                loading={props.parcelLoading}
                label="PNU로 필지 조회"
                onClick={props.onSearchPnu}
              />
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <RegionSelect
              label="시도"
              value={props.selectedSidoCode}
              options={props.sidoOptions}
              onChange={props.onSidoChange}
            />
            <RegionSelect
              label="시군구"
              value={props.selectedSigunguCode}
              options={props.sigunguOptions}
              disabled={!props.selectedSidoCode}
              onChange={props.onSigunguChange}
            />
            <RegionSelect
              label="읍면동"
              value={props.selectedEupCode}
              options={props.eupOptions}
              disabled={!props.selectedSigunguCode}
              onChange={props.onEupChange}
            />
            <RegionSelect
              label="리"
              value={props.selectedRiCode}
              options={props.riOptions}
              disabled={!props.selectedEupCode || props.riOptions.length === 0}
              onChange={props.onRiChange}
            />
          </div>
          <LotFields {...props} />
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-stone-500">최소 면적(㎡)</span>
              <input
                className={inputClass}
                inputMode="numeric"
                value={props.minArea}
                onChange={(event) => props.onMinAreaChange(event.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-stone-500">최대 면적(㎡)</span>
              <input
                className={inputClass}
                inputMode="numeric"
                value={props.maxArea}
                onChange={(event) => props.onMaxAreaChange(event.target.value)}
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold text-stone-500">경지 구분</span>
            <select
              className={selectClass}
              value={props.classification}
              onChange={(event) =>
                props.onClassificationChange(event.target.value as FarmParcelClassificationFilter)
              }
            >
              {FARM_PARCEL_CLASSIFICATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <ActionButton
            loading={props.parcelLoading}
            label={selectedTreeRegion ? "지역 조건으로 필지 조회" : "읍면동 또는 리를 선택하세요"}
            disabled={!selectedTreeRegion}
            onClick={props.onSearchRegionParcels}
          />
        </div>
      )}

      <div className="mt-4" aria-label="필지 목록">
        <FarmParcelCandidateList
          candidates={props.candidates}
          selectedCandidateId={props.selectedCandidateId}
          loading={props.parcelLoading}
          onSelect={props.onSelectCandidate}
        />
      </div>
    </aside>
  );
};

const LotFields = (
  props: Pick<
    FarmRegistrationSearchPanelProps,
    "mainLot" | "subLot" | "isMountain" | "onMainLotChange" | "onSubLotChange" | "onMountainChange"
  >,
) => (
  <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
    <label className="space-y-1">
      <span className="text-[10px] font-bold text-stone-500">본번</span>
      <input
        className={inputClass}
        inputMode="numeric"
        value={props.mainLot}
        onChange={(event) => props.onMainLotChange(event.target.value)}
      />
    </label>
    <label className="space-y-1">
      <span className="text-[10px] font-bold text-stone-500">부번</span>
      <input
        className={inputClass}
        inputMode="numeric"
        value={props.subLot}
        onChange={(event) => props.onSubLotChange(event.target.value)}
      />
    </label>
    <label className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-300 bg-white/70 px-2.5 text-[11px] font-bold text-stone-700">
      <input
        type="checkbox"
        checked={props.isMountain}
        onChange={(event) => props.onMountainChange(event.target.checked)}
      />
      산
    </label>
  </div>
);

const ActionButton = ({
  label,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || loading}
    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#173d2d] text-xs font-black text-white shadow-[0_8px_20px_rgba(23,61,45,0.2)] transition hover:bg-[#225a42] disabled:cursor-not-allowed disabled:opacity-45"
  >
    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
    {label}
  </button>
);
