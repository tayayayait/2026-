import { useEffect, useMemo, useRef, useState } from "react";
import {
  FarmMapControls,
  type FarmMapBaseLayer,
} from "@/components/farm-map-controls";
import {
  FARMMAP_FILTERABLE_LAND_TYPES,
  FARMMAP_FEATURE_MIN_ZOOM,
  FARMMAP_INITIAL_VIEW,
  countFarmMapParcelsByLandType,
  createDefaultFarmMapLandTypeVisibility,
  filterFarmMapParcelsByLandTypes,
  getFarmMapLandTypeStyle,
  type FarmMapFilterableLandType,
} from "@/domains/farms/farm-map-presentation";
import {
  createFarmParcelMapViewport,
  createSelectedFarmParcelMapViewport,
} from "@/domains/farms/parcel-preview";
import type { FarmMapCoordinate, FarmMapParcel } from "@/domains/farms/types";
import { useFarmMapWfs, type BoundingBox } from "@/hooks/useFarmMapWfs";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    OpenLayers?: any;
  }
}

interface FarmParcelBoundaryMapProps {
  parcels: FarmMapParcel[];
  selectedParcelId: string | null;
  addressLocation: FarmMapCoordinate | null;
  loading: boolean;
  canSelectLocation: boolean;
  enableWfsLookup?: boolean;
  interactionHint?: string;
  predictionLayer?: FarmPredictionLayerConfig | null;
  onMapClick: (location: FarmMapCoordinate) => void;
  onSelect: (parcel: FarmMapParcel) => void;
  fullHeight?: boolean;
  focusRequest?: number;
}

export interface FarmPredictionLayerConfig {
  name: string;
  fieldCode: string;
  driveCycle: string;
  lastRunAt: string;
}

const OFFICIAL_OPENLAYERS_SCRIPT_ID = "farmmap-official-openlayers-js";
const OFFICIAL_OPENLAYERS_SCRIPT_SRC = "https://agis.epis.or.kr/ASD/js/lib/openlayers/OpenLayers.js";
const OPENLAYERS_IMAGE_PATH = "https://agis.epis.or.kr/ASD/js/lib/openlayers/img/";
const WEB_MERCATOR_EXTENT = 20_037_508.34;
const WEB_MERCATOR_MAX_RESOLUTION = 156_543.0339;
const NCPMS_PREDICTION_MAP_FILE = "npms_map_2011.map";
const FARMMAP_WMS_OPACITY = 0.28;

let openLayersLoader: Promise<any> | null = null;

const loadOfficialOpenLayers = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("OpenLayers can only be loaded in the browser."));
  }
  if (window.OpenLayers) return Promise.resolve(window.OpenLayers);
  if (openLayersLoader) return openLayersLoader;

  openLayersLoader = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(
      OFFICIAL_OPENLAYERS_SCRIPT_ID,
    ) as HTMLScriptElement | null;
    const resolveLoaded = () => {
      if (window.OpenLayers) resolve(window.OpenLayers);
      else reject(new Error("Official OpenLayers runtime loaded without window.OpenLayers."));
    };

    if (existingScript) {
      existingScript.addEventListener("load", resolveLoaded, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load official OpenLayers runtime.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = OFFICIAL_OPENLAYERS_SCRIPT_ID;
    script.src = OFFICIAL_OPENLAYERS_SCRIPT_SRC;
    script.async = true;
    script.onload = resolveLoaded;
    script.onerror = () => reject(new Error("Failed to load official OpenLayers runtime."));
    document.head.appendChild(script);
  });

  return openLayersLoader;
};

const patchOpenLayersPassiveEvents = (OpenLayers: any) => {
  if (OpenLayers.Event.__farmSyncPassivePatchApplied) return;
  
  // 1. 패시브 이벤트 패치 (경고 방지)
  const originalObserve = OpenLayers.Event.observe;
  OpenLayers.Event.observe = function observeWithExplicitPassiveOption(
    element: unknown,
    eventName: string,
    observer: EventListener,
    useCapture?: boolean | AddEventListenerOptions,
  ) {
    const browserEventName = eventName.toLowerCase();
    const needsCancelableListener =
      browserEventName === "mousewheel" ||
      browserEventName === "dommousescroll" ||
      browserEventName === "wheel" ||
      browserEventName === "touchstart" ||
      browserEventName === "touchmove";
    if (needsCancelableListener) {
      const capture =
        typeof useCapture === "object" ? Boolean(useCapture.capture) : Boolean(useCapture);
      return originalObserve.call(this, element, eventName, observer, {
        capture,
        passive: false,
      });
    }
    return originalObserve.call(this, element, eventName, observer, useCapture);
  };

  // 2. Tile Load Error 시 언마운트된 레이어 참조 방지 패치
  // "Cannot read properties of null (reading 'triggerEvent')" 에러 해결
  if (OpenLayers.Tile?.Image?.prototype) {
    const originalOnImageError = OpenLayers.Tile.Image.prototype.onImageError;
    OpenLayers.Tile.Image.prototype.onImageError = function () {
      // Tile이나 layer.events가 이미 파괴(Destroy)되었다면 이벤트를 트리거하지 않음
      if (!this.events) return;
      return originalOnImageError.apply(this, arguments);
    };
  }

  OpenLayers.Event.__farmSyncPassivePatchApplied = true;
};

export const FarmParcelBoundaryMap = ({
  parcels,
  selectedParcelId,
  addressLocation,
  loading,
  canSelectLocation,
  enableWfsLookup = true,
  interactionHint,
  predictionLayer,
  onMapClick,
  onSelect,
  fullHeight = false,
  focusRequest = 0,
}: FarmParcelBoundaryMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const openLayersRef = useRef<any | null>(null);
  const mapRef = useRef<any | null>(null);
  const baseLayersRef = useRef<Record<FarmMapBaseLayer, any> | null>(null);
  const farmMapWmsRef = useRef<any | null>(null);
  const predictionWmsRef = useRef<any | null>(null);
  const parcelLayerRef = useRef<any | null>(null);
  const clickLayerRef = useRef<any | null>(null);
  const selectControlRef = useRef<any | null>(null);
  const projectionsRef = useRef<{ webMercator: any; wgs84: any } | null>(null);
  const mapClickRef = useRef(onMapClick);
  const selectParcelRef = useRef(onSelect);
  const canSelectLocationRef = useRef(canSelectLocation);
  const farmMapVisibleRef = useRef(true);
  mapClickRef.current = onMapClick;
  selectParcelRef.current = onSelect;
  canSelectLocationRef.current = canSelectLocation;

  const [mapBounds, setMapBounds] = useState<BoundingBox | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(FARMMAP_INITIAL_VIEW.zoom);
  const [baseLayer, setBaseLayer] = useState<FarmMapBaseLayer>("SATELLITE");
  const [farmMapVisible, setFarmMapVisible] = useState(false);
  const [visibleLandTypes, setVisibleLandTypes] = useState(
    createDefaultFarmMapLandTypeVisibility,
  );
  const [mapReady, setMapReady] = useState(false);
  farmMapVisibleRef.current = farmMapVisible;
  const { parcels: wfsParcels, loading: wfsLoading, error: wfsError } = useFarmMapWfs(
    enableWfsLookup ? mapBounds : null,
    mapZoom,
  );

  const displayParcels = useMemo(() => {
    const uniqueParcels = new Map<string, FarmMapParcel>();
    for (const parcel of wfsParcels) uniqueParcels.set(parcel.farmMapId, parcel);
    for (const parcel of parcels) uniqueParcels.set(parcel.farmMapId, parcel);
    return Array.from(uniqueParcels.values());
  }, [parcels, wfsParcels]);
  const visibleDisplayParcels = useMemo(
    () => filterFarmMapParcelsByLandTypes(displayParcels, visibleLandTypes),
    [displayParcels, visibleLandTypes],
  );
  const landTypeLegend = useMemo(() => {
    const counts = countFarmMapParcelsByLandType(displayParcels);
    return FARMMAP_FILTERABLE_LAND_TYPES.map((landType) => {
      const style = getFarmMapLandTypeStyle(landType);
      return {
        landType,
        label: style.label,
        strokeColor: style.strokeColor,
        fillColor: style.fillColor,
        visible: visibleLandTypes[landType],
        count: counts[landType],
      };
    });
  }, [displayParcels, visibleLandTypes]);
  const selectedParcel =
    visibleDisplayParcels.find((parcel) => parcel.farmMapId === selectedParcelId) ?? null;
  const viewport = useMemo(
    () => createFarmParcelMapViewport(parcels, addressLocation),
    [addressLocation, parcels],
  );
  const toggleVisibleLandType = (landType: FarmMapFilterableLandType) => {
    setVisibleLandTypes((current) => ({
      ...current,
      [landType]: !current[landType],
    }));
  };

  useEffect(() => {
    let cancelled = false;
    void loadOfficialOpenLayers().then((OpenLayers) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      patchOpenLayersPassiveEvents(OpenLayers);
      OpenLayers.ImgPath = OPENLAYERS_IMAGE_PATH;
      const webMercator = new OpenLayers.Projection("EPSG:3857");
      const wgs84 = new OpenLayers.Projection("EPSG:4326");
      const maxExtent = new OpenLayers.Bounds(
        -WEB_MERCATOR_EXTENT,
        -WEB_MERCATOR_EXTENT,
        WEB_MERCATOR_EXTENT,
        WEB_MERCATOR_EXTENT,
      );
      const map = new OpenLayers.Map(containerRef.current, {
        projection: webMercator,
        displayProjection: wgs84,
        units: "m",
        maxExtent,
        numZoomLevels: 20,
        controls: [new OpenLayers.Control.Navigation(), new OpenLayers.Control.PanZoomBar()],
      });
      const tileOptions = {
        sphericalMercator: true,
        projection: webMercator,
        maxExtent,
        maxResolution: WEB_MERCATOR_MAX_RESOLUTION,
        numZoomLevels: 20,
        units: "m",
        transitionEffect: "resize",
      };
      const satellite = new OpenLayers.Layer.XYZ(
        "항공",
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}",
        {
          ...tileOptions,
          isBaseLayer: true,
        },
      );
      const street = new OpenLayers.Layer.XYZ(
        "일반",
        "https://tile.openstreetmap.org/${z}/${x}/${y}.png",
        {
          ...tileOptions,
          isBaseLayer: true,
          visibility: false,
        },
      );
      const farmMapWms = new OpenLayers.Layer.WMS(
        "팜맵 경계",
        "/api/farm-map/wms",
        {
          layers: "farm_map_api",
          styles: "01",
          format: "image/png",
          transparent: true,
        },
        {
          ...tileOptions,
          isBaseLayer: false,
          opacity: FARMMAP_WMS_OPACITY,
          visibility: false,
        },
      );
      const predictionWms = createPredictionWmsLayer(
        OpenLayers,
        predictionLayer,
        tileOptions,
      );
      const parcelLayer = new OpenLayers.Layer.Vector("선택 가능 필지");
      const clickLayer = new OpenLayers.Layer.Vector("클릭 위치");

      map.addLayers(
        [satellite, street, farmMapWms, predictionWms, parcelLayer, clickLayer].filter(Boolean),
      );
      map.setBaseLayer(satellite);
      map.setLayerIndex(farmMapWms, 20);
      if (predictionWms) map.setLayerIndex(predictionWms, 25);
      map.setLayerIndex(parcelLayer, 30);
      map.setLayerIndex(clickLayer, 40);

      const selectControl = new OpenLayers.Control.SelectFeature(parcelLayer, {
        hover: false,
        multiple: false,
        onSelect: (feature: any) => {
          const parcel = feature.attributes?.parcel as FarmMapParcel | undefined;
          if (parcel) selectParcelRef.current(parcel);
          selectControl.unselect(feature);
        },
      });
      map.addControl(selectControl);
      selectControl.activate();

      const updateFarmMapVisibility = () => {
        farmMapWms.setVisibility(farmMapVisibleRef.current && map.getZoom() >= FARMMAP_FEATURE_MIN_ZOOM);
      };
      const updateViewport = () => {
        const extent = map.getExtent();
        if (!extent) return;
        const geographicExtent = extent.clone().transform(webMercator, wgs84);
        setMapBounds({
          minLng: geographicExtent.left,
          minLat: geographicExtent.bottom,
          maxLng: geographicExtent.right,
          maxLat: geographicExtent.top,
        });
        const zoom = map.getZoom();
        setMapZoom(zoom);
        updateFarmMapVisibility();
      };
      map.events.register("moveend", map, updateViewport);
      map.events.register("click", map, (event: any) => {
        if (!canSelectLocationRef.current) return;
        const lonLat = map.getLonLatFromViewPortPx(event.xy).clone().transform(webMercator, wgs84);
        clickLayer.removeAllFeatures();
        clickLayer.addFeatures([
          createPointFeature(OpenLayers, { lat: lonLat.lat, lng: lonLat.lon }, webMercator, wgs84, {
            pointRadius: 6,
            strokeColor: "#ffffff",
            strokeWidth: 3,
            fillColor: "#f59e0b",
            fillOpacity: 1,
          }),
        ]);
        mapClickRef.current({ lat: lonLat.lat, lng: lonLat.lon });
      });

      const center = new OpenLayers.LonLat(
        FARMMAP_INITIAL_VIEW.center.lng,
        FARMMAP_INITIAL_VIEW.center.lat,
      ).transform(wgs84, webMercator);
      map.setCenter(center, FARMMAP_INITIAL_VIEW.zoom);

      openLayersRef.current = OpenLayers;
      mapRef.current = map;
      baseLayersRef.current = { SATELLITE: satellite, STREET: street };
      farmMapWmsRef.current = farmMapWms;
      predictionWmsRef.current = predictionWms;
      parcelLayerRef.current = parcelLayer;
      clickLayerRef.current = clickLayer;
      selectControlRef.current = selectControl;
      projectionsRef.current = { webMercator, wgs84 };
      setMapReady(true);
      updateViewport();
      window.requestAnimationFrame(() => map.updateSize());
    });

    return () => {
      cancelled = true;
      selectControlRef.current?.destroy?.();
      mapRef.current?.destroy?.();
      openLayersRef.current = null;
      mapRef.current = null;
      baseLayersRef.current = null;
      farmMapWmsRef.current = null;
      predictionWmsRef.current = null;
      parcelLayerRef.current = null;
      clickLayerRef.current = null;
      selectControlRef.current = null;
      projectionsRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = baseLayersRef.current;
    if (!map || !layers) return;
    map.setBaseLayer(layers[baseLayer]);
  }, [baseLayer, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = farmMapWmsRef.current;
    if (!map || !layer) return;
    layer.setVisibility(farmMapVisible && map.getZoom() >= FARMMAP_FEATURE_MIN_ZOOM);
  }, [farmMapVisible, mapReady]);

  useEffect(() => {
    if (!addressLocation && parcels.length === 0) return;
    const OpenLayers = openLayersRef.current;
    const map = mapRef.current;
    const projections = projectionsRef.current;
    if (!OpenLayers || !map || !projections) return;

    const { southWest, northEast } = viewport.bounds;
    const bounds = new OpenLayers.Bounds(
      southWest.lng,
      southWest.lat,
      northEast.lng,
      northEast.lat,
    ).transform(projections.wgs84, projections.webMercator);
    map.zoomToExtent(bounds, false);
    if (map.getZoom() > 17) map.zoomTo(17);
  }, [addressLocation, mapReady, parcels.length, viewport]);

  useEffect(() => {
    if (!selectedParcel) return;
    const map = mapRef.current;
    const projections = projectionsRef.current;
    if (!map || !projections) return;

    const selectedViewport = createSelectedFarmParcelMapViewport(selectedParcel);
    const { southWest, northEast } = selectedViewport.bounds;
    const bounds = new window.OpenLayers.Bounds(
      southWest.lng,
      southWest.lat,
      northEast.lng,
      northEast.lat,
    ).transform(projections.wgs84, projections.webMercator);
    map.zoomToExtent(bounds, false);

    const targetZoom = Math.min(18, Math.max(16, map.getZoom()));
    const center = new window.OpenLayers.LonLat(
      selectedViewport.center.lng,
      selectedViewport.center.lat,
    ).transform(projections.wgs84, projections.webMercator);
    map.setCenter(center, targetZoom);
  }, [focusRequest, mapReady, selectedParcel]);

  useEffect(() => {
    const OpenLayers = openLayersRef.current;
    const layer = parcelLayerRef.current;
    const projections = projectionsRef.current;
    if (!OpenLayers || !layer || !projections) return;

    layer.removeAllFeatures();
    const features: any[] = [];
    if (addressLocation && !selectedParcel) {
      features.push(
        createPointFeature(OpenLayers, addressLocation, projections.webMercator, projections.wgs84, {
          pointRadius: 7,
          strokeColor: "#ffffff",
          strokeWidth: 3,
          fillColor: "#0f766e",
          fillOpacity: 1,
        }),
      );
    }

    for (const parcel of visibleDisplayParcels) {
      if (!parcel.geometry) continue;
      const selected = parcel.farmMapId === selectedParcelId;
      if (selected) {
        features.push(
          createParcelFeature(
            OpenLayers,
            parcel,
            "selectedHalo",
            projections.webMercator,
            projections.wgs84,
          ),
          createParcelFeature(
            OpenLayers,
            parcel,
            "selected",
            projections.webMercator,
            projections.wgs84,
          ),
        );
      } else {
        features.push(
          createParcelFeature(
            OpenLayers,
            parcel,
            "default",
            projections.webMercator,
            projections.wgs84,
          ),
        );
      }
    }

    if (selectedParcel) {
      features.push(
        createPointFeature(
          OpenLayers,
          selectedParcel.centroid,
          projections.webMercator,
          projections.wgs84,
          {
            pointRadius: 10,
            strokeColor: "#ffffff",
            strokeWidth: 5,
            fillColor: "#d946ef",
            fillOpacity: 1,
            label: "내 농장",
            fontColor: "#581c87",
            fontSize: "13px",
            fontWeight: "bold",
            labelYOffset: -28,
            labelOutlineColor: "#ffffff",
            labelOutlineWidth: 5,
          },
        ),
      );
    }

    if (features.length > 0) layer.addFeatures(features);
  }, [addressLocation, visibleDisplayParcels, mapReady, selectedParcel, selectedParcelId]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-slate-800",
        fullHeight
          ? "h-[calc(100vh-4rem)] min-h-[620px]"
          : "min-h-[560px] rounded-xl border border-slate-950/15 shadow-[0_24px_70px_-36px_rgba(2,20,13,0.8)] lg:min-h-[680px]",
      )}
    >
      <div
        ref={containerRef}
        className={cn(
          "absolute inset-0 z-0",
          canSelectLocation && "farm-map-location-selection-enabled",
        )}
        role="application"
        aria-label="농장 필지 선택 지도"
      />
      <FarmMapControls
        baseLayer={baseLayer}
        farmMapVisible={farmMapVisible}
        landTypeLegend={landTypeLegend}
        loading={loading || wfsLoading}
        error={wfsError}
        parcelCount={visibleDisplayParcels.length}
        selectedParcel={selectedParcel}
        canSelectLocation={canSelectLocation}
        interactionHint={interactionHint}
        onBaseLayerChange={setBaseLayer}
        onFarmMapVisibilityChange={setFarmMapVisible}
        onToggleLandType={toggleVisibleLandType}
        onShowAllLandTypes={() => setVisibleLandTypes(createDefaultFarmMapLandTypeVisibility())}
      />
      {selectedParcel && (
        <div className="pointer-events-none absolute left-3 top-24 z-[500] max-w-[calc(100%-1.5rem)] rounded-lg border border-fuchsia-200 bg-white/96 px-3 py-2 text-xs font-bold text-fuchsia-950 shadow-lg backdrop-blur-md">
          흰색 외곽선이 있는 굵은 경계와 보라색 점이 등록된 내 농장 필지입니다.
        </div>
      )}
      {predictionLayer && (
        <div className="pointer-events-none absolute bottom-16 left-3 z-[500] max-w-[calc(100%-1.5rem)] rounded-lg border border-sky-200 bg-white/96 px-3 py-2 text-xs text-slate-800 shadow-lg backdrop-blur-md">
          <div className="font-black text-sky-950">NCPMS 예측 레이어</div>
          <p className="mt-1 font-semibold">
            {predictionLayer.name} · {predictionLayer.fieldCode}
          </p>
          <p className="mt-1 leading-5 text-slate-600">
            팜맵 경계 색상은 필지 분류이며 병해충 위험도가 아닙니다. 위험색이 보이지
            않으면 현재 필지 주변에 표시할 NCPMS 위험도 픽셀이 없는 상태로 판단합니다.
          </p>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-1 right-2 z-[500] rounded bg-white/80 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
        Esri World Imagery | 농림축산식품부 · EPIS 팜맵
        {predictionLayer ? " | NCPMS 예측지도" : ""}
      </div>
    </div>
  );
};

const buildNcpmsPredictionLayerUrl = (layer: FarmPredictionLayerConfig) => {
  const runMatch = /^(\d{4})(\d{2})(\d{2})(\d{2})?/.exec(layer.lastRunAt);
  if (!runMatch || !layer.fieldCode) return null;

  const [, year, month, day, hour = "00"] = runMatch;
  const predictionHour = layer.driveCycle === "0" ? hour : "00";
  const params = new URLSearchParams({
    map_: NCPMS_PREDICTION_MAP_FILE,
    fcode: layer.fieldCode,
    y: year,
    m: month,
    d: day,
    h: predictionHour,
    dummy: "0",
  });

  return `https://ncpms.rda.go.kr/map?${params.toString()}`;
};

const createPredictionWmsLayer = (
  OpenLayers: any,
  layer: FarmPredictionLayerConfig | null | undefined,
  tileOptions: Record<string, unknown>,
) => {
  if (!layer) return null;
  const mapUrl = buildNcpmsPredictionLayerUrl(layer);
  if (!mapUrl) return null;

  return new OpenLayers.Layer.WMS(
    layer.name,
    mapUrl,
    { transparent: "true", layers: "world" },
    {
      ...tileOptions,
      isBaseLayer: false,
      opacity: 0.42,
      visibility: true,
    },
  );
};

const createPointFeature = (
  OpenLayers: any,
  location: FarmMapCoordinate,
  webMercator: any,
  wgs84: any,
  style: Record<string, string | number>,
) => {
  const point = new OpenLayers.Geometry.Point(location.lng, location.lat).transform(
    wgs84,
    webMercator,
  );
  return new OpenLayers.Feature.Vector(point, {}, style);
};

const createParcelFeature = (
  OpenLayers: any,
  parcel: FarmMapParcel,
  variant: "default" | "selected" | "selectedHalo",
  webMercator: any,
  wgs84: any,
) => {
  const rings = parcel.geometry!.coordinates.map((ring) => {
    const points = ring.map((point) =>
      new OpenLayers.Geometry.Point(point.lng, point.lat).transform(wgs84, webMercator),
    );
    return new OpenLayers.Geometry.LinearRing(points);
  });
  const isSelected = variant === "selected";
  const isSelectedHalo = variant === "selectedHalo";
  const landTypeStyle = getFarmMapLandTypeStyle(parcel.cropLandType);
  return new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Polygon(rings), { parcel }, {
    strokeColor: isSelectedHalo ? "#ffffff" : landTypeStyle.strokeColor,
    strokeWidth: isSelectedHalo ? 12 : isSelected ? 7 : 2.5,
    strokeOpacity: 1,
    fillColor: landTypeStyle.fillColor,
    fillOpacity: isSelectedHalo ? 0 : isSelected ? 0.2 : 0.18,
    graphicZIndex: isSelectedHalo ? 19 : isSelected ? 20 : 10,
  });
};
