import { readFileSync } from "node:fs";

const mapComponentSource = readFileSync(
  new URL("../../components/farm-parcel-boundary-map.tsx", import.meta.url),
  "utf8",
);
const mapControlsSource = readFileSync(
  new URL("../../components/farm-map-controls.tsx", import.meta.url),
  "utf8",
);

if (mapComponentSource.includes('"leaflet"') || mapComponentSource.includes("import(\"leaflet\")")) {
  throw new Error("Farm registration map must not use Leaflet as its map renderer.");
}

if (!mapComponentSource.includes("OpenLayers.js")) {
  throw new Error("Farm registration map must load the official FarmMap guide OpenLayers runtime.");
}

if (!mapComponentSource.includes("passive: false")) {
  throw new Error("Farm registration map must register OpenLayers wheel/touch handlers as non-passive.");
}

if (!mapComponentSource.includes("FarmPredictionLayerConfig")) {
  throw new Error("FarmMap renderer must support a read-only NCPMS prediction overlay.");
}

if (!mapComponentSource.includes("const [farmMapVisible, setFarmMapVisible] = useState(false)")) {
  throw new Error("FarmMap WMS raster boundary must be opt-in to avoid covering the aerial map.");
}

if (!mapComponentSource.includes("FARMMAP_WMS_OPACITY")) {
  throw new Error("FarmMap WMS opacity must be named and intentionally kept subtle.");
}

if (!mapComponentSource.includes("visibleLandTypes")) {
  throw new Error("FarmMap renderer must keep map land-type filter state.");
}

if (!mapComponentSource.includes("filterFarmMapParcelsByLandTypes")) {
  throw new Error("FarmMap renderer must filter visible parcel features by land type.");
}

if (!mapComponentSource.includes("getFarmMapLandTypeStyle")) {
  throw new Error("FarmMap renderer must style parcel boundaries by land type.");
}

if (!mapControlsSource.includes("경지 구분") || !mapControlsSource.includes("aria-label=\"경지 구분 필터\"")) {
  throw new Error("FarmMap controls must render an accessible land-type legend and filter.");
}

if (!mapControlsSource.includes("landTypeLegend") || !mapControlsSource.includes("onToggleLandType")) {
  throw new Error("FarmMap controls must expose toggleable land-type legend items.");
}

if (!mapComponentSource.includes("https://ncpms.rda.go.kr/map?")) {
  throw new Error("FarmMap renderer must use the official NCPMS prediction WMS endpoint.");
}

if (!mapComponentSource.includes("fcode")) {
  throw new Error("FarmMap prediction overlay must select the NCPMS layer by fieldCode.");
}

if (!mapComponentSource.includes("내 농장")) {
  throw new Error("FarmMap prediction view must label the registered farm location.");
}

if (!mapComponentSource.includes("흰색 외곽선") || !mapComponentSource.includes("보라색 점")) {
  throw new Error("FarmMap prediction view must explain which marker is the user's parcel.");
}

if (!mapComponentSource.includes("selectedHalo") || !mapComponentSource.includes("#d946ef")) {
  throw new Error("FarmMap prediction view must draw the selected farm location with a distinct purple marker.");
}

if (!mapComponentSource.includes("mapReady")) {
  throw new Error("FarmMap renderer must rerun parcel viewport effects after OpenLayers becomes ready.");
}

if (!mapComponentSource.includes("NCPMS 예측 레이어")) {
  throw new Error("FarmMap prediction view must show which NCPMS layer is currently selected.");
}

if (!mapComponentSource.includes("팜맵 경계 색상은 필지 분류")) {
  throw new Error("FarmMap prediction view must not let FarmMap parcel colors be read as pest risk colors.");
}

console.log("FarmMap renderer behavior tests passed");
