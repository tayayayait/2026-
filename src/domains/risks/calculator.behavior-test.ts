import { calculateRiskScore } from "./calculator";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const optimalWeather = {
  temperature: 26,
  humidity: 70,
  rainfall: 0,
  wind: 1.5,
};

const optimalSoil = {
  soilMoisture: 70,
  soilTemperature: 20,
};

const severeWeather = {
  temperature: 37,
  humidity: 92,
  rainfall: 55,
  wind: 12,
};

const poorSoil = {
  soilMoisture: 18,
  soilTemperature: 28,
};

const safe = calculateRiskScore("벼", optimalWeather, optimalSoil, 0);
assert(safe.level === "SAFE", `Expected SAFE level, got ${safe.level}`);
assert(safe.score >= 0 && safe.score <= 24, `Expected SAFE score 0-24, got ${safe.score}`);

const unknownSoil = calculateRiskScore("벼", optimalWeather, {}, 0);
assert(Number.isFinite(unknownSoil.score), "missing soil data must not produce NaN");
assert(
  unknownSoil.factors.every((factor) => !factor.description.includes("토양수분")),
  "missing soil data must not be described as measured soil risk",
);
assert(
  !unknownSoil.recommendedWorks.some((work) => ["관수", "배수", "정식"].includes(work)),
  "soil-dependent work must not be recommended without soil data",
);

const critical = calculateRiskScore("벼", severeWeather, poorSoil, 3);
assert(critical.level === "CRITICAL", `Expected CRITICAL level, got ${critical.level}`);
assert(
  critical.score >= 75 && critical.score <= 100,
  `Expected CRITICAL score 75-100, got ${critical.score}`,
);
assert(
  critical.factors.some((factor) => factor.name === "병해충 관측"),
  "explicit pest evidence must be labeled as observation evidence",
);
assert(
  !critical.factors.some((factor) => factor.name === "병해충 후보"),
  "crop catalog candidates must not be presented as detected evidence",
);

const flowering = calculateRiskScore("벼", optimalWeather, optimalSoil, 0, {
  growthStage: "개화기",
});
const growthStageFactor = flowering.factors.find((factor) => factor.name === "생육단계 민감도");
assert(growthStageFactor?.score === 7, "flowering internal sensitivity contribution must be 7");
assert(
  Boolean(growthStageFactor?.description.includes("서비스 내부 정책")),
  "growth-stage risk must not be presented as an NCPMS-provided risk score",
);

const missingStage = calculateRiskScore("벼", severeWeather, poorSoil, 3, {});
assert(
  !missingStage.factors.some((factor) => factor.name === "생육단계 민감도"),
  "missing growth stage must not create an inferred sensitivity score",
);

console.log("risk calculator behavior tests passed");
