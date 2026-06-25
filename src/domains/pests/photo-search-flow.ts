import type {
  NcpmsPhotoCandidate,
  NcpmsPhotoCandidatesOptions,
  NcpmsPhotoCrop,
  NcpmsPhotoCropsOptions,
  NcpmsPhotoSearchPage,
  NcpmsPhotoSection,
} from "../../integrations/ncpms/photo-search";
import type { Crop } from "../farms/types";
import { matchesCropName } from "../farms/crop-name";
import type { NcpmsGrowthStageCode } from "../farms/growth-stage";

export const WEED_CROP_SECTION_CODE = "6";

export const createPhotoCandidateSearchTarget = (
  section: Pick<NcpmsPhotoSection, "code" | "name"> | null,
  crop: Pick<NcpmsPhotoCrop, "code" | "name"> | null,
  growthStageCode?: NcpmsGrowthStageCode | null,
): Pick<NcpmsPhotoCandidatesOptions, "cropCode" | "cropSectionCode" | "categoryCode"> | null => {
  if (!section) return null;
  if (section.code === WEED_CROP_SECTION_CODE) return { cropSectionCode: WEED_CROP_SECTION_CODE };
  if (!crop) return null;
  return {
    cropCode: crop.code,
    ...(growthStageCode ? { categoryCode: growthStageCode } : {}),
  };
};

export const findNcpmsPhotoCropMatch = (
  crops: readonly NcpmsPhotoCrop[],
  farmCrop: Crop,
): NcpmsPhotoCrop | null => {
  return crops.find((crop) => matchesCropName(farmCrop, crop.name)) ?? null;
};

const normalizePhotoSearchText = (value: string) => value.trim().toLocaleLowerCase();

const findNcpmsPhotoCropExactSearchMatch = (
  crops: readonly NcpmsPhotoCrop[],
  searchText: string,
): NcpmsPhotoCrop | null => {
  const normalizedSearchText = normalizePhotoSearchText(searchText);
  if (!normalizedSearchText) return null;

  return (
    crops.find((crop) => normalizePhotoSearchText(crop.name) === normalizedSearchText) ?? null
  );
};

export const findNcpmsPhotoCropSearchMatch = (
  crops: readonly NcpmsPhotoCrop[],
  searchText: string,
): NcpmsPhotoCrop | null => {
  const normalizedSearchText = normalizePhotoSearchText(searchText);
  if (!normalizedSearchText) return null;

  return findNcpmsPhotoCropExactSearchMatch(crops, searchText) ?? (
    crops.find((crop) =>
      normalizePhotoSearchText(crop.name).includes(normalizedSearchText),
    ) ?? null
  );
};

export const resolvePhotoCandidatePestNameFilter = (
  searchText: string,
  crop: Pick<NcpmsPhotoCrop, "name"> | null,
) => {
  const trimmedSearchText = searchText.trim();
  if (!trimmedSearchText) return "";

  return crop && normalizePhotoSearchText(crop.name) === normalizePhotoSearchText(trimmedSearchText)
    ? ""
    : trimmedSearchText;
};

type PhotoCandidatePageLoader = (
  options: NcpmsPhotoCandidatesOptions,
) => Promise<NcpmsPhotoSearchPage<NcpmsPhotoCandidate>>;

export const loadPhotoCandidatesWithGrowthStageFallback = async (
  options: NcpmsPhotoCandidatesOptions,
  loadPage: PhotoCandidatePageLoader,
): Promise<{
  page: NcpmsPhotoSearchPage<NcpmsPhotoCandidate>;
  usedGrowthStageFallback: boolean;
}> => {
  const page = await loadPage(options);
  const isFirstPage = (options.startPoint ?? 1) === 1;
  const hasExplicitPestName = Boolean(options.pestName?.trim());
  const shouldRetryWithoutGrowthStage =
    Boolean(options.categoryCode) && isFirstPage && !hasExplicitPestName && page.items.length === 0;

  if (!shouldRetryWithoutGrowthStage) return { page, usedGrowthStageFallback: false };

  const { categoryCode: _categoryCode, ...fallbackOptions } = options;
  return {
    page: await loadPage(fallbackOptions),
    usedGrowthStageFallback: true,
  };
};

export interface NcpmsPhotoCropContext {
  section: NcpmsPhotoSection;
  crop: NcpmsPhotoCrop;
  page: NcpmsPhotoSearchPage<NcpmsPhotoCrop>;
}

type PhotoCropPageLoader = (
  options: NcpmsPhotoCropsOptions,
) => Promise<NcpmsPhotoSearchPage<NcpmsPhotoCrop>>;

const resolveSectionCrop = async (
  section: NcpmsPhotoSection,
  farmCrop: Crop,
  firstPage: NcpmsPhotoSearchPage<NcpmsPhotoCrop>,
  loadPage: PhotoCropPageLoader,
): Promise<NcpmsPhotoCropContext | null> => {
  let page = firstPage;
  let match = findNcpmsPhotoCropMatch(page.items, farmCrop);

  while (!match && page.items.length < page.totalCount && page.displayCount > 0) {
    const nextPage = await loadPage({
      cropSectionCode: section.code,
      startPoint: getNextPhotoStartPoint(page),
    });
    page = mergePhotoSearchPages(page, nextPage, (item) => item.code);
    match = findNcpmsPhotoCropMatch(page.items, farmCrop);
  }

  return match ? { section, crop: match, page } : null;
};

interface SectionCropSearchResolution {
  exact: NcpmsPhotoCropContext | null;
  partial: NcpmsPhotoCropContext | null;
}

const resolveSectionCropSearch = async (
  section: NcpmsPhotoSection,
  searchText: string,
  firstPage: NcpmsPhotoSearchPage<NcpmsPhotoCrop>,
  loadPage: PhotoCropPageLoader,
): Promise<SectionCropSearchResolution> => {
  let page = firstPage;
  let exactMatch = findNcpmsPhotoCropExactSearchMatch(page.items, searchText);
  let partialMatch = findNcpmsPhotoCropSearchMatch(page.items, searchText);

  while (!exactMatch && page.items.length < page.totalCount && page.displayCount > 0) {
    const nextPage = await loadPage({
      cropSectionCode: section.code,
      startPoint: getNextPhotoStartPoint(page),
    });
    page = mergePhotoSearchPages(page, nextPage, (item) => item.code);
    exactMatch = findNcpmsPhotoCropExactSearchMatch(page.items, searchText);
    partialMatch = partialMatch ?? findNcpmsPhotoCropSearchMatch(page.items, searchText);
  }

  return {
    exact: exactMatch ? { section, crop: exactMatch, page } : null,
    partial: partialMatch ? { section, crop: partialMatch, page } : null,
  };
};

export const resolveNcpmsPhotoCropContext = async (
  sections: readonly NcpmsPhotoSection[],
  farmCrop: Crop,
  loadPage: PhotoCropPageLoader,
): Promise<NcpmsPhotoCropContext | null> => {
  const searchableSections = sections.filter((section) => section.code !== WEED_CROP_SECTION_CODE);
  const firstPages = await Promise.all(
    searchableSections.map((section) => loadPage({ cropSectionCode: section.code })),
  );
  const contexts = await Promise.all(
    searchableSections.map((section, index) =>
      resolveSectionCrop(section, farmCrop, firstPages[index]!, loadPage),
    ),
  );
  return contexts.find((context) => context !== null) ?? null;
};

export const resolveNcpmsPhotoCropSearchContext = async (
  sections: readonly NcpmsPhotoSection[],
  searchText: string,
  loadPage: PhotoCropPageLoader,
): Promise<NcpmsPhotoCropContext | null> => {
  if (!normalizePhotoSearchText(searchText)) return null;

  let partialContext: NcpmsPhotoCropContext | null = null;

  for (const section of sections) {
    if (section.code === WEED_CROP_SECTION_CODE) continue;

    const firstPage = await loadPage({ cropSectionCode: section.code });
    const resolution = await resolveSectionCropSearch(section, searchText, firstPage, loadPage);
    if (resolution.exact) return resolution.exact;
    partialContext = partialContext ?? resolution.partial;
  }

  return partialContext;
};

export const mergePhotoSearchPages = <T>(
  current: NcpmsPhotoSearchPage<T>,
  next: NcpmsPhotoSearchPage<T>,
  getKey: (item: T) => string,
): NcpmsPhotoSearchPage<T> => {
  const seen = new Set<string>();
  const items = [...current.items, ...next.items].filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    items,
    startPoint: next.startPoint,
    displayCount: next.displayCount,
    totalCount: next.totalCount,
  };
};

export const hasMorePhotoItems = <T>(page: NcpmsPhotoSearchPage<T>) =>
  page.items.length < page.totalCount;

export const getNextPhotoStartPoint = <T>(page: NcpmsPhotoSearchPage<T>) =>
  page.startPoint + page.displayCount;
