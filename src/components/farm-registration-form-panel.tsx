import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MapPin,
  Search,
  Sprout,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { CROPS } from "@/data/demo";
import { NCPMS_GROWTH_STAGES } from "@/domains/farms/growth-stage";
import {
  JEONBUK_SEARCH_REGIONS,
  type FarmAddressSearchType,
  type FarmSearchTab,
  type JeonbukSearchRegion,
} from "@/domains/farms/registration";
import type {
  AddressCandidate,
  Crop,
  FarmMapParcel,
  NcpmsGrowthStageCode,
} from "@/domains/farms/types";
import { cn } from "@/lib/utils";

interface FarmRegistrationFormPanelProps {
  name: string;
  address: string;
  crop: Crop;
  growthStageCode: NcpmsGrowthStageCode | "";
  area: number;
  error: string | null;
  addressLoading: boolean;
  submitting: boolean;
  canSubmit: boolean;
  tooManyCandidates: boolean;
  addressCandidates: AddressCandidate[];
  selectedAddressId: string | null;
  selectedParcel: FarmMapParcel | null;
  searchTab: FarmSearchTab;
  addressSearchType: FarmAddressSearchType;
  selectedRegionId: string | null;
  onNameChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onAddressSearch: () => void;
  onAddressSelect: (candidate: AddressCandidate) => void;
  onSearchTabChange: (tab: FarmSearchTab) => void;
  onAddressSearchTypeChange: (type: FarmAddressSearchType) => void;
  onRegionSelect: (region: JeonbukSearchRegion) => void;
  onCropChange: (value: Crop) => void;
  onGrowthStageChange: (value: NcpmsGrowthStageCode | "") => void;
  onAreaChange: (value: number) => void;
  onCancel: () => void;
}

export const FarmRegistrationFormPanel = ({
  name,
  address,
  crop,
  growthStageCode,
  area,
  error,
  addressLoading,
  submitting,
  canSubmit,
  tooManyCandidates,
  addressCandidates,
  selectedAddressId,
  selectedParcel,
  searchTab,
  addressSearchType,
  selectedRegionId,
  onNameChange,
  onAddressChange,
  onAddressSearch,
  onAddressSelect,
  onSearchTabChange,
  onAddressSearchTypeChange,
  onRegionSelect,
  onCropChange,
  onGrowthStageChange,
  onAreaChange,
  onCancel,
}: FarmRegistrationFormPanelProps) => (
  <aside className="flex h-[calc(100vh-4rem)] min-h-[620px] flex-col border-r border-slate-200 bg-white shadow-[10px_0_30px_-24px_rgba(15,23,42,0.45)]">
    <header className="border-b border-slate-200 px-5 pb-4 pt-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <MapPin className="h-5 w-5 fill-blue-700 text-blue-700" />
          <h2 className="text-lg font-black tracking-tight text-slate-950">팜맵 검색</h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="농장 등록 닫기"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </header>

    <div className="flex-1 overflow-y-auto">
      <section className="border-b border-slate-200 px-5 py-4">
        <div className="grid grid-cols-2 border border-blue-700">
          <SearchTabButton
            active={searchTab === "ADDRESS"}
            label="주소"
            onClick={() => onSearchTabChange("ADDRESS")}
          />
          <SearchTabButton
            active={searchTab === "REGION"}
            label="지역"
            onClick={() => onSearchTabChange("REGION")}
          />
        </div>

        {searchTab === "ADDRESS" ? (
          <div className="mt-3">
            <div className="grid grid-cols-[96px_minmax(0,1fr)_44px]">
              <select
                value={addressSearchType}
                onChange={(event) =>
                  onAddressSearchTypeChange(event.target.value as FarmAddressSearchType)
                }
                aria-label="주소 검색 방식"
                className="h-11 rounded-l-md border border-r-0 border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-700"
              >
                <option value="PARCEL">지번</option>
                <option value="ROAD">도로명</option>
              </select>
              <input
                type="search"
                value={address}
                onChange={(event) => onAddressChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onAddressSearch();
                  }
                }}
                placeholder={
                  addressSearchType === "PARCEL"
                    ? "읍·면·동과 지번을 입력하세요"
                    : "도로명과 건물번호를 입력하세요"
                }
                className="h-11 min-w-0 border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-700"
              />
              <button
                type="button"
                onClick={onAddressSearch}
                disabled={addressLoading}
                aria-label="주소 검색"
                className="inline-flex h-11 items-center justify-center rounded-r-md border border-l-0 border-slate-300 bg-white text-blue-800 transition-colors hover:bg-blue-50 disabled:opacity-50"
              >
                {addressLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Search className="h-5 w-5 stroke-[2.4]" />
                )}
              </button>
            </div>

            <AddressResults
              candidates={addressCandidates}
              selectedAddressId={selectedAddressId}
              searchType={addressSearchType}
              loading={addressLoading}
              tooManyCandidates={tooManyCandidates}
              hasQuery={address.trim().length >= 2}
              onSelect={onAddressSelect}
            />
            <p className="mt-2 text-[10px] leading-4 text-slate-400">
              지번: VWorld · 도로명: 도로명주소 API · 대체: Naver Maps / © OpenStreetMap contributors
            </p>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-xs leading-5 text-slate-500">
              시·군을 선택하면 해당 지역으로 지도가 이동하고 주변 팜맵 필지를 조회합니다.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {JEONBUK_SEARCH_REGIONS.map((region) => (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => onRegionSelect(region)}
                  className={cn(
                    "h-9 rounded-md border text-xs font-bold transition-colors",
                    selectedRegionId === region.id
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-500 hover:bg-emerald-50",
                  )}
                >
                  {region.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-5 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-900 text-emerald-100">
            <Sprout className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
              FarmMap Registration
            </p>
            <h3 className="text-base font-black tracking-tight text-slate-950">농장 정보</h3>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <PanelField label="농장 이름">
          <input
            type="text"
            required
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="예: 김제 만경 1농장"
            className={inputClassName}
          />
        </PanelField>

        <div className="grid grid-cols-2 gap-3">
          <PanelField label="주요 작물">
            <select
              value={crop}
              onChange={(event) => onCropChange(event.target.value as Crop)}
              className={inputClassName}
            >
              {CROPS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </PanelField>
          <PanelField label="생육 단계">
            <select
              required
              value={growthStageCode}
              onChange={(event) =>
                onGrowthStageChange(event.target.value as NcpmsGrowthStageCode | "")
              }
              className={inputClassName}
            >
              <option value="" disabled hidden></option>
              {NCPMS_GROWTH_STAGES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </PanelField>
        </div>

        <PanelField label="재배 면적" hint="선택한 팜맵 필지 면적이 자동 반영됩니다.">
          <div className="relative">
            <input
              type="number"
              required
              min={1}
              value={area}
              onChange={(event) => onAreaChange(Number(event.target.value))}
              className={`${inputClassName} pr-10`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
              ㎡
            </span>
          </div>
        </PanelField>

        <SelectedParcelSummary parcel={selectedParcel} />
      </section>
    </div>

    <footer className="grid grid-cols-[auto_1fr] gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-100"
      >
        취소
      </button>
      <button
        type="submit"
        disabled={submitting || !canSubmit}
        className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-800 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "선택 필지로 농장 등록"}
      </button>
    </footer>
  </aside>
);

const SearchTabButton = ({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      "h-10 text-sm font-bold transition-colors",
      active ? "bg-blue-700 text-white" : "bg-slate-50 text-slate-500 hover:bg-blue-50",
    )}
  >
    {label}
  </button>
);

const AddressResults = ({
  candidates,
  selectedAddressId,
  searchType,
  loading,
  tooManyCandidates,
  hasQuery,
  onSelect,
}: {
  candidates: AddressCandidate[];
  selectedAddressId: string | null;
  searchType: FarmAddressSearchType;
  loading: boolean;
  tooManyCandidates: boolean;
  hasQuery: boolean;
  onSelect: (candidate: AddressCandidate) => void;
}) => (
  <div className="mt-3 max-h-[34vh] min-h-28 overflow-y-auto border border-slate-100 bg-slate-50">
    {loading ? (
      <div className="flex h-28 items-center justify-center gap-2 text-xs font-semibold text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
        주소를 검색하고 있습니다.
      </div>
    ) : candidates.length > 0 ? (
      <>
        {tooManyCandidates && (
          <p className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            검색 결과가 많습니다. 읍·면·동과 번지를 더 구체적으로 입력하세요.
          </p>
        )}
        <ul className="divide-y divide-slate-200">
          {candidates.map((candidate) => {
            const selected = selectedAddressId === candidate.id;
            const primary =
              searchType === "ROAD"
                ? candidate.roadAddress || candidate.jibunAddress
                : candidate.jibunAddress || candidate.roadAddress;
            const secondary =
              searchType === "ROAD" ? candidate.jibunAddress : candidate.roadAddress;
            return (
              <li key={candidate.id}>
                <button
                  type="button"
                  onClick={() => onSelect(candidate)}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors",
                    selected ? "bg-emerald-50 text-emerald-950" : "bg-white hover:bg-blue-50",
                  )}
                >
                  <span className="flex items-start gap-2.5">
                    <MapPin
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        selected ? "text-emerald-700" : "text-blue-700",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold leading-5 text-slate-900">
                        {primary}
                      </span>
                      {secondary && secondary !== primary && (
                        <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">
                          {secondary}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </>
    ) : (
      <div className="flex h-28 items-center justify-center px-4 text-center text-xs leading-5 text-slate-500">
        {hasQuery ? "검색결과가 없습니다." : "주소 또는 지번을 검색하면 후보가 표시됩니다."}
      </div>
    )}
  </div>
);

const SelectedParcelSummary = ({ parcel }: { parcel: FarmMapParcel | null }) => (
  <section
    className={cn(
      "rounded-xl border p-4",
      parcel
        ? "border-emerald-200 bg-emerald-50"
        : "border-dashed border-slate-300 bg-slate-50",
    )}
  >
    <div className="flex items-center gap-2">
      {parcel ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
      ) : (
        <MapPin className="h-4 w-4 text-slate-400" />
      )}
      <h3 className="text-xs font-bold text-slate-900">선택 필지</h3>
    </div>
    {parcel ? (
      <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
        <div>
          <dt className="font-semibold text-slate-500">분류</dt>
          <dd className="mt-0.5 text-slate-900">{parcel.cropLandType}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">면적</dt>
          <dd className="mt-0.5 text-slate-900">
            {parcel.areaSquareMeter > 0
              ? `${Math.round(parcel.areaSquareMeter).toLocaleString()}㎡`
              : "직접 입력"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="font-semibold text-slate-500">PNU</dt>
          <dd className="mt-0.5 break-all text-slate-900">{parcel.pnu ?? "확인 불가"}</dd>
        </div>
      </dl>
    ) : (
      <p className="mt-2 text-xs leading-5 text-slate-500">
        지도에서 초록색 경계를 클릭해 필지를 선택하세요.
      </p>
    )}
  </section>
);

const PanelField = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) => (
  <label className="block space-y-2">
    <span className="flex items-center justify-between gap-3 text-xs font-bold text-slate-900">
      {label}
      {hint && <span className="text-[10px] font-medium text-slate-400">{hint}</span>}
    </span>
    {children}
  </label>
);

const inputClassName =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10";
