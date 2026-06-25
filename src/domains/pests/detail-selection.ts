import type {
  NcpmsDiseaseDetail,
  NcpmsInsectDetail,
  NcpmsPest,
  NcpmsWeedDetail,
} from "../../integrations/ncpms/disease";

export type PestDetailType = NcpmsPest["type"];

export type PestDetailServiceCode = "SVC05" | "SVC07" | "SVC08" | "SVC10" | "SVC15";

export type PestDetailRequest = {
  id: string;
  name: string;
  crop: string;
  detailType: PestDetailType;
  detailServiceCode: PestDetailServiceCode;
};

export type NcpmsPestDetailResult =
  | { detailType: "DISEASE"; detail: NcpmsDiseaseDetail }
  | { detailType: "INSECT"; detail: NcpmsInsectDetail }
  | { detailType: "WEED"; detail: NcpmsWeedDetail };

export interface PestDetailField {
  label: string;
  text: string;
}

export interface PestDetailPanel {
  id: string;
  type: PestDetailType;
  title: string;
  crop: string;
  primaryLabel: string;
  primaryText: string;
  secondaryLabel: string;
  secondaryText: string;
  preventionText?: string;
  imageUrl?: string;
  additionalDetails: PestDetailField[];
}

export const getPestTypeLabel = (type: PestDetailType) => {
  if (type === "DISEASE") return "병";
  if (type === "INSECT") return "해충";
  return "잡초";
};

export const defaultDetailServiceCode = (type: PestDetailType): PestDetailServiceCode => {
  if (type === "DISEASE") return "SVC05";
  if (type === "WEED") return "SVC10";
  return "SVC07";
};

export const selectPestDetailRequests = (
  pests: Pick<NcpmsPest, "id" | "name" | "crop" | "type">[],
  limit = 3,
): PestDetailRequest[] =>
  pests.slice(0, Math.max(0, limit)).map((pest) => ({
    id: pest.id,
    name: pest.name,
    crop: pest.crop,
    detailType: pest.type,
    detailServiceCode: defaultDetailServiceCode(pest.type),
  }));

export const normalizeNcpmsPestDetail = (result: NcpmsPestDetailResult): PestDetailPanel => {
  if (result.detailType === "DISEASE") {
    return {
      id: result.detail.id,
      type: "DISEASE",
      title: result.detail.name,
      crop: result.detail.crop,
      primaryLabel: "증상",
      primaryText: result.detail.symptoms || "증상 정보 없음",
      secondaryLabel: "발생환경",
      secondaryText: result.detail.developmentCondition || "발생환경 정보 없음",
      preventionText: result.detail.preventionMethod,
      imageUrl: result.detail.imageUrls[0],
      additionalDetails: [],
    };
  }

  if (result.detailType === "INSECT") {
    return {
      id: result.detail.id,
      type: "INSECT",
      title: result.detail.name,
      crop: result.detail.crop,
      primaryLabel: "피해정보",
      primaryText: result.detail.damageInfo || "피해정보 없음",
      secondaryLabel: "생태정보",
      secondaryText: result.detail.ecologyInfo || "생태정보 없음",
      preventionText: result.detail.preventMethod,
      imageUrl: result.detail.imageUrls[0],
      additionalDetails: [],
    };
  }

  const additionalDetails = [
    { label: "서식지", text: result.detail.habitat },
    { label: "학명", text: result.detail.scientificName },
    { label: "과명", text: result.detail.family },
    { label: "참고문헌", text: result.detail.literature },
    { label: "영문명", text: result.detail.englishName },
    { label: "일문명", text: result.detail.japaneseName },
  ].filter((field): field is PestDetailField => Boolean(field.text));

  return {
    id: result.detail.id,
    type: "WEED",
    title: result.detail.name,
    crop: result.detail.crop,
    primaryLabel: "형태",
    primaryText: result.detail.shape || "형태 정보 없음",
    secondaryLabel: "생태",
    secondaryText: result.detail.ecology || "생태 정보 없음",
    imageUrl: result.detail.imageUrls[0],
    additionalDetails,
  };
};
