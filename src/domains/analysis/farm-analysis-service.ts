import type { Farm } from "../farms/types";
import { normalizeNcpmsPestDetail, selectPestDetailRequests } from "../pests/detail-selection";
import type { NcpmsPestDetailResult, PestDetailRequest } from "../pests/detail-selection";
import { selectPredictionMapForCrop } from "../pests/prediction-map";
import { buildPesticideRecommendationView } from "../pesticides/safe-use";
import type { PesticideRecommendationView } from "../pesticides/safe-use";
import type { AnalysisSourceStatus } from "../reports/report-generation";
import { createRiskAnalysisCore } from "../risks/analysis-core";
import { fetchAgriWeatherObservation } from "@/integrations/agriWeather/observation";
import { fetchKmaForecast } from "@/integrations/kma/forecast";
import {
  fetchNcpmsDiseaseDetail,
  fetchNcpmsInsectDetail,
  fetchNcpmsInsectInfoDetail,
  fetchNcpmsNaturalEnemyDetail,
  fetchNcpmsWeedDetail,
  searchPestsByCropWithSource,
} from "@/integrations/ncpms/disease";
import { fetchNcpmsPredictionMetadata } from "@/integrations/ncpms/prediction-map";
import { fetchPesticideRegistrations } from "@/integrations/pesticides/registration";
import { getNcpmsGrowthStageLabel } from "../farms/growth-stage";
import { fetchMarketPriceSummaryForFarm } from "../market-prices/price-summary";

const fetchPestDetail = async (
  request: PestDetailRequest,
): Promise<NcpmsPestDetailResult | null> => {
  try {
    if (request.detailType === "DISEASE") {
      return { detailType: "DISEASE", detail: await fetchNcpmsDiseaseDetail(request.id) };
    }
    if (request.detailType === "INSECT") {
      const detail =
        request.detailServiceCode === "SVC08"
          ? await fetchNcpmsInsectInfoDetail(request.id)
          : request.detailServiceCode === "SVC15"
            ? await fetchNcpmsNaturalEnemyDetail(request.id)
            : await fetchNcpmsInsectDetail(request.id);
      return { detailType: "INSECT", detail };
    }
    return { detailType: "WEED", detail: await fetchNcpmsWeedDetail(request.id) };
  } catch {
    return null;
  }
};

const fetchPesticideRegistrationsForAnalysis = async (cropName: string, targetPestName?: string) => {
  const exactRegistrations = await fetchPesticideRegistrations({
    cropName,
    diseaseWeedName: targetPestName,
  });
  if (exactRegistrations.length > 0 || !targetPestName) return exactRegistrations;

  return fetchPesticideRegistrations({
    cropName,
    diseaseWeedName: targetPestName,
    similarPest: true,
  });
};

export const executeFarmAnalysis = async (farm: Farm) => {
  const [weatherRequest, agriWeatherRequest, pestsRequest, predictionRequest, marketPriceRequest] =
    await Promise.allSettled([
      fetchKmaForecast(farm.lat, farm.lng),
      fetchAgriWeatherObservation(farm.lat, farm.lng),
      searchPestsByCropWithSource(farm.crop),
      fetchNcpmsPredictionMetadata(),
      fetchMarketPriceSummaryForFarm({ cropName: farm.crop, region: farm.region }),
    ]);

  const weather = weatherRequest.status === "fulfilled" ? weatherRequest.value : null;
  const agriWeather = agriWeatherRequest.status === "fulfilled" ? agriWeatherRequest.value : null;
  const pestSearch = pestsRequest.status === "fulfilled" ? pestsRequest.value : null;
  const pests = pestSearch?.items ?? [];
  const predictionMetadata =
    predictionRequest.status === "fulfilled" ? predictionRequest.value : { crops: [], models: [] };
  const marketPriceSummary =
    marketPriceRequest.status === "fulfilled" ? marketPriceRequest.value : null;

  const pestDetailRequest = await Promise.allSettled(
    selectPestDetailRequests(pests).map(fetchPestDetail),
  );
  const pestDetailResults = pestDetailRequest
    .map((res) => (res.status === "fulfilled" ? res.value : null))
    .filter(Boolean) as NcpmsPestDetailResult[];

  // PERS 농약등록현황: 작물 + 첫 번째 병해충 후보명으로 등록 농약을 조회한다.
  // 병해충 후보가 없으면 작물명만으로 작물 전체 등록 농약을 조회한다.
  const targetPestName = pests[0]?.name;
  const pesticideRequest = await Promise.allSettled([
    fetchPesticideRegistrationsForAnalysis(farm.crop, targetPestName),
  ]);
  const pesticideRegistrations =
    pesticideRequest[0].status === "fulfilled" ? pesticideRequest[0].value : [];

  const sourceStatus: AnalysisSourceStatus = {
    weather: weatherRequest.status === "fulfilled" ? "LIVE" : "FAILED",
    agriWeather: agriWeather ? "LIVE" : "FAILED",
    agriWeatherNote: agriWeather
      ? `${agriWeather.observedDate} 관측·${agriWeather.distanceKm.toFixed(1)}km`
      : undefined,
    pests:
      pestsRequest.status === "rejected"
        ? "FAILED"
        : pestSearch?.source === "DEMO_FALLBACK"
          ? "FALLBACK"
          : pests.length > 0
            ? "LIVE"
            : "EMPTY",
    pesticides:
      pesticideRequest[0].status === "rejected"
        ? "FAILED"
        : pesticideRegistrations.length > 0
          ? "LIVE"
          : "EMPTY",
    marketPrices:
      marketPriceRequest.status === "rejected"
        ? "FAILED"
        : marketPriceSummary
          ? marketPriceSummary.rowCount > 0
            ? marketPriceSummary.isFallbackRange
              ? "FALLBACK"
              : "LIVE"
            : "EMPTY"
          : "EMPTY",
  };

  const normalizedWeather = weather
    ? {
        temperature: weather.temp,
        humidity: weather.hum,
        rainfall: weather.rain,
        wind: weather.wind,
      }
    : null;
  const analysisCore = createRiskAnalysisCore({
    crop: farm.crop,
    growthStage: getNcpmsGrowthStageLabel(farm.growthStageCode) ?? undefined,
    weather: normalizedWeather,
    agriWeather,
    // SVC16 결과는 작물 관련 지식 목록이며 실제 발생·관측 건수가 아닙니다.
    pestEvidenceCount: 0,
  });
  const displayWeather =
    analysisCore.weather && weather
      ? {
          ...analysisCore.weather,
          baseDate: weather.baseDate,
          baseTime: weather.baseTime,
          nx: weather.nx,
          ny: weather.ny,
        }
      : null;

  const growthStageLabel = getNcpmsGrowthStageLabel(farm.growthStageCode) ?? "생육단계 미선택";
  const pesticideRecommendations: PesticideRecommendationView = buildPesticideRecommendationView(
    pesticideRegistrations,
    {
      growthStageCode: farm.growthStageCode ?? null,
      growthStageLabel,
      targetCrop: farm.crop,
      targetPest: targetPestName,
    },
  );

  return {
    riskResult: analysisCore.riskResult,
    weather: displayWeather,
    agriWeather,
    pests,
    pestDetails: pestDetailResults.map(normalizeNcpmsPestDetail),
    predictionMap: selectPredictionMapForCrop(predictionMetadata, farm.crop),
    pesticideRecommendations,
    marketPriceSummary,
    sourceStatus,
  };
};
