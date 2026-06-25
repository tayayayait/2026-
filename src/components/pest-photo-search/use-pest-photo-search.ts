import { useEffect, useRef, useState } from "react";
import {
  getNcpmsPhotoCandidateDetail,
  getNcpmsPhotoCrops,
  getNcpmsPhotoSections,
  searchNcpmsPhotoCandidates,
} from "@/lib/api/pest-photo.functions";
import type {
  NcpmsPhotoCandidate,
  NcpmsPhotoCrop,
  NcpmsPhotoSearchPage,
  NcpmsPhotoSection,
} from "@/integrations/ncpms/photo-search";
import type { PestDetailPanel } from "@/domains/pests/detail-selection";
import type { Crop, NcpmsGrowthStageCode } from "@/domains/farms/types";
import {
  createPhotoCandidateSearchTarget,
  getNextPhotoStartPoint,
  loadPhotoCandidatesWithGrowthStageFallback,
  mergePhotoSearchPages,
  resolvePhotoCandidatePestNameFilter,
  resolveNcpmsPhotoCropSearchContext,
  resolveNcpmsPhotoCropContext,
  WEED_CROP_SECTION_CODE,
} from "@/domains/pests/photo-search-flow";

const emptyPage = <T>(): NcpmsPhotoSearchPage<T> => ({
  items: [],
  startPoint: 1,
  displayCount: 0,
  totalCount: 0,
});

interface FarmPhotoSearchContext {
  crop: Crop;
  growthStageCode: NcpmsGrowthStageCode | null;
}

export const usePestPhotoSearch = (farmContext?: FarmPhotoSearchContext | null) => {
  const [sections, setSections] = useState<NcpmsPhotoSection[]>([]);
  const [crops, setCrops] = useState(emptyPage<NcpmsPhotoCrop>());
  const [candidates, setCandidates] = useState(emptyPage<NcpmsPhotoCandidate>());
  const [selectedSection, setSelectedSection] = useState<NcpmsPhotoSection | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<NcpmsPhotoCrop | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<NcpmsPhotoCandidate | null>(null);
  const [selectedGrowthStageCode, setSelectedGrowthStageCode] = useState<
    NcpmsGrowthStageCode | ""
  >(farmContext?.growthStageCode ?? "");
  const [detail, setDetail] = useState<PestDetailPanel | null>(null);
  const [query, setQuery] = useState("");
  const [loadingSections, setLoadingSections] = useState(true);
  const [loadingCrops, setLoadingCrops] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const appliedFarmContextKey = useRef("");

  const loadCandidates = async (
    section: NcpmsPhotoSection,
    crop: NcpmsPhotoCrop | null,
    startPoint = 1,
    append = false,
    pestName = query.trim(),
    growthStageCode: NcpmsGrowthStageCode | "" = selectedGrowthStageCode,
  ) => {
    const target = createPhotoCandidateSearchTarget(section, crop, growthStageCode || null);
    if (!target) return;

    setLoadingCandidates(true);
    setError(null);
    try {
      const result = await loadPhotoCandidatesWithGrowthStageFallback(
        {
          ...target,
          pestName: resolvePhotoCandidatePestNameFilter(pestName, crop) || undefined,
          startPoint,
        },
        async (options) => {
          const response = await searchNcpmsPhotoCandidates({ data: options });
          if (!response.ok) throw new Error(response.error);
          return response.data;
        },
      );
      if (result.usedGrowthStageFallback) setSelectedGrowthStageCode("");
      setCandidates((current) =>
        append
          ? mergePhotoSearchPages(current, result.page, (item) => `${item.id}-${item.category}`)
          : result.page,
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    }
    setLoadingCandidates(false);
  };

  useEffect(() => {
    let active = true;
    const loadSections = async () => {
      setLoadingSections(true);
      const result = await getNcpmsPhotoSections();
      if (!active) return;
      if (result.ok) setSections(result.data.items);
      else setError(result.error);
      setLoadingSections(false);
    };
    void loadSections();
    return () => {
      active = false;
    };
  }, []);

  const farmCrop = farmContext?.crop;
  const farmGrowthStageCode = farmContext?.growthStageCode ?? null;

  useEffect(() => {
    if (!farmCrop || sections.length === 0) return;
    const contextKey = `${farmCrop}:${farmGrowthStageCode ?? "missing"}`;
    if (appliedFarmContextKey.current === contextKey) return;
    appliedFarmContextKey.current = contextKey;

    let active = true;
    const applyFarmContext = async () => {
      setLoadingCrops(true);
      setSelectedGrowthStageCode(farmGrowthStageCode ?? "");
      const match = await resolveNcpmsPhotoCropContext(sections, farmCrop, async (options) => {
        const result = await getNcpmsPhotoCrops({ data: options });
        return result.ok ? result.data : emptyPage();
      });
      if (!active) return;
      setLoadingCrops(false);
      if (!match) {
        setError(`NCPMS 작물 목록에서 ${farmCrop}을(를) 찾지 못했습니다.`);
        return;
      }
      setSelectedSection(match.section);
      setCrops(match.page);
      setSelectedCrop(match.crop);
      await loadCandidates(
        match.section,
        match.crop,
        1,
        false,
        "",
        farmGrowthStageCode ?? "",
      );
    };
    void applyFarmContext();
    return () => {
      active = false;
    };
  }, [farmCrop, farmGrowthStageCode, sections]);

  const selectSection = async (section: NcpmsPhotoSection) => {
    setSelectedSection(section);
    setSelectedCrop(null);
    setSelectedCandidate(null);
    setCrops(emptyPage());
    setCandidates(emptyPage());
    setDetail(null);
    setDetailError(null);

    if (section.code === WEED_CROP_SECTION_CODE) {
      await loadCandidates(section, null);
      return;
    }

    setLoadingCrops(true);
    setError(null);
    const result = await getNcpmsPhotoCrops({ data: { cropSectionCode: section.code } });
    if (result.ok) setCrops(result.data);
    else setError(result.error);
    setLoadingCrops(false);
  };

  const selectCrop = async (crop: NcpmsPhotoCrop) => {
    if (!selectedSection) return;
    setSelectedCrop(crop);
    setSelectedCandidate(null);
    setCandidates(emptyPage());
    setDetail(null);
    setDetailError(null);
    await loadCandidates(selectedSection, crop);
  };

  const selectGrowthStage = async (growthStageCode: NcpmsGrowthStageCode | "") => {
    setSelectedGrowthStageCode(growthStageCode);
    setSelectedCandidate(null);
    setDetail(null);
    if (!selectedSection) return;
    await loadCandidates(selectedSection, selectedCrop, 1, false, query.trim(), growthStageCode);
  };

  const selectCandidate = async (candidate: NcpmsPhotoCandidate) => {
    setSelectedCandidate(candidate);
    setDetail(null);
    setDetailError(null);
    setLoadingDetail(true);
    const cropName = selectedCrop?.name ?? selectedSection?.name ?? "";
    const result = await getNcpmsPhotoCandidateDetail({ data: { candidate, crop: cropName } });
    if (result.ok) setDetail(result.data);
    else setDetailError(result.error);
    setLoadingDetail(false);
  };

  const searchCropByName = async (searchText: string) => {
    if (!searchText) return false;

    const orderedSections = selectedSection
      ? [selectedSection, ...sections.filter((section) => section.code !== selectedSection.code)]
      : sections;

    setLoadingCrops(true);
    setError(null);
    const match = await resolveNcpmsPhotoCropSearchContext(
      orderedSections,
      searchText,
      async (options) => {
        const result = await getNcpmsPhotoCrops({ data: options });
        return result.ok ? result.data : emptyPage();
      },
    );
    setLoadingCrops(false);

    if (!match) return false;

    setSelectedSection(match.section);
    setCrops(match.page);
    setSelectedCrop(match.crop);
    setSelectedCandidate(null);
    setCandidates(emptyPage());
    setDetail(null);
    setDetailError(null);
    await loadCandidates(match.section, match.crop, 1, false, "", selectedGrowthStageCode);
    return true;
  };

  const search = async (pestName = query.trim()) => {
    const normalizedSearchText = pestName.trim();

    if (
      selectedSection &&
      (selectedSection.code === WEED_CROP_SECTION_CODE || selectedCrop)
    ) {
      setSelectedCandidate(null);
      setDetail(null);
      setDetailError(null);
      await loadCandidates(selectedSection, selectedCrop, 1, false, normalizedSearchText);
      return;
    }

    const cropMatched = await searchCropByName(normalizedSearchText);
    if (!cropMatched && normalizedSearchText) {
      setError("검색어와 일치하는 작물을 찾지 못했습니다. 작물 또는 잡초 분류를 먼저 선택하세요.");
    }
  };

  const loadMoreCrops = async () => {
    if (!selectedSection) return;
    setLoadingCrops(true);
    const result = await getNcpmsPhotoCrops({
      data: {
        cropSectionCode: selectedSection.code,
        startPoint: getNextPhotoStartPoint(crops),
      },
    });
    if (result.ok) {
      setCrops((current) => mergePhotoSearchPages(current, result.data, (item) => item.code));
    } else {
      setError(result.error);
    }
    setLoadingCrops(false);
  };

  const loadMoreCandidates = () => {
    if (!selectedSection) return Promise.resolve();
    return loadCandidates(selectedSection, selectedCrop, getNextPhotoStartPoint(candidates), true);
  };

  return {
    sections,
    crops,
    candidates,
    selectedSection,
    selectedCrop,
    selectedCandidate,
    selectedGrowthStageCode,
    detail,
    query,
    setQuery,
    loadingSections,
    loadingCrops,
    loadingCandidates,
    loadingDetail,
    error,
    detailError,
    selectSection,
    selectCrop,
    selectGrowthStage,
    selectCandidate,
    search,
    loadMoreCrops,
    loadMoreCandidates,
  };
};
