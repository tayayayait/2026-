import type { MarketPriceSummary } from "../market-prices/price-summary";
import type { PesticideRecommendationView } from "../pesticides/safe-use";
import type { RiskAssessment, WorkType } from "../shared/types";

type DecisionRiskInput = Pick<RiskAssessment, "level" | "recommendedWorks">;
export type DecisionTone = "good" | "watch" | "bad" | "neutral";
export type DecisionItemId = "pesticide" | "market";

export interface FarmDecisionItem {
  id: DecisionItemId;
  title: string;
  detail: string;
  metric: string;
  tone: DecisionTone;
  source: string;
}

export interface FarmDecisionSummary {
  title: string;
  subtitle: string;
  tone: DecisionTone;
  items: FarmDecisionItem[];
  caveats: string[];
}

const CONTROL_WORK: WorkType = "방제";

const formatPrice = (value: number | null | undefined) =>
  value === null || value === undefined ? "가격 없음" : `${value.toLocaleString("ko-KR")}원/kg`;

const buildPesticideDecision = (
  risk: DecisionRiskInput | null,
  pesticides: PesticideRecommendationView,
): FarmDecisionItem => {
  const needsControl =
    risk?.recommendedWorks.includes(CONTROL_WORK) ||
    risk?.level === "WARNING" ||
    risk?.level === "CRITICAL";

  if (pesticides.totalCount === 0) {
    return {
      id: "pesticide",
      title: "등록농약 확인 불가",
      detail: "PERS 응답에 등록 약제가 없습니다. 작물명·병해충명과 제품 라벨을 먼저 확인해야 합니다.",
      metric: "등록 0종",
      tone: needsControl ? "bad" : "watch",
      source: "PERS 농약등록정보",
    };
  }

  if (pesticides.usable.length === 0 && pesticides.restricted.length > 0) {
    return {
      id: "pesticide",
      title: "현재 단계 살포 제한",
      detail: `${pesticides.growthStageLabel} 기준 등록 약제 ${pesticides.restricted.length}종이 PHI와 충돌합니다. 예방 관리나 대체 방제 판단이 필요합니다.`,
      metric: "가능 0종",
      tone: "bad",
      source: "PERS 농약등록정보",
    };
  }

  if (pesticides.usable.length > 0) {
    return {
      id: "pesticide",
      title: needsControl ? "방제 가능 약제 선별" : "방제 후보 약제 확보",
      detail: `${pesticides.growthStageLabel} 기준 살포 가능 ${pesticides.usable.length}종, 제한 ${pesticides.restricted.length}종입니다.`,
      metric: `${pesticides.usable.length}종 가능`,
      tone: needsControl ? "watch" : "good",
      source: "PERS 농약등록정보",
    };
  }

  return {
    id: "pesticide",
    title: "안전사용기간 미확인",
    detail: `등록 약제 ${pesticides.unknown.length}종의 PHI가 비어 있습니다. 살포 전 제품 라벨 확인이 필요합니다.`,
    metric: `${pesticides.unknown.length}종 미확인`,
    tone: "watch",
    source: "PERS 농약등록정보",
  };
};

const buildMarketDecision = (marketPrice: MarketPriceSummary | null): FarmDecisionItem => {
  if (!marketPrice || marketPrice.rowCount === 0) {
    return {
      id: "market",
      title: "가격 신호 없음",
      detail: "작물 코드가 없거나 최근 조사 기간에 KAMIS 도·소매 가격 응답이 없습니다.",
      metric: "조회 없음",
      tone: "neutral",
      source: "KAMIS 일별 도·소매 가격",
    };
  }

  if (marketPrice.isFallbackRange) {
    return {
      id: "market",
      title: "이전 조사 가격 참고",
      detail:
        marketPrice.warning ||
        "최근 조사 기간 응답이 없어 더 긴 조회 범위의 마지막 조사값을 참고로 표시합니다.",
      metric: formatPrice(marketPrice.latestWholesaleKgPrice),
      tone: "neutral",
      source: "KAMIS 일별 도·소매 가격",
    };
  }

  if (marketPrice.trend === "UP") {
    return {
      id: "market",
      title: "가격 상승 구간",
      detail: "출하 가능 물량이 있다면 도매가와 지역 소매 참고가를 함께 확인해 작업 우선순위를 검토합니다.",
      metric: formatPrice(marketPrice.latestWholesaleKgPrice),
      tone: "good",
      source: "KAMIS 일별 도·소매 가격",
    };
  }

  if (marketPrice.trend === "DOWN") {
    return {
      id: "market",
      title: "가격 약세 구간",
      detail: "긴급 수확 사유가 없다면 방제·품질 유지 작업과 출하 시점 재검토가 필요합니다.",
      metric: formatPrice(marketPrice.latestWholesaleKgPrice),
      tone: "watch",
      source: "KAMIS 일별 도·소매 가격",
    };
  }

  return {
    id: "market",
    title: marketPrice.trend === "FLAT" ? "가격 보합" : "가격 판단 보류",
    detail: "최근 평균 대비 변동성이 크지 않거나 비교 기준이 부족합니다. 가격은 참고 지표로만 사용합니다.",
    metric: formatPrice(marketPrice.latestWholesaleKgPrice),
    tone: "neutral",
    source: "KAMIS 일별 도·소매 가격",
  };
};

const selectOverallTone = (items: FarmDecisionItem[]): DecisionTone => {
  if (items.some((item) => item.tone === "bad")) return "bad";
  if (items.some((item) => item.tone === "watch")) return "watch";
  if (items.some((item) => item.tone === "good")) return "good";
  return "neutral";
};

const titleByTone: Record<DecisionTone, string> = {
  bad: "살포 제한과 작업 위험을 먼저 확인",
  watch: "방제·출하 판단 전 확인 필요",
  good: "방제·가격 판단 근거 확보",
  neutral: "외부 API 판단 근거 확인",
};

export const buildFarmDecisionSummary = ({
  risk,
  pesticides,
  marketPrice,
}: {
  risk: DecisionRiskInput | null;
  pesticides: PesticideRecommendationView;
  marketPrice: MarketPriceSummary | null;
}): FarmDecisionSummary => {
  const items = [buildPesticideDecision(risk, pesticides), buildMarketDecision(marketPrice)];
  const tone = selectOverallTone(items);

  return {
    title: titleByTone[tone],
    subtitle: "PERS 안전사용기준과 KAMIS 가격 신호를 현재 위험도 결과와 결합한 실행 요약입니다.",
    tone,
    items,
    caveats: [
      "PERS SVC01은 농약 등록현황 기준이며 등록취소 여부와 제품 라벨은 별도 확인이 필요합니다.",
      "KAMIS 값은 중도매·소매 조사 가격이며 농가 실제 수취가격으로 단정하지 않습니다.",
    ],
  };
};
