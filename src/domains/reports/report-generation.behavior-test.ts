import { readFileSync } from "node:fs";
import {
  generateReportDocument,
  mapAnalysisSourceEvidence,
  mapRentalSourceEvidence,
  type ReportGenerationInput,
} from "./report-generation";
import { selectReportFarm } from "./report-selection";
import { getMachineStatusLabel, getRiskLevelLabel } from "./report-presentation";
import {
  getMachineCountLabel,
  getMachineStatusLabel as getInventoryStatusLabel,
} from "../machines/presentation";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const reportRouteSource = readSource("../../routes/reports.$reportId.tsx");
const aiReportFunctionSource = readSource("../../lib/ai-report.functions.ts");

assert(
  reportRouteSource.includes("buildFarmDecisionSummary") &&
    reportRouteSource.includes("decisionSummary"),
  "report route must pass the combined PERS/KAMIS decision summary",
);
assert(
  aiReportFunctionSource.includes("decisionSummary: z") &&
    aiReportFunctionSource.includes("PERS/KAMIS 결합 실행 요약"),
  "AI report server function must preserve the decision summary input",
);

const input: ReportGenerationInput = {
  farmName: "만경 벼 농장",
  crop: "벼",
  region: "전북특별자치도 김제시",
  area: 12000,
  stage: "생육중기",
  score: 62,
  levelLabel: "주의",
  factors: [{ label: "기상 위험", detail: "습도가 높습니다." }],
  pests: [
    {
      name: "도열병",
      type: "DISEASE",
      confidence: "높음",
      conditions: "고온다습 조건에서 발생 가능성이 있습니다.",
    },
  ],
  pestDetails: [],
  weather: {
    temperature: 28,
    humidity: 86,
    rainfall: 12,
    rainfallForecast: 12,
    wind: 2,
  },
  agriWeather: {
    observedDate: "2026-06-18",
    stationName: "농업기상 관측지점",
    distanceKm: 64.3,
    averageTemperature: 25.3,
    humidity: 78.2,
    rainfall: 0,
    windSpeed: 1.2,
    solarRadiation: 510,
  },
  machines: [
    {
      name: "동력분무기",
      centerName: "김제시 농기계임대사업소",
      status: "AVAILABLE",
    },
    {
      name: "동력분무기",
      centerName: "김제시 농기계임대사업소",
      status: "AVAILABLE",
    },
  ],
  sources: [
    { id: "KMA", label: "기상청 단기예보", status: "LIVE" },
    { id: "NCPMS", label: "NCPMS 병해충 정보", status: "LIVE" },
    { id: "RDA", label: "농촌진흥청 병해충 발생정보", status: "LIVE" },
  ],
  decisionSummary: {
    title: "방제·출하 판단 전 확인 필요",
    subtitle: "PERS 안전사용기준과 KAMIS 가격 신호를 현재 위험도 결과와 결합한 실행 요약입니다.",
    tone: "watch",
    items: [
      {
        id: "pesticide",
        title: "방제 가능 약제 선별",
        detail: "생육중기 기준 살포 가능 2종, 제한 1종입니다.",
        metric: "2종 가능",
        tone: "watch",
        source: "PERS 농약등록정보",
      },
      {
        id: "market",
        title: "가격 상승 구간",
        detail: "출하 가능 물량이 있다면 도매가와 지역 소매 참고가를 함께 확인합니다.",
        metric: "2,000원/kg",
        tone: "good",
        source: "KAMIS 일별 도·소매 가격",
      },
    ],
    caveats: [
      "PERS SVC01은 농약 등록현황 기준이며 등록취소 여부와 제품 라벨은 별도 확인이 필요합니다.",
      "KAMIS 값은 중도매·소매 조사 가격이며 농가 실제 수취가격으로 단정하지 않습니다.",
    ],
  },
};

const reportFarms = [{ id: "farm-1" }, { id: "farm-2" }];
assert(selectReportFarm(reportFarms, "latest")?.id === "farm-1", "latest must select first farm");
assert(
  selectReportFarm(reportFarms, "farm-2")?.id === "farm-2",
  "report id must select matching farm",
);
assert(selectReportFarm([], "latest") === undefined, "empty farm list must return undefined");
assert(getRiskLevelLabel("CRITICAL") === "심각", "critical risk label mismatch");
assert(getRiskLevelLabel("SAFE") === "안정", "safe risk label mismatch");
assert(getMachineStatusLabel("AVAILABLE") === "대여 가능", "machine status label mismatch");
assert(
  getInventoryStatusLabel("AVAILABLE", "DEMO") === "샘플·문의 필요",
  "sample inventory must not claim live availability",
);
assert(
  getMachineCountLabel(3, "DEMO") === "예시 3대",
  "sample inventory count must be explicitly labeled",
);

const fallback = await generateReportDocument(input, async () => {
  throw new Error("quota exceeded");
});

assert(fallback.mode === "LOCAL_FALLBACK", "Gemini failure must produce a local fallback report");
assert(fallback.content.includes("로컬 규칙 기반 분석"), "fallback mode must be explicit");
assert(fallback.content.includes("도열병"), "fallback must retain pest evidence");
assert(fallback.content.includes("동력분무기"), "fallback must retain machine evidence");
assert(fallback.content.includes("## 농업기상 관측"), "fallback must include agricultural weather");
assert(fallback.content.includes("2026-06-18"), "fallback must include observation date");
assert(fallback.content.includes("### 실행 판단 요약"), "fallback must include the decision summary");
assert(fallback.content.includes("방제 가능 약제 선별"), "fallback must retain PERS decision item");
assert(fallback.content.includes("가격 상승 구간"), "fallback must retain KAMIS decision item");
assert(
  fallback.content.split("동력분무기").length - 1 === 1,
  "report machine evidence must remove duplicate rows",
);
assert(fallback.content.includes("데이터 수집 출처"), "fallback must include source section");
assert(fallback.content.includes("기상청 단기예보"), "fallback must identify KMA evidence");
assert(!fallback.warning?.includes("quota exceeded"), "internal Gemini errors must not leak");

let unavailableFallback: Awaited<ReturnType<typeof generateReportDocument>> | null = null;
try {
  unavailableFallback = await generateReportDocument(
    {
      ...input,
      score: null,
      levelLabel: "데이터 부족",
      factors: [],
      weather: null,
    } as unknown as ReportGenerationInput,
    async () => {
      throw new Error("provider unavailable");
    },
  );
} catch {
  unavailableFallback = null;
}
assert(unavailableFallback !== null, "report fallback must handle unavailable analysis inputs");
if (!unavailableFallback) throw new Error("unavailable report fallback was not generated");
assert(
  unavailableFallback.content.includes("위험 점수는 계산할 수 없습니다"),
  "report fallback must identify an unavailable risk score",
);
assert(
  unavailableFallback.content.includes("사용 가능한 기상청 실응답 없음"),
  "report fallback must identify unavailable weather",
);

const gemini = await generateReportDocument(input, async () => ({
  summary: "분석 요약입니다.",
  riskDashboard: {
    riskLevelText: "주의",
    coreReason: "습도 상승으로 인한 병해충 발생 우려",
    urgency: "3일 내 확인",
  },
  topThreats: [{ name: "위협", reason: "습도 상승", requiredAction: "포장 상태 확인" }],
  actionTimeline: {
    today: ["포장 확인"],
    thisWeek: ["방제 준비"],
    thisMonth: ["예찰 지속"],
  },
  pestRiskCards: [{
    pestName: "도열병",
    riskProbability: "높음",
    observationMethod: "잎 확인",
    actionTiming: "즉시",
    treatmentType: "치료",
  }],
  weatherSchedule: [{ condition: "비", adjustment: "방제 연기" }],
  pesticideGuide: { available: ["가"], precautions: ["안전장비 착용"] },
  marketAnalysis: { trendSummary: "상승세", seasonality: "여름철 상승", strategy: "관망" },
  harvestStrategy: { expectedTiming: "10월", priceForecast: "안정", recommendation: "적기 수확" },
  precautions: ["현장 상태를 함께 확인하세요."],
  finalChecklist: ["확인 완료하기"],
}));

assert(gemini.mode === "GEMINI", "successful Gemini response must retain Gemini mode");
assert(gemini.content.includes("분석 요약입니다."), "Gemini summary must be rendered");
assert(gemini.content.includes("데이터 수집 출처"), "Gemini report must include source section");
assert(gemini.content.includes("### 실행 판단 요약"), "Gemini report must include decision evidence");
assert(gemini.content.includes("방제 가능 약제 선별"), "Gemini report must retain PERS decision item");

const rentalEvidence = mapRentalSourceEvidence("PUBLIC_DATA_ODCLOUD");
assert(rentalEvidence.length === 2, "merged rental data must identify both public sources");
assert(
  rentalEvidence.every((source) => source.status === "LIVE"),
  "merged rental sources must be marked live",
);

const fallbackRentalEvidence = mapRentalSourceEvidence("SAMPLE_FALLBACK");
assert(
  fallbackRentalEvidence.some((source) => source.status === "FALLBACK"),
  "sample rental data must be marked as fallback",
);

const analysisEvidence = mapAnalysisSourceEvidence({
  weather: "LIVE",
  agriWeather: "FALLBACK",
  pests: "LIVE",
});
assert(analysisEvidence.length === 4, "analysis must identify all represented upstream sources");
assert(
  analysisEvidence.find((source) => source.id === "KMA")?.status === "LIVE",
  "KMA live response must remain live",
);
assert(
  analysisEvidence.find((source) => source.id === "NCPMS")?.status === "LIVE",
  "live NCPMS response must remain live",
);
assert(
  analysisEvidence.find((source) => source.id === "AGRI_WEATHER")?.status === "FALLBACK",
  "demo agricultural weather must be identified as fallback",
);
assert(
  analysisEvidence.find((source) => source.id === "KMA_AGRI_MERGED")?.status === "FALLBACK",
  "merged weather evidence must retain the agricultural weather source status",
);

const liveAgriEvidence = mapAnalysisSourceEvidence({
  weather: "LIVE",
  agriWeather: "LIVE",
  agriWeatherNote: "2026-06-18 관측·64.3km",
  pests: "EMPTY",
});
assert(
  liveAgriEvidence.find((source) => source.id === "AGRI_WEATHER")?.note ===
    "2026-06-18 관측·64.3km",
  "live agricultural weather evidence must include observation context",
);

console.log("report generation behavior tests passed");
