import { Layers3, Map, MapPin, MousePointer2, Satellite } from "lucide-react";
import type { FarmMapFilterableLandType } from "@/domains/farms/farm-map-presentation";
import type { FarmMapParcel } from "@/domains/farms/types";
import { cn } from "@/lib/utils";

export type FarmMapBaseLayer = "SATELLITE" | "STREET";

export interface FarmMapLandTypeLegendItem {
  landType: FarmMapFilterableLandType;
  label: string;
  strokeColor: string;
  fillColor: string;
  visible: boolean;
  count: number;
}

interface FarmMapControlsProps {
  baseLayer: FarmMapBaseLayer;
  farmMapVisible: boolean;
  landTypeLegend: FarmMapLandTypeLegendItem[];
  loading: boolean;
  error: string | null;
  parcelCount: number;
  selectedParcel: FarmMapParcel | null;
  canSelectLocation: boolean;
  interactionHint?: string;
  onBaseLayerChange: (layer: FarmMapBaseLayer) => void;
  onFarmMapVisibilityChange: (visible: boolean) => void;
  onToggleLandType: (landType: FarmMapFilterableLandType) => void;
  onShowAllLandTypes: () => void;
}

export const FarmMapControls = ({
  baseLayer,
  farmMapVisible,
  landTypeLegend,
  loading,
  error,
  parcelCount,
  selectedParcel,
  canSelectLocation,
  interactionHint,
  onBaseLayerChange,
  onFarmMapVisibilityChange,
  onToggleLandType,
  onShowAllLandTypes,
}: FarmMapControlsProps) => (
  <>
    <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex items-start justify-between gap-3">
      <div className="flex max-w-[60%] flex-col gap-2">
        <div className="inline-flex w-fit items-center gap-2 rounded-md border border-white/70 bg-slate-950/88 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
          <Layers3 className="h-3.5 w-3.5 text-emerald-300" />
          팜맵 OpenAPI
          <span className="h-3 w-px bg-white/25" />
          <span className={error ? "text-amber-300" : "text-emerald-200"}>
            {error ? "WFS 조회 오류" : loading ? "필지 불러오는 중" : `필지 ${parcelCount}개`}
          </span>
        </div>
        {selectedParcel && (
          <div className="inline-flex w-fit items-center gap-2 rounded-md border border-emerald-300/30 bg-emerald-950/90 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
            <MapPin className="h-3.5 w-3.5 text-amber-300" />
            {selectedParcel.cropLandType} · {Math.round(selectedParcel.areaSquareMeter).toLocaleString()}㎡
          </div>
        )}
      </div>

      <div className="pointer-events-auto flex max-w-[min(430px,calc(100vw-1.5rem))] flex-col items-end gap-2">
        <div className="flex flex-wrap justify-end gap-1 rounded-lg border border-slate-200/80 bg-white/95 p-1.5 shadow-lg backdrop-blur-md">
          <MapModeButton
            active={baseLayer === "SATELLITE"}
            icon={Satellite}
            label="항공"
            onClick={() => onBaseLayerChange("SATELLITE")}
          />
          <MapModeButton
            active={baseLayer === "STREET"}
            icon={Map}
            label="일반"
            onClick={() => onBaseLayerChange("STREET")}
          />
          <button
            type="button"
            aria-pressed={farmMapVisible}
            onClick={() => onFarmMapVisibilityChange(!farmMapVisible)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition-colors",
              farmMapVisible
                ? "bg-emerald-700 text-white"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            <Layers3 className="h-3.5 w-3.5" />
            팜맵 경계
          </button>
        </div>

        <div
          aria-label="경지 구분 필터"
          className="w-full rounded-lg border border-slate-200/85 bg-white/95 p-2 shadow-lg backdrop-blur-md"
        >
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-slate-800">경지 구분</span>
            <button
              type="button"
              onClick={onShowAllLandTypes}
              className="h-6 rounded-md px-2 text-[10px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              전체
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {landTypeLegend.map((item) => (
              <button
                key={item.landType}
                type="button"
                aria-pressed={item.visible}
                onClick={() => onToggleLandType(item.landType)}
                className={cn(
                  "flex h-8 min-w-0 items-center gap-1.5 rounded-md border px-2 text-[11px] font-bold transition-colors",
                  item.visible
                    ? "border-slate-300 bg-slate-50 text-slate-900"
                    : "border-transparent text-slate-400 hover:bg-slate-50",
                )}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-[3px] border-2"
                  style={{
                    backgroundColor: item.visible ? item.fillColor : "transparent",
                    borderColor: item.strokeColor,
                  }}
                />
                <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                <span className="shrink-0 tabular-nums text-slate-500">{item.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>

    <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex max-w-[calc(100%-5rem)] items-center gap-2 rounded-md border border-white/70 bg-white/92 px-3 py-2 text-xs font-medium text-slate-700 shadow-lg backdrop-blur-md">
      <MousePointer2 className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
      {interactionHint ??
        (canSelectLocation
          ? "색상별 필지 경계를 선택하거나 지도 위치를 클릭하세요."
          : "필지 조회가 끝날 때까지 기다리세요.")}
    </div>
  </>
);

const MapModeButton = ({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Map;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition-colors",
      active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
    )}
  >
    <Icon className="h-3.5 w-3.5" />
    {label}
  </button>
);
