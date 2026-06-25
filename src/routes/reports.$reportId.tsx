import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useFarmsStore } from "@/domains/farms/store";

import { analyzeFarmRisk } from "@/lib/api/analyze.functions";
import { generateAiReport } from "@/lib/ai-report.functions";
import { getMachineRecommendations } from "@/lib/api/rental-machines.functions";
import {
  mapAnalysisSourceEvidence,
  mapRentalSourceEvidence,
  type RentalDataSource,
  type ReportMode,
  type GeneratedReportDocument,
} from "@/domains/reports/report-generation";
import type { RecommendationResult } from "@/domains/machines/recommender";
import { selectReportFarm } from "@/domains/reports/report-selection";
import {
  getMachineStatusLabel,
  getRiskLevelLabel,
  type ReportAnalysis,
} from "@/domains/reports/report-presentation";
import { ReportDocument } from "@/components/reports/report-document";
import type { NcpmsPest } from "@/integrations/ncpms/disease";
import type { PestDetailPanel } from "@/domains/pests/detail-selection";
import { getNcpmsGrowthStageLabel } from "@/domains/farms/growth-stage";
import { buildFarmDecisionSummary } from "@/domains/analysis/farm-decision-summary";

export const Route = createFileRoute("/reports/$reportId")({
  component: ReportDetail,
});

const getPestSymptomText = (pest: NcpmsPest, pestDetails: PestDetailPanel[]) => {
  if (pest.symptoms) return pest.symptoms;
  const detail = pestDetails.find((d) => d.id === pest.id && d.type === pest.type);
  if (detail && detail.primaryText && detail.primaryText !== "증상 정보 없음" && detail.primaryText !== "피해정보 없음" && detail.primaryText !== "형태 정보 없음") {
    return detail.primaryText;
  }
  return pest.scientificName ? `학명: ${pest.scientificName}` : "";
};

function ReportDetail() {
  const { reportId } = Route.useParams();
  const { farms, loadFarms } = useFarmsStore();
  const farmIdToUse = reportId === "latest" ? farms[0]?.id : reportId;
  const farm = farms.find((item) => item.id === farmIdToUse);

  const [reportResult, setReportResult] = useState<GeneratedReportDocument | null>(null);
  const [loadingStep, setLoadingStep] = useState<number | null>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (useFarmsStore.getState().farms.length === 0) await loadFarms();
      const currentFarm = selectReportFarm(useFarmsStore.getState().farms, reportId);

      if (!currentFarm) {
        setLoadingStep(null);
        setError("농장 정보를 찾을 수 없습니다.");
        return;
      }

      try {
        setError(null);
        setReportResult(null);
        setLoadingStep(0);
        await new Promise((resolve) => setTimeout(resolve, 300));

        setLoadingStep(1);
        await new Promise((resolve) => setTimeout(resolve, 300));

        setLoadingStep(2);
        const riskResponse = await analyzeFarmRisk({ data: currentFarm });
        if (!riskResponse.ok || !riskResponse.data) {
          throw new Error(riskResponse.error || "위험도 분석에 실패했습니다.");
        }

        const {
          riskResult,
          weather,
          agriWeather,
          pests,
          pestDetails,
          pesticideRecommendations,
          marketPriceSummary,
          sourceStatus,
        } = riskResponse.data as ReportAnalysis;

        setLoadingStep(3);
        await new Promise((resolve) => setTimeout(resolve, 300));

        setLoadingStep(4);
        const machineResponse = await getMachineRecommendations({
          data: {
            farmLocation: { lat: currentFarm.lat, lng: currentFarm.lng },
            works:
              riskResult && riskResult.recommendedWorks.length > 0
                ? riskResult.recommendedWorks
                : currentFarm.interestedWork,
            maxDistanceKm: 30,
          },
        });
        const machineData = machineResponse.ok ? machineResponse.data : null;
        const recommendations = (machineData?.recommendations || []) as RecommendationResult[];
        const rentalSources = machineData?.source
          ? mapRentalSourceEvidence(machineData.source as RentalDataSource)
          : [
              {
                id: "RENTAL_API",
                label: "농기계 임대정보",
                status: "FAILED" as const,
              },
            ];
        const decisionSummary = buildFarmDecisionSummary({
          risk: riskResult,
          pesticides: pesticideRecommendations,
          marketPrice: marketPriceSummary,
        });
        const aiResponse = await generateAiReport({
          data: {
            farmName: currentFarm.name,
            crop: currentFarm.crop,
            region: currentFarm.region,
            area: currentFarm.area,
            stage:
              getNcpmsGrowthStageLabel(currentFarm.growthStageCode) ?? "생육단계 재선택 필요",
            score: riskResult?.score ?? null,
            levelLabel: riskResult ? getRiskLevelLabel(riskResult.level) : "데이터 부족",
            factors:
              riskResult?.factors.map((factor) => ({
                label: factor.name,
                detail: factor.description,
              })) ?? [],
            pests: pests.map((pest) => ({
              name: pest.name,
              type: pest.type,
              confidence: "높음",
              conditions: getPestSymptomText(pest, pestDetails),
            })),
            pestDetails: pestDetails.map((detail) => ({
              title: detail.title,
              type: detail.type,
              primaryLabel: detail.primaryLabel,
              primaryText: detail.primaryText,
              secondaryLabel: detail.secondaryLabel,
              secondaryText: detail.secondaryText,
              preventionText: detail.preventionText || "",
            })),
            weather: weather
              ? {
                  temperature: weather.temperature,
                  humidity: weather.humidity,
                  rainfall: weather.rainfall,
                  rainfallForecast: weather.rainfall,
                  wind: weather.wind,
                }
              : null,
            agriWeather: agriWeather
              ? {
                  observedDate: agriWeather.observedDate,
                  stationName: agriWeather.stationName,
                  distanceKm: agriWeather.distanceKm,
                  averageTemperature: agriWeather.averageTemperature,
                  humidity: agriWeather.humidity,
                  rainfall: agriWeather.rainfall,
                  windSpeed: agriWeather.windSpeed,
                  solarRadiation: agriWeather.solarRadiation,
                }
              : undefined,
            machines: recommendations.slice(0, 5).map((recommendation) => ({
              name:
                recommendation.rental.machines.find(
                  (machine) => machine.type === recommendation.type,
                )?.name || recommendation.type,
              centerName: recommendation.rental.name,
              status: getMachineStatusLabel(recommendation.status),
            })),
            sources: [...mapAnalysisSourceEvidence(sourceStatus), ...rentalSources],
            decisionSummary,
            ...(pesticideRecommendations && pesticideRecommendations.totalCount >= 0
              ? {
                  pesticides: {
                    growthStageLabel: pesticideRecommendations.growthStageLabel,
                    targetPest: pesticideRecommendations.targetPest,
                    usableCount: pesticideRecommendations.usable.length,
                    restrictedCount: pesticideRecommendations.restricted.length,
                    restrictedNames: pesticideRecommendations.restricted.map(
                      (entry) => entry.brandName,
                    ),
                  },
                }
              : {}),
            ...(marketPriceSummary ? { marketPrice: marketPriceSummary } : {}),
          },
        });

        if (!aiResponse.ok || !aiResponse.content) {
          throw new Error(aiResponse.error || "AI 리포트 생성에 실패했습니다.");
        }

        const warning = aiResponse.warning || machineData?.warning || undefined;
        setReportResult({
          content: aiResponse.content,
          mode: aiResponse.mode,
          reportData: aiResponse.reportData,
          inputData: aiResponse.inputData,
          warning,
        });
        setLoadingStep(5);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "리포트 생성에 실패했습니다.";
        setError(message);
        setLoadingStep(null);
      }
    };

    fetchReport();
  }, [reportId, loadFarms]);

  return (
    <ReportDocument
      farmName={farm?.name}
      reportResult={reportResult}
      loadingStep={loadingStep}
      error={error}
    />
  );
}
