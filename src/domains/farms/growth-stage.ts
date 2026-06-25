import {
  isNcpmsGrowthStageCode,
  NCPMS_GROWTH_STAGES,
  type NcpmsGrowthStageCode,
} from "../../integrations/ncpms/growth-stage";

export { NCPMS_GROWTH_STAGES } from "../../integrations/ncpms/growth-stage";
export type { NcpmsGrowthStageCode } from "../../integrations/ncpms/growth-stage";
export type GrowthStage = (typeof NCPMS_GROWTH_STAGES)[number]["label"];

export const parseNcpmsGrowthStageCode = (value: unknown): NcpmsGrowthStageCode | null =>
  isNcpmsGrowthStageCode(value) ? value : null;

export const getNcpmsGrowthStageLabel = (
  code: NcpmsGrowthStageCode | null | undefined,
): GrowthStage | null =>
  NCPMS_GROWTH_STAGES.find((stage) => stage.code === code)?.label ?? null;

export const getNcpmsGrowthStageCodeByLabel = (value: unknown): NcpmsGrowthStageCode | null =>
  NCPMS_GROWTH_STAGES.find((stage) => stage.label === value)?.code ?? null;
