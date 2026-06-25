import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { FarmMapLookupPanel, type FarmMapLookupStatus } from "@/components/farm-map-lookup-panel";
import {
  FarmRegistrationSearchPanel,
  type FarmRegistrationAddressMode,
  type FarmRegistrationSearchTab,
} from "@/components/farm-registration-search-panel";
import { FarmRegistrationSelectionPanel } from "@/components/farm-registration-selection-panel";
import {
  candidateToMapParcel,
  dedupeParcelCandidates,
  formatParcelCandidateAddress,
  landCodesForClassification,
  normalizeLotInput,
  parsePositiveNumber,
  regionSearchTargets,
  requiresRiForLotSearch,
  sortParcelCandidatesByPnu,
  sortStandardRegions,
  sourceLabel,
  standardRegionOptionsByParent,
  type FarmParcelClassificationFilter,
  type FarmRegistrationSource,
} from "@/domains/farms/field-registration-ui";
import { createFarmId } from "@/domains/farms/farm-id";
import { buildParcelPnu } from "@/domains/farms/pnu";
import { extractFarmRegion, toFarmParcelSelection } from "@/domains/farms/registration";
import { searchFirstRegionWithCandidates } from "@/domains/farms/region-candidate-search";
import {
  getStandardRegionLevel,
  isParcelSearchableStandardRegion,
  type StandardRegionCode,
} from "@/domains/farms/standard-region";
import { useFarmsStore } from "@/domains/farms/store";
import type {
  Crop,
  FarmMapCoordinate,
  FarmParcelCandidate,
  FarmParcelCandidateSearchResult,
  NcpmsGrowthStageCode,
} from "@/domains/farms/types";
import { searchFarmParcelCandidates } from "@/lib/api/farm-map.functions";
import {
  getStandardRegionTree,
  searchStandardRegionCodes,
} from "@/lib/api/standard-region.functions";

export const Route = createFileRoute("/farms/new")({ component: NewFarmPage });

const initialFarmMapStatus: FarmMapLookupStatus = "WAITING_ADDRESS";

function NewFarmPage() {
  const navigate = useNavigate();
  const addFarm = useFarmsStore((state) => state.addFarm);

  const [searchTab, setSearchTab] = useState<FarmRegistrationSearchTab>("ADDRESS");
  const [addressMode, setAddressMode] = useState<FarmRegistrationAddressMode>("PARCEL");
  const [regionQuery, setRegionQuery] = useState("");
  const [directPnu, setDirectPnu] = useState("");
  const [addressRegionCandidates, setAddressRegionCandidates] = useState<StandardRegionCode[]>([]);
  const [selectedAddressRegion, setSelectedAddressRegion] = useState<StandardRegionCode | null>(
    null,
  );
  const [regions, setRegions] = useState<StandardRegionCode[]>([]);
  const [selectedSidoCode, setSelectedSidoCode] = useState("");
  const [selectedSigunguCode, setSelectedSigunguCode] = useState("");
  const [selectedEupCode, setSelectedEupCode] = useState("");
  const [selectedRiCode, setSelectedRiCode] = useState("");
  const [mainLot, setMainLot] = useState("");
  const [subLot, setSubLot] = useState("");
  const [isMountain, setIsMountain] = useState(false);
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [classification, setClassification] = useState<FarmParcelClassificationFilter>("all");

  const [candidates, setCandidates] = useState<FarmParcelCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [registrationSource, setRegistrationSource] =
    useState<FarmRegistrationSource>("manual_address");
  const [farmMapStatus, setFarmMapStatus] = useState<FarmMapLookupStatus>(initialFarmMapStatus);
  const [warning, setWarning] = useState<string | null>(null);
  const [parcelFocusRequest, setParcelFocusRequest] = useState(0);
  const [regionLoading, setRegionLoading] = useState(false);
  const [parcelLoading, setParcelLoading] = useState(false);

  const [name, setName] = useState("");
  const [crop, setCrop] = useState<Crop>("벼");
  const [growthStageCode, setGrowthStageCode] = useState<NcpmsGrowthStageCode | "">("");
  const [area, setArea] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadRegionTree = async () => {
      setRegionLoading(true);
      const result = await getStandardRegionTree({ data: {} });
      if (!active) return;
      if (result.ok) setRegions(result.data);
      else setError(result.error);
      setRegionLoading(false);
    };
    void loadRegionTree();
    return () => {
      active = false;
    };
  }, []);

  const sidoOptions = useMemo(
    () =>
      sortStandardRegions(regions.filter((region) => getStandardRegionLevel(region) === "SIDO")),
    [regions],
  );
  const sigunguOptions = useMemo(
    () =>
      selectedSidoCode ? standardRegionOptionsByParent(regions, selectedSidoCode, "SIGUNGU") : [],
    [regions, selectedSidoCode],
  );
  const eupOptions = useMemo(
    () =>
      selectedSigunguCode
        ? standardRegionOptionsByParent(regions, selectedSigunguCode, "EUP_MYEON_DONG")
        : [],
    [regions, selectedSigunguCode],
  );
  const riOptions = useMemo(
    () => (selectedEupCode ? standardRegionOptionsByParent(regions, selectedEupCode, "RI") : []),
    [regions, selectedEupCode],
  );

  const selectedTreeRegion =
    regions.find((region) => region.regionCode === (selectedRiCode || selectedEupCode)) ?? null;
  const builtPnu = selectedAddressRegion
    ? buildParcelPnu({ bjdCode: selectedAddressRegion.regionCode, mainLot, subLot, isMountain })
    : null;
  const selectedCandidate =
    candidates.find((candidate) => candidate.farmMapId === selectedCandidateId) ?? null;
  const selectedMapParcel = selectedCandidate ? candidateToMapParcel(selectedCandidate) : null;
  const mapParcels = useMemo(
    () => candidates.map(candidateToMapParcel).filter((parcel) => parcel !== null),
    [candidates],
  );
  const addressLocation: FarmMapCoordinate | null =
    selectedMapParcel?.centroid ?? mapParcels[0]?.centroid ?? null;
  const canSubmit = Boolean(selectedMapParcel && name.trim() && area > 0 && growthStageCode);

  const selectCandidate = (candidate: FarmParcelCandidate) => {
    setSelectedCandidateId(candidate.farmMapId);
    if (candidate.areaSquareMeter > 0) setArea(Math.round(candidate.areaSquareMeter));
    if (candidate.centroid) setParcelFocusRequest((current) => current + 1);
  };

  const applySearchResult = (
    result: FarmParcelCandidateSearchResult,
    source: FarmRegistrationSource,
  ) => {
    const nextCandidates = sortParcelCandidatesByPnu(dedupeParcelCandidates(result.candidates));
    setCandidates(nextCandidates);
    setFarmMapStatus(result.status);
    setWarning(result.warning);
    setRegistrationSource(source);
    const first =
      nextCandidates.find((candidate) => candidate.centroid) ?? nextCandidates[0] ?? null;
    setSelectedCandidateId(first?.farmMapId ?? null);
    if (first?.areaSquareMeter) setArea(Math.round(first.areaSquareMeter));
    if (!first) setError(result.warning ?? "조건에 맞는 팜맵 필지를 찾지 못했습니다.");
  };

  const clearParcelSearchResults = (message: string | null = null) => {
    setCandidates([]);
    setSelectedCandidateId(null);
    setFarmMapStatus(message ? "NOT_FOUND" : "LOADING");
    setWarning(null);
    setError(message);
  };

  const resetParcelSearchResults = () => {
    setCandidates([]);
    setSelectedCandidateId(null);
    setFarmMapStatus(initialFarmMapStatus);
    setWarning(null);
  };

  const handleClassificationChange = (value: FarmParcelClassificationFilter) => {
    setClassification(value);
    resetParcelSearchResults();
    setError(null);
  };

  const handleSearchRegionCode = async () => {
    setError(null);
    if (regionQuery.trim().length < 2) {
      setError("법정동 검색어를 2자 이상 입력하세요.");
      return;
    }
    setRegionLoading(true);
    const result = await searchStandardRegionCodes({ data: { query: regionQuery } });
    if (result.ok) {
      const next = sortStandardRegions(result.data.rows.filter(isParcelSearchableStandardRegion));
      setAddressRegionCandidates(next);
      setSelectedAddressRegion(next.length === 1 ? next[0] : null);
      if (next.length === 0) setError("검색 가능한 읍면동 또는 리 법정동코드가 없습니다.");
    } else {
      setAddressRegionCandidates([]);
      setError(result.error);
    }
    setRegionLoading(false);
  };

  const handleSearchPnu = async () => {
    const pnu = addressMode === "PNU" ? directPnu : builtPnu;
    if (!pnu || !/^\d{19}$/.test(pnu)) {
      clearParcelSearchResults("유효한 PNU 숫자 19자리를 입력하거나 생성하세요.");
      return;
    }
    clearParcelSearchResults();
    setParcelLoading(true);
    const result = await searchFarmParcelCandidates({ data: { mode: "PNU", pnu } });
    if (result.ok) applySearchResult(result.data, "farmmap_pnu");
    else clearParcelSearchResults(result.error);
    setParcelLoading(false);
  };

  const handleSearchRegionParcels = async () => {
    setError(null);
    if (!selectedTreeRegion) {
      clearParcelSearchResults("읍면동 또는 리를 선택하세요.");
      return;
    }
    if (mainLot) {
      if (
        requiresRiForLotSearch({
          mainLot,
          selectedRiCode,
          selectedEupCode,
          riOptions,
        })
      ) {
        clearParcelSearchResults("지번으로 조회하려면 리까지 선택하세요.");
        return;
      }
      const pnu = buildParcelPnu({
        bjdCode: selectedTreeRegion.regionCode,
        mainLot,
        subLot,
        isMountain,
      });
      if (!pnu) {
        clearParcelSearchResults("본번과 부번을 확인하세요.");
        return;
      }
      clearParcelSearchResults();
      setParcelLoading(true);
      const result = await searchFarmParcelCandidates({ data: { mode: "PNU", pnu } });
      if (result.ok) applySearchResult(result.data, "farmmap_pnu");
      else clearParcelSearchResults(result.error);
      setParcelLoading(false);
      return;
    }

    const minimum = parsePositiveNumber(minArea);
    const maximum = parsePositiveNumber(maxArea);
    if (
      Number.isNaN(minimum) ||
      Number.isNaN(maximum) ||
      (minimum !== null && maximum !== null && minimum > maximum)
    ) {
      clearParcelSearchResults("면적 조건은 0 이상의 숫자이며 최대값이 최소값보다 커야 합니다.");
      return;
    }
    const targetRegions = regionSearchTargets({
      selectedRegion: selectedTreeRegion,
      selectedRiCode,
      selectedEupCode,
      riOptions,
    });
    clearParcelSearchResults();
    setParcelLoading(true);
    const result = await searchFirstRegionWithCandidates({
      targetRegionCodes: targetRegions.map((region) => region.regionCode),
      landCodes: landCodesForClassification(classification),
      ...(minimum === null ? {} : { minAreaSquareMeter: minimum }),
      ...(maximum === null ? {} : { maxAreaSquareMeter: maximum }),
      search: (request) => searchFarmParcelCandidates({ data: request }),
    });
    if (result.ok) applySearchResult(result.data, "farmmap_region_lookup");
    else clearParcelSearchResults(result.error);
    setParcelLoading(false);
  };

  const handleMapClick = async (location: FarmMapCoordinate) => {
    clearParcelSearchResults();
    setParcelLoading(true);
    const result = await searchFarmParcelCandidates({
      data: {
        mode: "POINT",
        lat: location.lat,
        lng: location.lng,
        representativeAddress: "지도에서 선택한 농경지",
      },
    });
    if (result.ok) applySearchResult(result.data, "farmmap_map_click");
    else clearParcelSearchResults(result.error);
    setParcelLoading(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!selectedCandidate || !selectedMapParcel) {
      setError("좌표가 포함된 팜맵 필지를 선택하세요.");
      return;
    }
    if (!name.trim() || area < 1 || !growthStageCode) {
      setError("농장명, 생육 단계와 1㎡ 이상의 재배면적을 입력하세요.");
      return;
    }
    const address = formatParcelCandidateAddress(selectedCandidate);
    const region = extractFarmRegion(address);
    setSubmitting(true);
    try {
      await addFarm({
        id: createFarmId(),
        name: name.trim(),
        address,
        region,
        lat: selectedMapParcel.centroid.lat,
        lng: selectedMapParcel.centroid.lng,
        crop,
        area,
        growthStageCode,
        interestedWork: [],
        parcel: toFarmParcelSelection(selectedMapParcel),
        createdAt: new Date().toISOString(),
      });
      await navigate({ to: "/" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "농장 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <form
        onSubmit={handleSubmit}
        className="relative bg-[#07140f] lg:h-[calc(100svh-2rem)] lg:min-h-[720px] lg:overflow-hidden"
      >
        <div className="relative h-[48svh] min-h-[390px] lg:absolute lg:inset-0 lg:h-full">
          <FarmMapLookupPanel
            status={farmMapStatus}
            radiusMeters={50}
            canLookup={false}
            canSelectLocation={!parcelLoading}
            loading={parcelLoading}
            warning={warning}
            parcels={mapParcels}
            selectedParcelId={selectedCandidateId}
            parcelFocusRequest={parcelFocusRequest}
            addressLocation={addressLocation}
            onRadiusChange={() => undefined}
            onRetry={() => undefined}
            onSelectLocation={(location) => void handleMapClick(location)}
            onSelectParcel={selectCandidate}
            showRadiusControls={false}
            showParcelList={false}
            heightClassName="h-full min-h-[390px]"
          />
          <header className="pointer-events-none absolute inset-x-0 top-0 z-[650] flex items-center justify-between bg-gradient-to-b from-[#07140f]/90 to-transparent px-4 py-4 lg:pl-[424px] lg:pr-6 xl:pl-[440px]">
            <div>
              <p className="text-[10px] font-black tracking-[0.22em] text-lime-300">
                FIELD REGISTRATION
              </p>
              <h1 className="text-lg font-black tracking-[-0.04em] text-white">
                팜맵 기반 필지 등록
              </h1>
            </div>

          </header>
        </div>

        <div className="relative z-[700] -mt-10 px-3 pb-3 lg:absolute lg:bottom-6 lg:left-6 lg:top-24 lg:mt-0 lg:w-[376px] lg:p-0 xl:w-[392px]">
          <FarmRegistrationSearchPanel
            searchTab={searchTab}
            addressMode={addressMode}
            regionQuery={regionQuery}
            directPnu={directPnu}
            selectedAddressRegion={selectedAddressRegion}
            addressRegionCandidates={addressRegionCandidates}
            sidoOptions={sidoOptions}
            sigunguOptions={sigunguOptions}
            eupOptions={eupOptions}
            riOptions={riOptions}
            selectedSidoCode={selectedSidoCode}
            selectedSigunguCode={selectedSigunguCode}
            selectedEupCode={selectedEupCode}
            selectedRiCode={selectedRiCode}
            mainLot={mainLot}
            subLot={subLot}
            isMountain={isMountain}
            minArea={minArea}
            maxArea={maxArea}
            classification={classification}
            builtPnu={builtPnu}
            candidates={candidates}
            selectedCandidateId={selectedCandidateId}
            regionLoading={regionLoading}
            parcelLoading={parcelLoading}
            onSearchTabChange={setSearchTab}
            onAddressModeChange={setAddressMode}
            onRegionQueryChange={setRegionQuery}
            onDirectPnuChange={(value) => setDirectPnu(value.replace(/\D/g, "").slice(0, 19))}
            onSearchRegion={() => void handleSearchRegionCode()}
            onSelectAddressRegion={setSelectedAddressRegion}
            onSearchPnu={() => void handleSearchPnu()}
            onSidoChange={(value) => {
              setSelectedSidoCode(value);
              setSelectedSigunguCode("");
              setSelectedEupCode("");
              setSelectedRiCode("");
            }}
            onSigunguChange={(value) => {
              setSelectedSigunguCode(value);
              setSelectedEupCode("");
              setSelectedRiCode("");
            }}
            onEupChange={(value) => {
              setSelectedEupCode(value);
              setSelectedRiCode("");
            }}
            onRiChange={setSelectedRiCode}
            onMainLotChange={(value) => setMainLot(normalizeLotInput(value))}
            onSubLotChange={(value) => setSubLot(normalizeLotInput(value))}
            onMountainChange={setIsMountain}
            onMinAreaChange={setMinArea}
            onMaxAreaChange={setMaxArea}
            onClassificationChange={handleClassificationChange}
            onSearchRegionParcels={() => void handleSearchRegionParcels()}
            onSelectCandidate={selectCandidate}
          />
        </div>

        <div className="relative z-[690] px-3 pb-6 lg:absolute lg:bottom-6 lg:left-[424px] lg:right-6 lg:p-0 xl:left-[440px]">
          <FarmRegistrationSelectionPanel
            selectedCandidate={selectedCandidate}
            sourceLabel={sourceLabel(registrationSource)}
            name={name}
            crop={crop}
            growthStageCode={growthStageCode}
            area={area}
            submitting={submitting}
            canSubmit={canSubmit}
            error={error}
            onNameChange={setName}
            onCropChange={setCrop}
            onGrowthStageChange={setGrowthStageCode}
            onAreaChange={setArea}
            onCancel={() => void navigate({ to: "/" })}
          />
        </div>
      </form>
    </AppShell>
  );
}
