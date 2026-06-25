import assert from "node:assert/strict";
import { buildFarmDecisionSummary } from "./farm-decision-summary";
import type { MarketPriceSummary } from "../market-prices/price-summary";
import type { PesticideRecommendationView } from "../pesticides/safe-use";
import type { RiskAssessment } from "../shared/types";

const risk: RiskAssessment = {
  score: 82,
  level: "WARNING",
  factors: [],
  recommendedWorks: ["방제"],
  updatedAt: "2026-06-24T00:00:00.000Z",
};

const restrictedPesticides: PesticideRecommendationView = {
  growthStageCode: "18605",
  growthStageLabel: "결실기",
  targetCrop: "감자",
  targetPest: "역병",
  usable: [],
  restricted: [
    {
      id: "p1",
      brandName: "제한약제",
      cropName: "감자",
      diseaseWeedName: "역병",
      phiDays: 14,
      usability: "RESTRICTED",
    },
  ],
  unknown: [],
  totalCount: 1,
};

const risingMarket: MarketPriceSummary = {
  cropName: "감자",
  itemName: "감자",
  categoryCode: "100",
  itemCode: "152",
  categoryName: "식량작물",
  latestDate: "20260622",
  latestKgPrice: 2000,
  latestWholesaleKgPrice: 2000,
  latestRetailKgPrice: 3000,
  sevenDayAverageKgPrice: 1500,
  thirtyDayAverageKgPrice: 1300,
  changeFromSevenDayAveragePercent: 33.3,
  trend: "UP",
  points: [],
  rowCount: 3,
  classNames: ["중도매"],
  marketNames: ["가락도매"],
  varietyNames: [],
  gradeNames: [],
  localRetail: null,
  sourceLabel: "KAMIS 일별 도·소매 가격정보",
  isFallbackRange: false,
  lookupDays: 30,
  derived: {
    minKgPrice: 1300,
    maxKgPrice: 2000,
    avgKgPrice: 1500,
    volatilityPercent: 20,
    aboveAveragePercent: 33.3,
    pointCount: 0,
  },
};

const blocked = buildFarmDecisionSummary({
  risk,
  pesticides: restrictedPesticides,
  marketPrice: risingMarket,
});

assert.equal(blocked.tone, "bad");
assert.equal(blocked.items[0]?.id, "pesticide");
assert.equal(blocked.items[0]?.title, "현재 단계 살포 제한");
assert.equal(blocked.items[0]?.metric, "가능 0종");
assert.equal(blocked.items[1]?.id, "market");
assert.equal(blocked.items[1]?.title, "가격 상승 구간");
assert.equal(blocked.items[1]?.metric, "2,000원/kg");
assert(blocked.caveats.some((item) => item.includes("등록취소 여부")));
assert(blocked.caveats.some((item) => item.includes("농가 실제 수취가격")));

const staleMarket = buildFarmDecisionSummary({
  risk,
  pesticides: restrictedPesticides,
  marketPrice: {
    ...risingMarket,
    isFallbackRange: true,
    warning: "최근 30일 응답이 없어 최근 365일 범위의 마지막 조사값을 표시합니다.",
  },
});

assert.equal(staleMarket.items[1]?.title, "이전 조사 가격 참고");
assert.equal(staleMarket.items[1]?.tone, "neutral");
assert(staleMarket.items[1]?.detail.includes("최근 30일"));

const usablePesticides: PesticideRecommendationView = {
  ...restrictedPesticides,
  usable: [
    {
      id: "p2",
      brandName: "가능약제",
      cropName: "감자",
      diseaseWeedName: "역병",
      phiDays: 3,
      usability: "USABLE",
    },
  ],
  restricted: [],
  totalCount: 1,
};

const usable = buildFarmDecisionSummary({
  risk: { ...risk, level: "SAFE", recommendedWorks: [] },
  pesticides: usablePesticides,
  marketPrice: null,
});

assert.equal(usable.tone, "good");
assert.equal(usable.items[0]?.title, "방제 후보 약제 확보");
assert.equal(usable.items[1]?.title, "가격 신호 없음");

console.log("farm decision summary behavior tests passed");
