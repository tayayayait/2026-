export const NCPMS_GROWTH_STAGES = [
  { code: "18601", label: "유묘기" },
  { code: "18602", label: "생육초기" },
  { code: "18603", label: "생육중기" },
  { code: "18604", label: "개화기" },
  { code: "18605", label: "결실기" },
] as const;

export type NcpmsGrowthStageCode = (typeof NCPMS_GROWTH_STAGES)[number]["code"];

export const isNcpmsGrowthStageCode = (value: unknown): value is NcpmsGrowthStageCode =>
  NCPMS_GROWTH_STAGES.some((stage) => stage.code === value);
