import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateGeminiReport } from "@/integrations/gemini/client";
import { generateReportDocument } from "@/domains/reports/report-generation";

const InputSchema = z.object({
  farmName: z.string(),
  crop: z.string(),
  region: z.string(),
  area: z.number(),
  stage: z.string(),
  score: z.number().nullable(),
  levelLabel: z.string(),
  factors: z.array(z.object({ label: z.string(), detail: z.string() })),
  pests: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      confidence: z.string(),
      conditions: z.string(),
    }),
  ),
  pestDetails: z
    .array(
      z.object({
        title: z.string(),
        type: z.string(),
        primaryLabel: z.string(),
        primaryText: z.string(),
        secondaryLabel: z.string(),
        secondaryText: z.string(),
        preventionText: z.string(),
      }),
    )
    .optional(),
  weather: z
    .object({
      temperature: z.number(),
      humidity: z.number(),
      rainfall: z.number(),
      rainfallForecast: z.number(),
      wind: z.number(),
    })
    .nullable(),
  agriWeather: z
    .object({
      observedDate: z.string(),
      stationName: z.string(),
      distanceKm: z.number(),
      averageTemperature: z.number().optional(),
      humidity: z.number().optional(),
      rainfall: z.number().optional(),
      windSpeed: z.number().optional(),
      solarRadiation: z.number().optional(),
    })
    .optional(),
  machines: z
    .array(
      z.object({
        name: z.string(),
        centerName: z.string(),
        status: z.string(),
      }),
    )
    .optional(),
  pesticides: z
    .object({
      growthStageLabel: z.string(),
      targetPest: z.string().optional(),
      usableCount: z.number(),
      restrictedCount: z.number(),
      restrictedNames: z.array(z.string()),
    })
    .optional(),
  marketPrice: z
    .object({
      cropName: z.string(),
      itemName: z.string(),
      categoryCode: z.string(),
      itemCode: z.string(),
      categoryName: z.string(),
      mappingNote: z.string().optional(),
      latestDate: z.string().nullable(),
      latestKgPrice: z.number().nullable(),
      latestWholesaleKgPrice: z.number().nullable(),
      latestRetailKgPrice: z.number().nullable(),
      sevenDayAverageKgPrice: z.number().nullable(),
      thirtyDayAverageKgPrice: z.number().nullable(),
      changeFromSevenDayAveragePercent: z.number().nullable(),
      trend: z.enum(["UP", "DOWN", "FLAT", "UNKNOWN"]),
      points: z.array(
        z.object({
          date: z.string(),
          averageKgPrice: z.number(),
          rowCount: z.number(),
        }),
      ),
      derived: z
        .object({
          minKgPrice: z.number(),
          maxKgPrice: z.number(),
          avgKgPrice: z.number(),
          volatilityPercent: z.number(),
          aboveAveragePercent: z.number(),
          pointCount: z.number(),
        })
        .nullable(),
      rowCount: z.number(),
      classNames: z.array(z.string()),
      marketNames: z.array(z.string()),
      varietyNames: z.array(z.string()),
      gradeNames: z.array(z.string()),
      localRetail: z
        .object({
          regionCode: z.string(),
          regionName: z.string(),
          latestDate: z.string(),
          kgPrice: z.number(),
          marketNames: z.array(z.string()),
        })
        .nullable(),
      sourceLabel: z.string(),
      isFallbackRange: z.boolean(),
      lookupDays: z.number(),
      warning: z.string().optional(),
    })
    .optional(),
  decisionSummary: z
    .object({
      title: z.string(),
      subtitle: z.string(),
      tone: z.enum(["good", "watch", "bad", "neutral"]),
      items: z.array(
        z.object({
          id: z.enum(["pesticide", "market"]),
          title: z.string(),
          detail: z.string(),
          metric: z.string(),
          tone: z.enum(["good", "watch", "bad", "neutral"]),
          source: z.string(),
        }),
      ),
      caveats: z.array(z.string()),
    })
    .optional(),
  sources: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      status: z.enum(["LIVE", "EMPTY", "FALLBACK", "FAILED"]),
      note: z.string().optional(),
    }),
  ),
});

export const generateAiReport = createServerFn({ method: "POST" })
  .validator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const detailLines =
        data.pestDetails && data.pestDetails.length > 0
          ? data.pestDetails
              .map(
                (detail) =>
                  `- ${detail.title} (${detail.type}): ${detail.primaryLabel}=${detail.primaryText}; ${detail.secondaryLabel}=${detail.secondaryText}${
                    detail.preventionText ? `; 방제=${detail.preventionText}` : ""
                  }`,
              )
              .join("\n")
          : "- 상세정보 없음";
      const agriWeatherLines = data.agriWeather
        ? `- 관측일: ${data.agriWeather.observedDate}
- 관측지점: ${data.agriWeather.stationName} (농장과 ${data.agriWeather.distanceKm.toFixed(1)}km)
- 평균기온: ${data.agriWeather.averageTemperature ?? "정보 없음"}℃
- 습도: ${data.agriWeather.humidity ?? "정보 없음"}%
- 강수량: ${data.agriWeather.rainfall ?? "정보 없음"}mm
- 풍속: ${data.agriWeather.windSpeed ?? "정보 없음"}m/s
- 일사량: ${data.agriWeather.solarRadiation ?? "정보 없음"}`
        : "- 사용 가능한 농업기상 관측값 없음";
      const riskLines =
        data.score === null
          ? "- 위험 점수: 계산 불가"
          : `- 위험 점수: ${data.score}/100 (${data.levelLabel})`;
      const weatherLines = data.weather
        ? `- 기온: ${data.weather.temperature.toFixed(1)}℃
- 습도: ${data.weather.humidity}%
- 강수량: ${data.weather.rainfall}mm
- 예보 강수량: ${data.weather.rainfallForecast}mm
- 풍속: ${data.weather.wind}m/s`
        : "- 사용 가능한 기상청 실응답 없음";

      const machineLines = data.machines && data.machines.length > 0
        ? data.machines.map((m) => `- ${m.name} (위치: ${m.centerName}, 상태: ${m.status})`).join("\n")
        : "- 추천 가능한 주변 농기계 없음";

      const pesticideLines = data.pesticides
        ? `- 현재 생육단계: ${data.pesticides.growthStageLabel}${
            data.pesticides.targetPest ? ` · 대상 병해충 ${data.pesticides.targetPest}` : ""
          }
- 살포 가능 약제: ${data.pesticides.usableCount}종
- 현재 생육단계에서 제한 약제: ${data.pesticides.restrictedCount}종 (수확전금지일수로 인해 살포 불가)`
        : "- 등록농약 안전사용기준 정보 없음";

      const marketPriceLines = data.marketPrice
        ? `- KAMIS 품목: ${data.marketPrice.itemName} (${data.marketPrice.categoryName})
- 전국 중도매 최신 kg 환산가: ${
            data.marketPrice.latestWholesaleKgPrice === null
              ? "정보 없음"
              : `${data.marketPrice.latestWholesaleKgPrice.toLocaleString("ko-KR")}원/kg`
          }${data.marketPrice.latestDate ? `, 조사일 ${data.marketPrice.latestDate}` : ""}
- 7일 평균 대비 등락률: ${
            data.marketPrice.changeFromSevenDayAveragePercent === null
              ? "정보 없음"
              : `${data.marketPrice.changeFromSevenDayAveragePercent > 0 ? "+" : ""}${
                  data.marketPrice.changeFromSevenDayAveragePercent
                }%`
          }
- 지역 소매 참고: ${
            data.marketPrice.localRetail
              ? `${data.marketPrice.localRetail.regionName} ${data.marketPrice.localRetail.kgPrice.toLocaleString(
                  "ko-KR",
                )}원/kg`
              : "정보 없음"
          }
- 조회 범위: ${data.marketPrice.isFallbackRange ? `${data.marketPrice.lookupDays}일 fallback` : "최근 30일"}${
            data.marketPrice.warning ? ` (${data.marketPrice.warning})` : ""
          }
- 주의: 농가 수취가격이 아니라 KAMIS 중도매·소매 조사 가격`
        : "- KAMIS 도·소매 가격 정보 없음";

      const marketDerivedLines = data.marketPrice?.derived
        ? `- 최소 가격: ${data.marketPrice.derived.minKgPrice.toLocaleString("ko-KR")}원/kg
- 최대 가격: ${data.marketPrice.derived.maxKgPrice.toLocaleString("ko-KR")}원/kg
- 평균 가격: ${data.marketPrice.derived.avgKgPrice.toLocaleString("ko-KR")}원/kg
- 가격 변동성: ${data.marketPrice.derived.volatilityPercent}%
- 평균 대비 현재 가격: ${data.marketPrice.derived.aboveAveragePercent > 0 ? "+" : ""}${data.marketPrice.derived.aboveAveragePercent}%`
        : "- 파생 통계 정보 없음";

      const marketPointLines = data.marketPrice?.points && data.marketPrice.points.length > 0
        ? data.marketPrice.points.slice(-7).map((p) => `- ${p.date}: ${p.averageKgPrice.toLocaleString("ko-KR")}원/kg`).join("\n")
        : "- 최근 가격 포인트 없음";

      const decisionLines = data.decisionSummary
        ? `- 종합 판단: ${data.decisionSummary.title}
- 기준: ${data.decisionSummary.subtitle}
${data.decisionSummary.items
  .map((item) => `- ${item.title}: ${item.detail} (${item.metric} · ${item.source})`)
  .join("\n")}
${data.decisionSummary.caveats.map((caveat) => `- 확인 필요: ${caveat}`).join("\n")}`
        : "- PERS/KAMIS 결합 실행 요약 없음";

      const system = `당신은 전북 농가의 기상, 병해충, 발생정보, KAMIS 가격 데이터를 바탕으로 농가에 구체적이고 실질적인 농작업 및 경영 의사결정을 돕는 한국어 AI입니다.
- 수많은 병해충 후보를 뭉뚱그려 나열하지 마세요. 현재 관측된 기온, 습도, 강수량 조건에 가장 부합하는 치명적 위협 1~3개만 선별하여 구체적인 이유와 함께 경고하세요.
- 추상적인 표현("주의가 필요합니다", "철저히 관리하세요")을 피하고, 오늘, 이번 주, 이번 달 등 구체적인 타임라인에 맞춰 언제 무엇을 어떻게 해야 하는지 구체적인 행동 지침(Actionable)으로 작성하세요.
- 제공된 농기계 임대 정보가 있다면, 권장 작업(예: 방제, 수확 등)에 해당 농기계를 어느 임대사업소에서 대여하여 활용할 수 있는지 자연스럽게 연결하여 안내하세요.
- 위험 수준을 과장하지 않되, 명확한 기상/생육 근거를 바탕으로 설명하세요.
- 병해충마다 농가가 포장에서 직접 확인/관찰할 수 있는 방법을 포함하세요.
- 가격 정보 분석 시, KAMIS 데이터는 중도매/소매 조사 가격이므로 농가 실제 수취 가격과 차이가 있을 수 있음을 명시하고, 단순 가격 수치보다는 추세(상승/하락/변동성)와 계절성을 바탕으로 한 참고용 출하/수확 전략을 제안하세요.
- 농약 상품명은 언급하지 말고 일반 방제 작업명으로 표현하며, 잔류성이나 사용 가능 약제 수 등을 함께 안내하세요.
- PERS/KAMIS 결합 실행 요약이 제공되면 최우선 행동 지침과 주의사항에 반영하세요.`;

      const user = `다음 농장 분석 결과를 바탕으로 한국어 AI 리포트를 작성하세요.

## 농장 정보
- 농장명: ${data.farmName}
- 위치: ${data.region}
- 작물: ${data.crop}
- 면적: ${data.area.toLocaleString()}㎡
- 생육단계: ${data.stage}

## 위험 점수
${riskLines}

## 현재 기상
${weatherLines}

## 농업기상 결합정보
${agriWeatherLines}

## 위험 요인
${data.factors.map((factor) => `- ${factor.label}: ${factor.detail}`).join("\n")}

## 병해충 후보
${data.pests.map((pest) => `- ${pest.name} (${pest.type}, 신뢰도 ${pest.confidence}): ${pest.conditions}`).join("\n")}

## 병해충 상세정보
${detailLines}

## 주변 농기계 임대 가능 정보 (해당 작업 권장 시 대여 안내 포함 요망)
${machineLines}

## PERS/KAMIS 결합 실행 요약
${decisionLines}

## 등록농약 안전사용기준 (PERS 등록정보 기준, 권장 작업에 현재 생육단계의 살포 제약 반영 요망)
${pesticideLines}

## KAMIS 도·소매 가격 참고
${marketPriceLines}

## KAMIS 가격 파생 통계 (시계열 데이터 기준)
${marketDerivedLines}

## KAMIS 최근 가격 추이 (최근 7포인트)
${marketPointLines}
`;

      const report = await generateReportDocument(data, () => generateGeminiReport(system, user));
      return { ok: true as const, ...report };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? "리포트 입력 처리에 실패했습니다." : "알 수 없는 오류",
      };
    }
  });
