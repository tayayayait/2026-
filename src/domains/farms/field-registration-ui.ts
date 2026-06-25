import type { StandardRegionCode, StandardRegionLevel } from "./standard-region";
import { getStandardRegionLevel } from "./standard-region";
import type { CropLandType, FarmMapParcel, FarmParcelCandidate } from "./types";

export const PNU_LENGTH = 19;
export const REGION_SEARCH_MIN_LENGTH = 2;
export const ADDRESS_FARMMAP_REGION_LIMIT = 3;

export const FARMMAP_LAND_CLASSIFICATION_CODES = {
  ricePaddy: "01",
  field: "02",
  orchard: "03",
  facility: "04",
} as const;

export type FarmMapLandClassificationCode =
  (typeof FARMMAP_LAND_CLASSIFICATION_CODES)[keyof typeof FARMMAP_LAND_CLASSIFICATION_CODES];

export const FARM_PARCEL_CLASSIFICATION_OPTIONS = [
  { value: "all", label: "전체(논, 밭, 과수, 시설)" },
  { value: "논", label: "논" },
  { value: "밭", label: "밭" },
  { value: "과수", label: "과수" },
  { value: "시설", label: "시설" },
] as const;

export type FarmParcelClassificationFilter =
  (typeof FARM_PARCEL_CLASSIFICATION_OPTIONS)[number]["value"];

export type FarmRegistrationSource =
  | "farmmap_pnu"
  | "farmmap_map_click"
  | "farmmap_region_lookup"
  | "manual_address"
  | "manual_coordinate";

export const normalizeSearchText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, "").toLowerCase();

export const normalizeLotInput = (value: string) => value.replace(/\D/g, "").slice(0, 4);

export const parseCoordinate = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parsePositiveNumber = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN;
};

export const isValidFarmCoordinate = (lat: number | null, lng: number | null) =>
  lat !== null && lng !== null && lat >= 33 && lat <= 39.5 && lng >= 124 && lng <= 132;

export const selectedClassification = (
  filter: FarmParcelClassificationFilter,
): CropLandType | null => (filter === "all" ? null : filter);

export const landCodesForClassification = (
  filter: FarmParcelClassificationFilter | string,
): FarmMapLandClassificationCode[] => {
  switch (filter) {
    case "논":
      return [FARMMAP_LAND_CLASSIFICATION_CODES.ricePaddy];
    case "밭":
      return [FARMMAP_LAND_CLASSIFICATION_CODES.field];
    case "과수":
      return [FARMMAP_LAND_CLASSIFICATION_CODES.orchard];
    case "시설":
      return [FARMMAP_LAND_CLASSIFICATION_CODES.facility];
    case "all":
    default:
      return [
        FARMMAP_LAND_CLASSIFICATION_CODES.ricePaddy,
        FARMMAP_LAND_CLASSIFICATION_CODES.field,
        FARMMAP_LAND_CLASSIFICATION_CODES.orchard,
        FARMMAP_LAND_CLASSIFICATION_CODES.facility,
      ];
  }
};

export const matchesClassification = (
  candidate: FarmParcelCandidate,
  filter: FarmParcelClassificationFilter,
) =>
  filter === "all" ||
  normalizeSearchText(candidate.cropLandType).includes(normalizeSearchText(filter));

export const filterParcelCandidates = (
  candidates: FarmParcelCandidate[],
  filter: FarmParcelClassificationFilter,
) => candidates.filter((candidate) => matchesClassification(candidate, filter));

export const dedupeParcelCandidates = (candidates: FarmParcelCandidate[]) => {
  const deduped = new Map<string, FarmParcelCandidate>();
  for (const candidate of candidates) {
    const key = [
      candidate.pnu ?? "",
      candidate.legalDongAddress ?? candidate.representativeAddress,
      candidate.centroid?.lat ?? "",
      candidate.centroid?.lng ?? "",
      candidate.cropLandType,
    ].join("|");
    if (!deduped.has(key)) deduped.set(key, candidate);
  }
  return Array.from(deduped.values());
};

export const lotTextFromPnu = (pnu: string | null | undefined) => {
  const digits = pnu?.replace(/\D/g, "") ?? "";
  if (!/^\d{19}$/.test(digits)) return null;

  const mainLot = Number(digits.slice(11, 15));
  if (!Number.isInteger(mainLot) || mainLot <= 0) return null;

  const subLot = Number(digits.slice(15, 19));
  const prefix = digits[10] === "2" ? "산 " : "";
  return `${prefix}${mainLot}${subLot > 0 ? `-${subLot}` : ""}`;
};

export const formatParcelCandidateAddress = (candidate: FarmParcelCandidate) => {
  const baseAddress = candidate.legalDongAddress ?? candidate.representativeAddress ?? "팜맵 필지";
  const lotText = lotTextFromPnu(candidate.pnu);
  if (!lotText) return baseAddress;

  const compactBase = baseAddress.replace(/\s+/g, "");
  const compactLot = lotText.replace(/\s+/g, "");
  return compactBase.endsWith(compactLot) ? baseAddress : `${baseAddress} ${lotText}`;
};

export const sortParcelCandidatesByPnu = (candidates: FarmParcelCandidate[]) =>
  [...candidates].sort((left, right) =>
    (left.pnu ?? formatParcelCandidateAddress(left)).localeCompare(
      right.pnu ?? formatParcelCandidateAddress(right),
    ),
  );

export const candidateToMapParcel = (candidate: FarmParcelCandidate): FarmMapParcel | null => {
  if (!candidate.centroid) return null;
  return { ...candidate, centroid: candidate.centroid };
};

export const sourceLabel = (source: FarmRegistrationSource) => {
  switch (source) {
    case "farmmap_pnu":
      return "PNU 조회";
    case "farmmap_map_click":
      return "지도 클릭";
    case "farmmap_region_lookup":
      return "지역 조건 조회";
    case "manual_coordinate":
      return "좌표 입력";
    case "manual_address":
    default:
      return "지번 조회";
  }
};

export const standardRegionSortKey = (region: StandardRegionCode) =>
  `${region.order ?? region.regionCode}-${region.addressName}-${region.regionCode}`;

export const sortStandardRegions = (regions: StandardRegionCode[]) =>
  [...regions].sort((left, right) =>
    standardRegionSortKey(left).localeCompare(standardRegionSortKey(right)),
  );

export const standardRegionOptionsByParent = (
  regions: StandardRegionCode[],
  parentRegionCode: string,
  level: StandardRegionLevel,
) =>
  sortStandardRegions(
    regions.filter(
      (region) =>
        region.parentRegionCode === parentRegionCode && getStandardRegionLevel(region) === level,
    ),
  );

export const regionSearchTargets = (input: {
  selectedRegion: StandardRegionCode | null;
  selectedRiCode: string;
  selectedEupCode: string;
  riOptions: StandardRegionCode[];
}) => {
  if (!input.selectedRiCode && input.selectedEupCode && input.riOptions.length > 0) {
    return input.riOptions;
  }
  return input.selectedRegion ? [input.selectedRegion] : [];
};

export const requiresRiForLotSearch = (input: {
  mainLot: string;
  selectedRiCode: string;
  selectedEupCode: string;
  riOptions: StandardRegionCode[];
}) =>
  Boolean(
    input.mainLot.trim() &&
    !input.selectedRiCode &&
    input.selectedEupCode &&
    input.riOptions.length > 0,
  );
