import { renderFallbackReport } from "./fallback";
import type { RentalDataSource } from "../machines/types";
import type { MarketPriceSummary } from "../market-prices/price-summary";
import type { FarmDecisionSummary } from "../analysis/farm-decision-summary";

export type { RentalDataSource } from "../machines/types";

export type ReportSourceStatus = "LIVE" | "EMPTY" | "FALLBACK" | "FAILED";
export type ReportMode = "GEMINI" | "LOCAL_FALLBACK";
export interface ReportEvidenceSource {
  id: string;
  label: string;
  status: ReportSourceStatus;
  note?: string;
}

export interface ReportGenerationInput {
  farmName: string;
  crop: string;
  region: string;
  area: number;
  stage: string;
  score: number | null;
  levelLabel: string;
  factors: { label: string; detail: string }[];
  pests: { name: string; type: string; confidence: string; conditions: string }[];
  pestDetails?: {
    title: string;
    type: string;
    primaryLabel: string;
    primaryText: string;
    secondaryLabel: string;
    secondaryText: string;
    preventionText: string;
  }[];
  weather: {
    temperature: number;
    humidity: number;
    rainfall: number;
    rainfallForecast: number;
    wind: number;
  } | null;
  agriWeather?: {
    observedDate: string;
    stationName: string;
    distanceKm: number;
    averageTemperature?: number;
    maxTemperature?: number;
    minTemperature?: number;
    humidity?: number;
    rainfall?: number;
    windDirection?: string;
    windSpeed?: number;
    solarRadiation?: number;
    sunshineDuration?: number;
    kmaStationName?: string;
    kmaMaxTemperature?: number;
    kmaMinTemperature?: number;
    kmaRainfall?: number;
    kmaMaxWindSpeed?: number;
  };
  machines?: { name: string; centerName: string; status: string }[];
  pesticides?: {
    growthStageLabel: string;
    targetPest?: string;
    usableCount: number;
    restrictedCount: number;
    restrictedNames: string[];
  };
  marketPrice?: MarketPriceSummary;
  decisionSummary?: FarmDecisionSummary;
  sources: ReportEvidenceSource[];
}

export interface GeminiReportContent {
  summary: string;
  riskDashboard: {
    riskLevelText: string;
    coreReason: string;
    urgency: string;
  };
  topThreats: { name: string; reason: string; requiredAction: string }[];
  actionTimeline: {
    today: string[];
    thisWeek: string[];
    thisMonth: string[];
  };
  pestRiskCards: {
    pestName: string;
    riskProbability: string;
    observationMethod: string;
    actionTiming: string;
    treatmentType: string;
  }[];
  weatherSchedule: {
    condition: string;
    adjustment: string;
  }[];
  pesticideGuide: {
    available: string[];
    precautions: string[];
  };
  marketAnalysis: {
    trendSummary: string;
    seasonality: string;
    strategy: string;
  };
  harvestStrategy: {
    expectedTiming: string;
    priceForecast: string;
    recommendation: string;
  };
  precautions: string[];
  finalChecklist: string[];
}

export interface GeneratedReportDocument {
  content: string;
  mode: ReportMode;
  warning?: string;
  reportData?: GeminiReportContent;
  inputData?: ReportGenerationInput;
}

export interface AnalysisSourceStatus {
  weather: ReportSourceStatus;
  agriWeather: ReportSourceStatus;
  agriWeatherNote?: string;
  pests: ReportSourceStatus;
  pesticides?: ReportSourceStatus;
  marketPrices?: ReportSourceStatus;
}

const statusLabel: Record<ReportSourceStatus, string> = {
  LIVE: "실 API 응답",
  EMPTY: "정상 응답·결과 없음",
  FALLBACK: "대체 데이터",
  FAILED: "호출 실패",
};

const renderSources = (sources: ReportEvidenceSource[]) => `<details>
<summary>데이터 수집 출처 (클릭하여 확인)</summary>

${sources
  .map(
    (source) =>
      `- ${source.label}: ${statusLabel[source.status]}${source.note ? ` (${source.note})` : ""}`,
  )
  .join("\n")}
</details>`;

const renderMachines = (input: ReportGenerationInput) => {
  if (!input.machines?.length) return "";
  const machines = Array.from(
    new Map(
      input.machines.map((machine) => [`${machine.centerName}:${machine.name}`, machine]),
    ).values(),
  );
  return `### 참고: 주변 농기계 임대 정보
${machines
  .map((machine) => `- ${machine.name}: ${machine.centerName} (${machine.status})`)
  .join("\n")}`;
};

const renderDecisionSummary = (input: ReportGenerationInput) => {
  const decision = input.decisionSummary;
  if (!decision) return "";

  const items = decision.items
    .map((item) => `- ${item.title}: ${item.detail} (${item.metric} · ${item.source})`)
    .join("\n");
  const caveats =
    decision.caveats.length > 0
      ? `\n- 확인 필요: ${decision.caveats.join(" / ")}`
      : "";

  return `### 실행 판단 요약
- 종합 판단: ${decision.title}
- 기준: ${decision.subtitle}
${items}${caveats}`;
};

const renderPesticides = (input: ReportGenerationInput) => {
  const pesticides = input.pesticides;
  if (!pesticides) return "";

  const restrictedNote =
    pesticides.restrictedCount > 0
      ? ` · 제한 ${pesticides.restrictedCount}종 (수확 전 금지일수로 인해 현재 생육단계에서 살포 불가능한 약제)`
      : "";

  return `### 참고: 등록농약 안전사용기준
- 현재 생육단계 ${pesticides.growthStageLabel}${
    pesticides.targetPest ? ` · 대상 병해충 ${pesticides.targetPest}` : ""
  }
- 살포 가능 ${pesticides.usableCount}종${restrictedNote}
- PERS 농약등록정보 기준이며, 권장 작업에 현재 생육단계의 살포 제약을 반영하세요.`;
};

const formatMarketPrice = (value: number | null | undefined) =>
  value === null || value === undefined ? "-" : `${value.toLocaleString("ko-KR")}원/kg`;

const renderMarketPrice = (input: ReportGenerationInput) => {
  const marketPrice = input.marketPrice;
  if (!marketPrice) return "";

  const change =
    marketPrice.changeFromSevenDayAveragePercent === null
      ? ""
      : ` · 7일 평균 대비 ${marketPrice.changeFromSevenDayAveragePercent > 0 ? "+" : ""}${
          marketPrice.changeFromSevenDayAveragePercent
        }%`;
  const local = marketPrice.localRetail
    ? `\n- 지역 소매 참고: ${marketPrice.localRetail.regionName} ${formatMarketPrice(
        marketPrice.localRetail.kgPrice,
      )} (${marketPrice.localRetail.latestDate})`
    : "";
  const lookupNote = marketPrice.isFallbackRange
    ? `\n- 조회 범위: 최근 30일 응답 없음, 최근 ${marketPrice.lookupDays}일 마지막 조사값 참고`
    : "\n- 조회 범위: 최근 30일";
  const warning = marketPrice.warning ? `\n- 주의: ${marketPrice.warning}` : "";

  return `### 참고: KAMIS 도·소매 가격
- 품목: ${marketPrice.itemName} (${marketPrice.categoryName})
- 전국 중도매 기준 최신 kg 환산가: ${formatMarketPrice(marketPrice.latestWholesaleKgPrice)}${
    marketPrice.latestDate ? ` (${marketPrice.latestDate})` : ""
  }${change}${local}${lookupNote}${warning}
- 이 값은 농가 수취가격이 아니라 KAMIS 중도매·소매 조사 가격입니다.`;
};

const renderAgriWeather = (input: ReportGenerationInput) => {
  const observation = input.agriWeather;
  if (!observation) return "## 농업기상 관측\n- 사용 가능한 관측값 없음";
  const values = [
    observation.averageTemperature === undefined
      ? null
      : `평균기온 ${observation.averageTemperature}℃`,
    observation.maxTemperature === undefined ? null : `최고기온 ${observation.maxTemperature}℃`,
    observation.minTemperature === undefined ? null : `최저기온 ${observation.minTemperature}℃`,
    observation.humidity === undefined ? null : `습도 ${observation.humidity}%`,
    observation.rainfall === undefined ? null : `강수량 ${observation.rainfall}mm`,
    observation.windSpeed === undefined ? null : `풍속 ${observation.windSpeed}m/s`,
    observation.windDirection === undefined ? null : `풍향 ${observation.windDirection}`,
    observation.solarRadiation === undefined ? null : `일사량 ${observation.solarRadiation}`,
    observation.sunshineDuration === undefined ? null : `일조시간 ${observation.sunshineDuration}hr`,
  ].filter((value): value is string => value !== null);

  let report = `## 농업기상 관측
- ${observation.observedDate} · ${observation.stationName} · 농장과 ${observation.distanceKm.toFixed(1)}km
- ${values.length > 0 ? values.join(" · ") : "세부 관측값 없음"}`;

  // KMA 비교 결합 데이터가 존재하는 경우
  if (
    observation.kmaMaxTemperature !== undefined ||
    observation.kmaRainfall !== undefined ||
    observation.kmaMaxWindSpeed !== undefined
  ) {
    report += `\n\n<details><summary>기상청 관측치 비교 (결합데이터)</summary>\n\n`;
    report += `- 기온 (최고/최저): 농업기상 ${observation.maxTemperature ?? "-"}℃ / ${observation.minTemperature ?? "-"}℃ vs 기상청 ${observation.kmaMaxTemperature ?? "-"}℃ / ${observation.kmaMinTemperature ?? "-"}℃\n`;
    report += `- 강수량: 농업기상 ${observation.rainfall ?? "-"}mm vs 기상청 ${observation.kmaRainfall ?? "-"}mm\n`;
    report += `- 풍속: 농업기상 ${observation.windSpeed ?? "-"}m/s vs 기상청(최대) ${observation.kmaMaxWindSpeed ?? "-"}m/s\n</details>`;
  }

  return report;
};

const renderGeminiReport = (
  input: ReportGenerationInput,
  report: GeminiReportContent,
) => `## 🚨 위험도 요약
- **${report.riskDashboard.riskLevelText}**: ${report.riskDashboard.coreReason}
- 긴급도: ${report.riskDashboard.urgency}

## 📋 분석 요약
${report.summary}

## 🦠 주요 위협 요인
${report.topThreats
  .map((threat) => `### ${threat.name}\n- **원인/근거**: ${threat.reason}\n- **즉각 조치**: ${threat.requiredAction}`)
  .join("\n\n")}

## 🗓 실행 타임라인
### 오늘 즉시
${report.actionTimeline.today.map((t) => `- ${t}`).join("\n")}
### 이번 주
${report.actionTimeline.thisWeek.map((t) => `- ${t}`).join("\n")}
### 이번 달
${report.actionTimeline.thisMonth.map((t) => `- ${t}`).join("\n")}

## 🐛 병해충 상세 관찰
${report.pestRiskCards.map((pest) => `### ${pest.pestName} (${pest.riskProbability})\n- 관찰 방법: ${pest.observationMethod}\n- 대응 시기: ${pest.actionTiming}\n- 치료 구분: ${pest.treatmentType}`).join("\n\n")}

## 🌤 기상 일정 조정
${report.weatherSchedule.map((w) => `- **${w.condition}**: ${w.adjustment}`).join("\n")}

## 🧪 약제 사용 가이드
- 사용 가능 약제군: ${report.pesticideGuide.available.join(", ")}
- 주의사항:
${report.pesticideGuide.precautions.map((p) => `  - ${p}`).join("\n")}

## 📈 가격 분석 및 출하 전략
- 추세: ${report.marketAnalysis.trendSummary}
- 계절성: ${report.marketAnalysis.seasonality}
- 전략: ${report.marketAnalysis.strategy}

## 🌾 수확 및 판매 시점
- 예상 수확: ${report.harvestStrategy.expectedTiming}
- 가격 전망: ${report.harvestStrategy.priceForecast}
- 권고 시점: ${report.harvestStrategy.recommendation}

## ✅ 최종 확인 체크리스트
${report.finalChecklist.map((c) => `- [ ] ${c}`).join("\n")}

## ⚠️ 주의사항
${report.precautions.map((item) => `- ${item}`).join("\n")}

${renderAgriWeather(input)}

${renderMachines(input)}

${renderDecisionSummary(input)}

${renderMarketPrice(input)}

${renderPesticides(input)}

---
${renderSources(input.sources)}`;

export const generateReportDocument = async (
  input: ReportGenerationInput,
  generate: () => Promise<GeminiReportContent>,
): Promise<GeneratedReportDocument> => {
  try {
    const report = await generate();
    return {
      content: renderGeminiReport(input, report),
      mode: "GEMINI",
      reportData: report,
      inputData: input,
    };
  } catch {
    return {
      content: renderFallbackReport(
        input,
        renderAgriWeather(input),
        renderMachines(input),
        renderSources(input.sources),
        renderDecisionSummary(input),
        renderPesticides(input),
        renderMarketPrice(input),
      ),
      mode: "LOCAL_FALLBACK",
      warning: "Gemini 응답을 사용할 수 없어 로컬 규칙 기반 리포트를 표시합니다.",
      inputData: input,
    };
  }
};

export const mapRentalSourceEvidence = (source: RentalDataSource): ReportEvidenceSource[] => {
  if (source === "PUBLIC_DATA_ODCLOUD") {
    return [
      { id: "PUBLIC_RENTAL", label: "전국농기계임대정보표준데이터", status: "LIVE" },
      { id: "ODCLOUD_RENTAL", label: "KREI/ODCloud 임대농기계 상세정보", status: "LIVE" },
    ];
  }
  if (source === "PUBLIC_DATA") {
    return [
      { id: "PUBLIC_RENTAL", label: "전국농기계임대정보표준데이터", status: "LIVE" },
      { id: "ODCLOUD_RENTAL", label: "KREI/ODCloud 임대농기계 상세정보", status: "EMPTY" },
    ];
  }
  if (source === "ODCLOUD") {
    return [{ id: "ODCLOUD_RENTAL", label: "KREI/ODCloud 임대농기계 상세정보", status: "LIVE" }];
  }
  return [{ id: "RENTAL_SAMPLE", label: "농기계 임대 샘플 데이터", status: "FALLBACK" }];
};

export const mapAnalysisSourceEvidence = (
  status: AnalysisSourceStatus,
): ReportEvidenceSource[] => [
  { id: "KMA", label: "기상청 단기예보", status: status.weather },
  {
    id: "AGRI_WEATHER",
    label: "농업기상 관측정보",
    status: status.agriWeather,
    note:
      status.agriWeatherNote ||
      (status.agriWeather === "FAILED" ? "실 관측 API 호출 실패" : undefined),
  },
  {
    id: "KMA_AGRI_MERGED",
    label: "기상청-농업기상 결합데이터",
    status: status.agriWeather,
    note: status.agriWeather === "LIVE" ? "비교 검증용 결합데이터" : undefined,
  },
  { id: "NCPMS", label: "NCPMS 병해충 정보", status: status.pests },
  ...(status.pesticides
    ? [{ id: "PERS", label: "농약등록현황(PERS)", status: status.pesticides }]
    : []),
  ...(status.marketPrices
    ? [{ id: "KAMIS_PRICE", label: "KAMIS 일별 도·소매 가격정보", status: status.marketPrices }]
    : []),
];
