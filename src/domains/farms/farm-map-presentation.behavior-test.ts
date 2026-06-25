import * as presentation from "./farm-map-presentation";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

assert(
  presentation.FARMMAP_INITIAL_VIEW.zoom >= presentation.FARMMAP_FEATURE_MIN_ZOOM,
  "initial FarmMap view must be close enough to display official parcel boundaries",
);
assert(
  presentation.FARMMAP_INITIAL_VIEW.center.lat >= 35.3 &&
    presentation.FARMMAP_INITIAL_VIEW.center.lat <= 36.2,
  "initial FarmMap center must stay inside Jeonbuk",
);
assert(
  presentation.canSelectFarmMapLocation(false),
  "FarmMap location selection must work before address search",
);
assert(
  !presentation.canSelectFarmMapLocation(true),
  "FarmMap location selection must be disabled while loading",
);

const expectedLandTypes = ["논", "밭", "과수", "시설"] as const;
assert(
  Array.isArray(presentation.FARMMAP_FILTERABLE_LAND_TYPES),
  "FarmMap must expose filterable land types",
);
assert(
  expectedLandTypes.every((landType) => presentation.FARMMAP_FILTERABLE_LAND_TYPES.includes(landType)),
  "FarmMap land-type filters must include rice paddy, field, orchard, and facility",
);
const styleEntries = expectedLandTypes.map((landType) =>
  presentation.getFarmMapLandTypeStyle(landType),
);
assert(
  new Set(styleEntries.map((style) => style.strokeColor)).size === expectedLandTypes.length,
  "Each FarmMap land type must use a distinct boundary stroke color",
);
assert(
  new Set(styleEntries.map((style) => style.fillColor)).size === expectedLandTypes.length,
  "Each FarmMap land type must use a distinct fill color",
);

const visibility = presentation.createDefaultFarmMapLandTypeVisibility();
visibility["밭"] = false;
const visibleParcels = presentation.filterFarmMapParcelsByLandTypes(
  [
    { farmMapId: "paddy", cropLandType: "논" },
    { farmMapId: "field", cropLandType: "밭" },
    { farmMapId: "orchard", cropLandType: "과수" },
    { farmMapId: "unknown", cropLandType: "미확인" },
  ],
  visibility,
);
assert(
  visibleParcels.map((parcel: { farmMapId: string }) => parcel.farmMapId).join(",") ===
    "paddy,orchard",
  "FarmMap land-type filter must hide disabled and unsupported land types",
);

console.log("FarmMap presentation behavior tests passed");
