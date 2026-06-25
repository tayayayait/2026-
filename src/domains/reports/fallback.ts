import type { ReportGenerationInput } from "./report-generation";

const buildFallbackActions = (input: ReportGenerationInput) => {
  const actions = [
    input.score === null
      ? "기상청·NCPMS 실응답을 다시 조회한 뒤 실제 포장 상태를 확인하세요."
      : "위험 점수의 주요 요인과 실제 포장 상태를 대조해 확인하세요.",
  ];
  if (input.weather && input.weather.rainfallForecast >= 10)
    actions.push("강수 전 배수로와 침수 취약 구역을 점검하세요.");
  if ((input.weather && input.weather.humidity >= 80) || input.pests.length > 0) {
    actions.push("잎과 줄기의 병반·해충 흔적을 현장에서 확인하세요.");
  }
  return actions;
};

const renderRiskSummary = (input: ReportGenerationInput) =>
  input.score === null
    ? "기상청 또는 NCPMS 실응답이 부족해 위험 점수는 계산할 수 없습니다."
    : `현재 위험 점수는 ${input.score}/100 (${input.levelLabel})입니다.`;

const renderWeather = (input: ReportGenerationInput) => {
  if (!input.weather) return "## 기상청 단기예보\n- 사용 가능한 기상청 실응답 없음";
  return `## 기상청 단기예보
- 기온 ${input.weather.temperature.toFixed(1)}℃ · 습도 ${input.weather.humidity}% · 강수량 ${input.weather.rainfall}mm · 풍속 ${input.weather.wind}m/s`;
};

export const renderFallbackReport = (
  input: ReportGenerationInput,
  agriWeatherSection: string,
  machineSection: string,
  sourceSection: string,
  decisionSection = "",
  pesticideSection = "",
  marketPriceSection = "",
) => `## 로컬 규칙 기반 분석
Gemini 응답을 사용할 수 없어 입력된 공공데이터와 위험도 계산 결과로 리포트를 생성했습니다. ${renderRiskSummary(input)}

## 주요 위험 요인
${
  input.factors.length > 0
    ? input.factors.map((factor) => `- ${factor.label}: ${factor.detail}`).join("\n")
    : "- 확인된 위험 요인 없음"
}

## 병해충 확인 대상
${
  input.pests.length > 0
    ? input.pests
        .map((pest) => `- ${pest.name}: ${pest.conditions || "세부 조건 확인 필요"}`)
        .join("\n")
    : "- 조회된 병해충 후보 없음"
}

## 권장 작업
${buildFallbackActions(input)
  .map((action) => `- ${action}`)
  .join("\n")}

${renderWeather(input)}

${agriWeatherSection}

${machineSection}

${decisionSection}

${marketPriceSection}

${pesticideSection}

## 주의사항
- 이 결과는 AI 생성문이 아닌 규칙 기반 보조 자료입니다.
- 최종 작업은 실제 포장 상태와 전문가 판단을 함께 반영하세요.

## ✅ 최종 행동 체크리스트 (로컬 분석)
- [ ] 포장의 실제 기상/생육 상태와 위험 요인 대조하기
- [ ] 병해충 확인 대상 중 발생 징후가 있는지 현장 점검하기
- [ ] 방제 필요 시, 현재 생육단계를 고려해 적용 약제 선택하기
- [ ] 가격 지표와 농가 수취가격을 비교해 출하/수확 전략 결정하기

${sourceSection}`;
