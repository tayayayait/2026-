export const AiReportResponseSchema = {
  type: "OBJECT",
  properties: {
    summary: {
      type: "STRING",
      description: "가장 시급한 조치사항과 그 이유를 2문장으로 직관적으로 요약",
    },
    riskDashboard: {
      type: "OBJECT",
      properties: {
        riskLevelText: { type: "STRING", description: "위험도 단계 (안전, 관심, 주의, 심각 등)" },
        coreReason: { type: "STRING", description: "핵심 위험 원인 1줄 요약" },
        urgency: { type: "STRING", description: "긴급도 라벨 (예: 당장 방제 필요, 3일 내 확인 등)" }
      },
      required: ["riskLevelText", "coreReason", "urgency"],
      description: "위험도 요약 대시보드 정보",
    },
    topThreats: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING", description: "위협 요인 (예: 잎집무늬마름병)" },
          reason: { type: "STRING", description: "위험 판단 근거 (현재 기온, 습도 등 구체적 수치 포함)" },
          requiredAction: { type: "STRING", description: "해결을 위한 즉각적 행동" },
        },
        required: ["name", "reason", "requiredAction"],
      },
      description: "현재 기상/생육 조건에 부합하는 치명적 핵심 위협 1~3개",
    },
    actionTimeline: {
      type: "OBJECT",
      properties: {
        today: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "오늘 즉시 해야 할 작업 (비 오기 전, 방제 등)"
        },
        thisWeek: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "이번 주 내에 해야 할 예찰/준비 작업"
        },
        thisMonth: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "이번 달 주요 농사 일정"
        }
      },
      required: ["today", "thisWeek", "thisMonth"],
      description: "오늘, 이번 주, 이번 달 단위의 작업 타임라인",
    },
    pestRiskCards: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          pestName: { type: "STRING" },
          riskProbability: { type: "STRING", description: "발생 가능성 (예: 높음, 중간, 낮음)" },
          observationMethod: { type: "STRING", description: "농가가 포장에서 직접 병해충을 관찰/확인하는 구체적 방법" },
          actionTiming: { type: "STRING", description: "방제 최적 시기" },
          treatmentType: { type: "STRING", description: "예방 위주인지 치료 위주인지 구분" }
        },
        required: ["pestName", "riskProbability", "observationMethod", "actionTiming", "treatmentType"],
      },
      description: "병해충별 관찰 및 대응 카드 데이터",
    },
    weatherSchedule: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          condition: { type: "STRING", description: "예상되는 주요 기상 (예: 내일 오전 강수 10mm)" },
          adjustment: { type: "STRING", description: "관수, 방제, 하우스 개폐 등 일정 조정 가이드" }
        },
        required: ["condition", "adjustment"],
      },
      description: "기상 변화에 따른 작업 일정 조정",
    },
    pesticideGuide: {
      type: "OBJECT",
      properties: {
        available: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "현재 생육단계에서 사용 가능한 일반적인 약제 종류 (상품명 제외)"
        },
        precautions: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "농약 안전사용기준(PHI 등) 관련 주의사항"
        }
      },
      required: ["available", "precautions"],
      description: "등록 약제 사용 가이드",
    },
    marketAnalysis: {
      type: "OBJECT",
      properties: {
        trendSummary: { type: "STRING", description: "최근 가격 추세 및 평년 대비 수준 요약" },
        seasonality: { type: "STRING", description: "현재 시기의 계절적 가격 특징" },
        strategy: { type: "STRING", description: "출하 시기 조정 등 판매 전략 (참고용)" }
      },
      required: ["trendSummary", "seasonality", "strategy"],
      description: "가격 분석 및 출하 전략 (면책 조항 포함 요망)",
    },
    harvestStrategy: {
      type: "OBJECT",
      properties: {
        expectedTiming: { type: "STRING", description: "예상 수확 시기" },
        priceForecast: { type: "STRING", description: "수확 시점 전후의 가격 전망" },
        recommendation: { type: "STRING", description: "최적의 판매 시점 제안 (참고용)" }
      },
      required: ["expectedTiming", "priceForecast", "recommendation"],
      description: "수확 및 판매 시점 결정 가이드",
    },
    precautions: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "전체적인 농작업 시 주의사항 2~3개",
    },
    finalChecklist: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "리포트를 다 읽고 농가가 지금 당장 밭으로 나가서 해야 할 3~5가지 구체적 행동 체크리스트",
    }
  },
  required: [
    "summary", "riskDashboard", "topThreats", "actionTimeline", 
    "pestRiskCards", "weatherSchedule", "pesticideGuide", 
    "marketAnalysis", "harvestStrategy", "precautions", "finalChecklist"
  ],
};
