import type { FarmParcelRaw } from "./types";

export type StandardRegionLevel = "SIDO" | "SIGUNGU" | "EUP_MYEON_DONG" | "RI" | "UNKNOWN";

export interface StandardRegionCode {
  regionCode: string;
  sidoCode: string;
  sigunguCode: string;
  eupMyeonDongCode: string;
  riCode: string;
  addressName: string;
  parentRegionCode: string;
  localName: string | null;
  order: string | null;
  raw: FarmParcelRaw;
}

export interface StandardRegionPage {
  totalCount: number | null;
  pageNo: number | null;
  numOfRows: number | null;
  rows: StandardRegionCode[];
}

export const getStandardRegionLevel = (
  region: Pick<StandardRegionCode, "sigunguCode" | "eupMyeonDongCode" | "riCode">,
): StandardRegionLevel => {
  if (region.sigunguCode === "000" && region.eupMyeonDongCode === "000" && region.riCode === "00") {
    return "SIDO";
  }
  if (region.sigunguCode !== "000" && region.eupMyeonDongCode === "000" && region.riCode === "00") {
    return "SIGUNGU";
  }
  if (region.sigunguCode !== "000" && region.eupMyeonDongCode !== "000" && region.riCode === "00") {
    return "EUP_MYEON_DONG";
  }
  if (region.sigunguCode !== "000" && region.eupMyeonDongCode !== "000" && region.riCode !== "00") {
    return "RI";
  }
  return "UNKNOWN";
};

export const isParcelSearchableStandardRegion = (region: StandardRegionCode) => {
  const level = getStandardRegionLevel(region);
  return level === "EUP_MYEON_DONG" || level === "RI";
};

export const selectStandardRegionChildren = (
  regions: StandardRegionCode[],
  parentRegionCode: string,
) =>
  regions
    .filter((region) => region.parentRegionCode === parentRegionCode)
    .sort((left, right) =>
      `${left.order ?? left.regionCode}-${left.regionCode}`.localeCompare(
        `${right.order ?? right.regionCode}-${right.regionCode}`,
      ),
    );
