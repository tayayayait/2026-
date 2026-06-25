import type { NcpmsGrowthStageCode } from "../farms/growth-stage";
import type { PesticideRegistration } from "@/integrations/pesticides/registration";

export type PesticideUsability = "USABLE" | "RESTRICTED" | "UNKNOWN";

/**
 * 수확이 가까운 생육단계에서 살포 금지일수(PHI)가 긴 약제는
 * 실제 수확 일정과 충돌할 수 있어 제한(RESTRICTED)으로 분류한다.
 *
 * 결실기(18605)는 수확이 임박한 단계이므로 PHI가 7일 이상인 약제는 제약 대상,
 * 개화기(18604)는 그보다 여유가 있으므로 PHI가 14일 이상인 약제만 제약 대상으로 본다.
 * 생육초기·중기·유묘기는 수확까지 시간적 여유가 있어 PHI 제약을 적용하지 않는다.
 */
const RESTRICTED_PHI_THRESHOLD: Partial<Record<NcpmsGrowthStageCode, number>> = {
  "18604": 14,
  "18605": 7,
};

export interface PesticideRecommendationEntry extends PesticideRegistration {
  usability: PesticideUsability;
  usabilityReason?: string;
}

export interface PesticideRecommendationView {
  growthStageCode: NcpmsGrowthStageCode | null;
  growthStageLabel: string;
  targetCrop: string;
  targetPest?: string;
  usable: PesticideRecommendationEntry[];
  restricted: PesticideRecommendationEntry[];
  unknown: PesticideRecommendationEntry[];
  totalCount: number;
}

export const classifyPesticideUsability = (
  pesticide: Pick<PesticideRegistration, "phiDays">,
  growthStageCode: NcpmsGrowthStageCode | null,
): PesticideUsability => {
  if (growthStageCode === null) return "UNKNOWN";
  if (pesticide.phiDays === undefined) return "UNKNOWN";

  const threshold = RESTRICTED_PHI_THRESHOLD[growthStageCode];
  if (threshold === undefined) return "USABLE";

  return pesticide.phiDays >= threshold ? "RESTRICTED" : "USABLE";
};

const buildUsabilityReason = (
  usability: PesticideUsability,
  pesticide: PesticideRegistration,
  growthStageCode: NcpmsGrowthStageCode | null,
): string | undefined => {
  if (usability === "USABLE") return undefined;
  if (usability === "UNKNOWN") return undefined;

  const threshold = growthStageCode ? RESTRICTED_PHI_THRESHOLD[growthStageCode] : undefined;
  if (threshold === undefined) return undefined;
  if (pesticide.phiDays === undefined) return undefined;

  return `수확 ${pesticide.phiDays}일 전부터 살포 금지 (현재 생육단계 권고 ${threshold}일 미만)`;
};

const annotateUsability = (
  pesticide: PesticideRegistration,
  growthStageCode: NcpmsGrowthStageCode | null,
): PesticideRecommendationEntry => {
  const usability = classifyPesticideUsability(pesticide, growthStageCode);
  return {
    ...pesticide,
    usability,
    usabilityReason: buildUsabilityReason(usability, pesticide, growthStageCode),
  };
};

export const groupByUsability = (
  pesticides: PesticideRegistration[],
  growthStageCode: NcpmsGrowthStageCode | null,
): Pick<PesticideRecommendationView, "usable" | "restricted" | "unknown"> => {
  const annotated = pesticides.map((item) => annotateUsability(item, growthStageCode));
  return {
    usable: annotated.filter((item) => item.usability === "USABLE"),
    restricted: annotated.filter((item) => item.usability === "RESTRICTED"),
    unknown: annotated.filter((item) => item.usability === "UNKNOWN"),
  };
};

export const buildPesticideRecommendationView = (
  pesticides: PesticideRegistration[],
  context: {
    growthStageCode: NcpmsGrowthStageCode | null;
    growthStageLabel: string;
    targetCrop: string;
    targetPest?: string;
  },
): PesticideRecommendationView => {
  const groups = groupByUsability(pesticides, context.growthStageCode);
  return {
    growthStageCode: context.growthStageCode,
    growthStageLabel: context.growthStageLabel,
    targetCrop: context.targetCrop,
    targetPest: context.targetPest,
    usable: groups.usable,
    restricted: groups.restricted,
    unknown: groups.unknown,
    totalCount: pesticides.length,
  };
};
