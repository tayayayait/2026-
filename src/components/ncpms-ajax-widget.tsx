import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocateFixed, Map as MapIcon, MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FarmParcelBoundaryMap,
  type FarmPredictionLayerConfig,
} from "@/components/farm-parcel-boundary-map";
import type { FarmMapParcel, FarmParcelSelection } from "@/domains/farms/types";

export interface NcpmsPestOption {
  code: string;
  name: string;
  fieldCode?: string;
}

interface NcpmsRiskLevelView {
  name: string;
  description: string;
  color: string;
}

export interface NcpmsAjaxWidgetProps {
  lat: number;
  lng: number;
  farmName?: string;
  selectedCropName?: string;
  selectedCropCode?: string;
  selectedPestCode?: string;
  selectedPestName?: string;
  selectedFieldCode?: string;
  selectedDriveCycle?: string;
  selectedLastRunAt?: string;
  selectedRiskLevels?: NcpmsRiskLevelView[];
  locationSourceLabel?: string;
  farmParcel?: FarmParcelSelection;
  onPestListChange?: (cropCode: string | null, pests: NcpmsPestOption[]) => void;
}

type NcpmsMapScope = "farm" | "nationwide";

const NATIONAL_MAP_CENTER = { lat: 36.5, lng: 127.8, zoom: 7 } as const;
const FARM_MAP_ZOOM = 15;

const buildPredictionMapTitle = (cropName?: string, pestName?: string, farmName?: string) => {
  if (!pestName) return farmName ? `${farmName} 병해충 예측지도` : "병해충 예측지도";
  if (!cropName) return `${pestName} 예측지도`;

  const normalizedCrop = cropName.replace(/\s+/g, "");
  const normalizedPest = pestName.replace(/\s+/g, "");
  const pestLabel = normalizedPest.startsWith(normalizedCrop) ? pestName : `${cropName} ${pestName}`;

  return `${pestLabel} 예측지도`;
};

const formatNcpmsRunDate = (value?: string) => {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})?/.exec(value ?? "");
  if (!match) return "확실한 정보 없음";
  const [, year, month, day, hour] = match;
  return hour ? `${year}-${month}-${day} ${hour}시` : `${year}-${month}-${day}`;
};

const toFarmMapParcel = (parcel: FarmParcelSelection | undefined): FarmMapParcel | null => {
  if (!parcel) return null;

  return {
    ...parcel,
    legalDongAddress: null,
    cultivatedAreaSquareMeter: null,
    cultivationRatio: null,
    aerialPhotoYear: null,
    raw: {},
  };
};

export const NcpmsAjaxWidget = ({
  lat,
  lng,
  farmName,
  selectedCropName,
  selectedCropCode,
  selectedPestCode,
  selectedPestName,
  selectedFieldCode,
  selectedDriveCycle,
  selectedLastRunAt,
  selectedRiskLevels = [],
  locationSourceLabel = "등록 필지 중심",
  farmParcel,
  onPestListChange,
}: NcpmsAjaxWidgetProps) => {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [mapScope, setMapScope] = useState<NcpmsMapScope>("farm");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const displayTitle = buildPredictionMapTitle(selectedCropName, selectedPestName, farmName);
  const mapCenterLat = mapScope === "farm" ? lat : NATIONAL_MAP_CENTER.lat;
  const mapCenterLng = mapScope === "farm" ? lng : NATIONAL_MAP_CENTER.lng;
  const mapCenterZoom = mapScope === "farm" ? FARM_MAP_ZOOM : NATIONAL_MAP_CENTER.zoom;
  const mapScopeLabel = mapScope === "farm" ? locationSourceLabel : "전국 기준";
  const mapScopeDescription =
    mapScope === "farm"
      ? `${locationSourceLabel}: ${farmName ?? "등록 농장"} 좌표 ${lat.toFixed(5)}, ${lng.toFixed(5)}`
      : "대한민국 전체 예측지도";
  const selectedParcel = useMemo(() => toFarmMapParcel(farmParcel), [farmParcel]);
  const modelRunDate = formatNcpmsRunDate(selectedLastRunAt);
  const farmLocationGuide = selectedParcel
    ? "지도에서 흰색 외곽선이 있는 자주색 굵은 경계와 보라색 점이 등록한 농장 필지입니다. 필지 안쪽에 겹친 예측 색상을 아래 범례와 비교해 판단합니다."
    : "등록 필지 경계가 없어서 농장 주소 좌표의 점을 기준으로 표시합니다. 주변 예측 색상을 아래 범례와 비교해 판단합니다.";
  const predictionLayer = useMemo<FarmPredictionLayerConfig | null>(() => {
    if (!selectedFieldCode || !selectedLastRunAt) return null;
    return {
      name: selectedPestName ?? "NCPMS 예측지도",
      fieldCode: selectedFieldCode,
      driveCycle: selectedDriveCycle ?? "1",
      lastRunAt: selectedLastRunAt,
    };
  }, [selectedDriveCycle, selectedFieldCode, selectedLastRunAt, selectedPestName]);

  useEffect(() => {
    // iframe 내부에 주입할 전체 HTML 문서
    // 가이드(fore1_1.jsp): apiKey 는 프록시 서버가 주입하므로 클라이언트에 두지 않는다.
    const proxyUrl = `${window.location.origin}/api/ncpms-proxy`;

    const content = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: auto; background-color: #f8fafc; }
    #ncpms-map-target { width: 100%; height: 100%; min-width: 800px; min-height: 520px; }
    /* 가이드 OpenAPI SDK 가 생성하는 콘텐츠가 600px 이하에서 깨지므로 충분한 확보 */
    #npms_api_desc { display: none !important; }
    select, input, button { max-width: none !important; }
    #npms_api_map, #npms_api_chart { width: 100% !important; }
  </style>

  <!-- openapiFore.jsp 내부에 있던 CSS 종속성 직접 로드 -->
  <link type="text/css" rel="stylesheet" href="http://ncpms.rda.go.kr/css/openlayers.css" />
  <link type="text/css" rel="stylesheet" href="http://ncpms.rda.go.kr/css/div_drag.css" />
  <link type="text/css" rel="stylesheet" href="http://ncpms.rda.go.kr/css/api.css" />
  <link type="text/css" rel="stylesheet" href="http://ncpms.rda.go.kr/css/openapi_fore_cal.css" />
  <link type="text/css" rel="stylesheet" href="http://ncpms.rda.go.kr/js/amcharts_3.21.0/amcharts/plugins/export/export.css" />

  <!-- alert 오버라이드 -->
  <script type="text/javascript">
    window.alert = function(msg) {
      console.warn("NCPMS ALERT:", msg);
      var container = document.getElementById("ncpms-map-target");
      if (container) {
        var mapDiv = document.getElementById("npms_api_map");
        if (mapDiv) mapDiv.style.display = "none";

        var errorDiv = document.getElementById("ncpms-error");
        if (!errorDiv) {
           errorDiv = document.createElement("div");
           errorDiv.id = "ncpms-error";
           errorDiv.style.cssText = "display:flex; height:100%; align-items:center; justify-content:center; color:#ef4444; font-weight:bold; text-align:center; padding:1rem;";
           container.appendChild(errorDiv);
        }
        errorDiv.style.display = "flex";
        errorDiv.innerHTML = msg;
      }
    };
  </script>

  <script type="text/javascript">
    // React 브릿지 함수
    var lastPostedPestSignature = "";

    function postPestListToReact() {
      if (typeof kncrPestList !== "undefined" && kncrPestList.length > 0) {
        var cropSelect = document.querySelector('select[name=kncrCode]');
        var cropCode = cropSelect ? cropSelect.value : null;
        var pests = [];
        for (var i = 0; i < kncrPestList.length; i++) {
          if (cropCode && kncrPestList[i].getKncrCode() !== cropCode) continue;
          pests.push({
            code: kncrPestList[i].getDbyhsMdlCode(),
            fieldCode: kncrPestList[i].getFieldCode(),
            name: kncrPestList[i].getDbyhsMdlNm()
          });
        }
        var signature = String(cropCode || "") + "|" + pests.map(function(pest) { return pest.code; }).join(",");
        if (signature === lastPostedPestSignature) return;
        lastPostedPestSignature = signature;
        window.parent.postMessage({ type: 'NCPMS_PEST_LIST', cropCode: cropCode, pests: pests }, "*");
      }
    }

    var pendingCropCode = ${JSON.stringify(selectedCropCode || "")};
    var pendingPestCode = ${JSON.stringify(selectedPestCode || "")};

    function hasOption(select, value) {
      if (!select || !value) return false;
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === value) return true;
      }
      return false;
    }

    function syncSelectedCropAndPest() {
      var cropSelect = document.querySelector('select[name=kncrCode]');
      if (cropSelect && pendingCropCode && hasOption(cropSelect, pendingCropCode) && cropSelect.value !== pendingCropCode) {
        cropSelect.value = pendingCropCode;
        if (typeof changeKncrCode === "function") changeKncrCode();
      }

      var pestSelect = document.querySelector('select[name=dbyhsMdlcode]');
      if (pestSelect && pendingPestCode && hasOption(pestSelect, pendingPestCode) && pestSelect.value !== pendingPestCode) {
        pestSelect.value = pendingPestCode;
        if (typeof changeDbyhsMdlcode === "function") changeDbyhsMdlcode();
      }

      postPestListToReact();
    }

    function scheduleSelectionSync() {
      var attempts = 0;
      var timer = setInterval(function() {
        attempts++;
        syncSelectedCropAndPest();
        if (attempts >= 30) clearInterval(timer);
      }, 250);
    }

    var lastPestCount = 0;
    setInterval(function() {
      if (typeof kncrPestList !== "undefined" && kncrPestList.length !== lastPestCount) {
        lastPestCount = kncrPestList.length;
        syncSelectedCropAndPest();
      }
    }, 500);

    window.addEventListener("message", function(event) {
      var data = event.data;
      if (!data) return;

      if (data.type === 'CHANGE_CROP') {
         pendingCropCode = data.cropCode || "";
         syncSelectedCropAndPest();
      } else if (data.type === 'CHANGE_PEST') {
         pendingPestCode = data.pestCode || "";
         syncSelectedCropAndPest();

         var errorDiv = document.getElementById("ncpms-error");
         if (errorDiv) errorDiv.style.display = "none";
         var mapDiv = document.getElementById("npms_api_map");
         if (mapDiv) mapDiv.style.display = "block";
      }
    });
  </script>

  <script type="text/javascript" src="http://ncpms.rda.go.kr/js/jquery.min.js"></script>
  <script type="text/javascript" src="http://ncpms.rda.go.kr/chart/JSClass/FusionCharts.js"></script>
  <script type="text/javascript" src="http://ncpms.rda.go.kr/js/OpenLayers.js"></script>
  <script type="text/javascript" src="http://ncpms.rda.go.kr/js/proj4js-combined.js"></script>
  <script type="text/javascript" src="http://ncpms.rda.go.kr/js/vworld_key.js"></script>
  <script type="text/javascript" src="http://ncpms.rda.go.kr/js/div_drag.js"></script>
  <script type="text/javascript" src="http://ncpms.rda.go.kr/js/openapi_fore_init.js"></script>
  <script type="text/javascript" src="http://ncpms.rda.go.kr/js/openapi_fore_cal.js"></script>
  <script type="text/javascript" src="http://ncpms.rda.go.kr/js/openapi_fore_ajax.js"></script>
  <script type="text/javascript" src="http://ncpms.rda.go.kr/js/openapi_fore_ajax_compare.js"></script>
  <script type="text/javascript" src="http://ncpms.rda.go.kr/js/openapi_fore_ajax_map.js"></script>
  <script type="text/javascript" src="http://ncpms.rda.go.kr/js/openapi_fore_ajax_point.js"></script>
  <script type="text/javascript" src="http://ncpms.rda.go.kr/js/openapi_fore_ajax_support.js"></script>
  <script type="text/javascript" src="http://ncpms.rda.go.kr/js/amcharts_3.21.0/amcharts/amcharts.js"></script>
  <script type="text/javascript" src="http://ncpms.rda.go.kr/js/amcharts_3.21.0/amcharts/serial.js"></script>
  <script type="text/javascript" src="http://ncpms.rda.go.kr/js/amcharts_3.21.0/amcharts/plugins/export/export.min.js"></script>
  <script type="text/javascript" src="http://ncpms.rda.go.kr/js/amcharts_3.21.0/amcharts/themes/light.js"></script>
  <script type="text/javascript" src="http://ncpms.rda.go.kr/js/amcharts_3.21.0/amcharts/pie.js"></script>

  <script type="text/javascript">
    window.onload = function() {
      if (typeof npmsJ !== "undefined") {
        npmsJ(document).ready(function() {
          try {
            // apiKey 는 프록시가 서버에서 주입하므로 여기서는 미설정(프록시가 채움)
            setNpmsOpenApiServiceCode("SVC31");
            setNpmsOpenApiProxyUrl("${proxyUrl}");

            setNpmsOpenAPIWidth(800);
            setCoordinateZoom("${mapCenterLat}", "${mapCenterLng}", ${mapCenterZoom});

            // 서비스 작목 전체 추가 (감귤, 감자, 고추, 논벼, 배, 사과, 파, 포도)
            setCropList([
              "FC010101", "FT010601", "VC011205", "FT060614",
              "FC050501", "FT010602", "VC041202", "FT040603"
            ]);
            setMoveMatAt(true);

            // 농장 재배물 초기 선택 반영
            actionMapInfo("ncpms-map-target");
            scheduleSelectionSync();
          } catch (e) {
            console.error("NCPMS 스크립트 초기화 오류:", e);
          }
        });
      }
    };
  </script>
</head>
<body>
  <div id="ncpms-map-target"></div>
</body>
</html>
    `;
    setHtmlContent(content);
  }, [lat, lng, mapScope, mapCenterLat, mapCenterLng, mapCenterZoom, selectedCropCode, selectedPestCode]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "NCPMS_PEST_LIST") {
        onPestListChange?.(event.data.cropCode, event.data.pests);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onPestListChange]);

  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow && selectedCropCode) {
      iframeRef.current.contentWindow.postMessage(
        { type: "CHANGE_CROP", cropCode: selectedCropCode },
        "*",
      );
    }
  }, [selectedCropCode]);

  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow && selectedPestCode) {
      iframeRef.current.contentWindow.postMessage(
        { type: "CHANGE_PEST", pestCode: selectedPestCode },
        "*",
      );
    }
  }, [selectedPestCode]);

  return (
    <Card>
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPinned className="h-5 w-5 text-primary" /> {displayTitle}
            </CardTitle>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-[#d7e0d7] bg-[#f5f8f3] px-2.5 py-1 font-medium text-[#425348]">
                예측 대상: {selectedPestName ?? "선택된 병해충 모델"}
              </span>
              <span className="rounded-full border border-[#d7e0d7] bg-white px-2.5 py-1 font-medium text-[#425348]">
                지도 범위: {mapScopeLabel}
              </span>
            </div>
          </div>

          <div
            className="inline-flex w-full rounded-lg border border-[#d3ddd4] bg-[#eef3ee] p-1 sm:w-auto"
            aria-label="예측지도 표시 범위"
          >
            <button
              type="button"
              aria-pressed={mapScope === "farm"}
              onClick={() => setMapScope("farm")}
              className={cn(
                "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors sm:flex-none",
                mapScope === "farm"
                  ? "bg-white text-[#1e5f43] shadow-sm"
                  : "text-[#5c6b60] hover:bg-white/70",
              )}
            >
              <LocateFixed className="h-4 w-4" aria-hidden="true" />
              내 농장 중심
            </button>
            <button
              type="button"
              aria-pressed={mapScope === "nationwide"}
              onClick={() => setMapScope("nationwide")}
              className={cn(
                "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors sm:flex-none",
                mapScope === "nationwide"
                  ? "bg-white text-[#1e5f43] shadow-sm"
                  : "text-[#5c6b60] hover:bg-white/70",
              )}
            >
              <MapIcon className="h-4 w-4" aria-hidden="true" />
              전체 지도
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto rounded-md border bg-slate-50 p-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-xs text-[#536158]">
            <span className="font-semibold text-[#274434]">{mapScopeDescription}</span>
            <span>NCPMS SVC31 예측모델 기준</span>
          </div>
          <div className="mb-3 grid gap-2 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-lg border border-[#d7e0d7] bg-white px-3 py-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6b7c70]">
                예측 기준
              </div>
              <div className="mt-1 text-sm font-black text-[#1f3528]">
                {selectedCropName ?? "작물 미확인"} ·{" "}
                {selectedPestName ?? "선택된 병해충 모델"}
              </div>
              <div className="mt-2 grid gap-1.5 text-xs text-[#516358] sm:grid-cols-3">
                <span>모델 코드 {selectedPestCode ?? "-"}</span>
                <span>레이어 {selectedFieldCode ?? "-"}</span>
                <span>기준 시각 {modelRunDate}</span>
              </div>
            </section>
            <section className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-3 text-xs text-fuchsia-950">
              <div className="font-black">내 땅 확인</div>
              <p className="mt-1 leading-5">{farmLocationGuide}</p>
            </section>
          </div>
          {mapScope === "farm" && (
            <div className="mb-3 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-950 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-black">지도 색상 구분</div>
                <p className="mt-1 leading-5">
                  팜맵 경계 색상은 병해충 위험도가 아닙니다. 노랑·청록 면색은 필지
                  분류이고, 선택 병해충 위험도는 NCPMS 예측 레이어와 아래 색상 해석으로만
                  판단합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMapScope("nationwide")}
                className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-md border border-amber-300 bg-white px-3 font-bold text-amber-950 transition-colors hover:bg-amber-100"
              >
                전체 지도에서 분포 확인
              </button>
            </div>
          )}
          {mapScope === "farm" ? (
            <FarmParcelBoundaryMap
              key={`${selectedPestCode ?? "none"}-${selectedFieldCode ?? "none"}-${selectedLastRunAt ?? "none"}`}
              parcels={selectedParcel ? [selectedParcel] : []}
              selectedParcelId={selectedParcel?.farmMapId ?? null}
              addressLocation={{ lat, lng }}
              loading={false}
              canSelectLocation={false}
              enableWfsLookup={false}
              interactionHint="등록 필지 경계와 농장 중심점 위에 NCPMS 예측 위험도를 함께 표시합니다."
              predictionLayer={predictionLayer}
              onMapClick={() => undefined}
              onSelect={() => undefined}
            />
          ) : htmlContent ? (
            <iframe
              key={mapScope}
              ref={iframeRef}
              srcDoc={htmlContent}
              style={{ width: "100%", height: "560px", minWidth: "820px", border: "none" }}
              title={displayTitle}
              sandbox="allow-scripts"
            />
          ) : (
            <div
              style={{ minWidth: "820px", minHeight: "520px" }}
              className="flex h-full items-center justify-center text-muted-foreground"
            >
              로딩 중...
            </div>
          )}
          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-lg border border-[#d7e0d7] bg-white p-3">
              <h4 className="text-sm font-black text-[#1f3528]">색상 해석</h4>
              <div className="mt-2 grid gap-2">
                {selectedRiskLevels.length > 0 ? (
                  selectedRiskLevels.map((level) => (
                    <div
                      key={`${level.name}-${level.color}`}
                      className="flex items-start gap-2 rounded-md border border-[#e2e8e3] bg-[#fbfcf8] p-2 text-xs"
                    >
                      <span
                        className="mt-0.5 h-4 w-7 shrink-0 rounded-sm border border-black/10"
                        style={{ backgroundColor: level.color }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="font-bold text-[#263a2d]">{level.name}</span>
                        <span className="ml-2 text-[#5b6a60]">{level.description}</span>
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs leading-5 text-muted-foreground">
                    이 예측모델의 위험수준 범례를 가져오지 못했습니다.
                  </p>
                )}
                <div className="flex items-start gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 p-2 text-xs">
                  <span
                    className="mt-0.5 h-4 w-7 shrink-0 rounded-sm border border-slate-300 bg-white"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(135deg, #e5e7eb 0 4px, #ffffff 4px 8px)",
                    }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="font-bold text-slate-800">미표시</span>
                    <span className="ml-2 text-slate-600">
                      지도에 색이 없으면 이 모델·날짜·지역에서 NCPMS가 표시할 위험도
                      픽셀을 제공하지 않은 상태입니다. 1단계로 해석하지 않습니다.
                    </span>
                  </span>
                </div>
              </div>
            </section>
            <section className="rounded-lg border border-[#d7e0d7] bg-[#f6f8f4] p-3">
              <h4 className="text-sm font-black text-[#1f3528]">판단 방법</h4>
              <p className="mt-2 text-xs leading-5 text-[#536158]">
                이 화면은 NCPMS SVC31 예측지도 레이어를 등록 필지 위에 겹쳐 보여줍니다.
                앱이 필지 좌표의 숫자 위험값을 별도로 받는 구조는 아니므로, 흰색 외곽선이 있는 자주색 필지 경계
                안에 걸친 색상과 범례를 함께 확인해야 합니다.
              </p>
            </section>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
