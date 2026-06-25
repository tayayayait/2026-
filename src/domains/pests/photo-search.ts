import type { NcpmsPhotoCandidate } from "../../integrations/ncpms/photo-search";
import type { PestDetailPanel, PestDetailRequest, PestDetailServiceCode } from "./detail-selection";

const INSECT_SERVICE_CODES: PestDetailServiceCode[] = ["SVC07", "SVC08", "SVC15"];

const resolveInsectServiceCode = (
  code: NcpmsPhotoCandidate["detailServiceCode"],
): PestDetailServiceCode | null =>
  INSECT_SERVICE_CODES.includes(code as PestDetailServiceCode)
    ? (code as PestDetailServiceCode)
    : null;

export const resolveNcpmsPhotoDetailRequest = (
  candidate: NcpmsPhotoCandidate,
  crop: string,
): PestDetailRequest | null => {
  if (!candidate.detailSupported) return null;

  if (candidate.detailServiceCode === "SVC05") {
    return {
      id: candidate.id,
      name: candidate.name,
      crop,
      detailType: "DISEASE",
      detailServiceCode: "SVC05",
    };
  }

  const insectServiceCode = resolveInsectServiceCode(candidate.detailServiceCode);
  if (insectServiceCode) {
    return {
      id: candidate.id,
      name: candidate.name,
      crop,
      detailType: "INSECT",
      detailServiceCode: insectServiceCode,
    };
  }

  if (candidate.detailServiceCode === "SVC10") {
    return {
      id: candidate.id,
      name: candidate.name,
      crop,
      detailType: "WEED",
      detailServiceCode: "SVC10",
    };
  }

  return null;
};

export const enrichPhotoDetailPanel = (
  candidate: NcpmsPhotoCandidate,
  crop: string,
  detail: PestDetailPanel,
): PestDetailPanel => ({
  ...detail,
  title: !detail.title.trim() || detail.title === detail.id ? candidate.name : detail.title,
  crop: detail.crop.trim() || crop,
  imageUrl: detail.imageUrl || candidate.imageUrl,
});
