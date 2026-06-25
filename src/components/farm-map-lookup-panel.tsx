import { AlertTriangle, CheckCircle2, Loader2, MapPin, RefreshCw, Ruler } from "lucide-react";
import { FarmParcelBoundaryMap } from "@/components/farm-parcel-boundary-map";
import { FARMMAP_RADIUS_OPTIONS } from "@/domains/farms/registration";
import type { FarmMapCoordinate, FarmMapParcel } from "@/domains/farms/types";
import { cn } from "@/lib/utils";

export type FarmMapLookupStatus =
  | "WAITING_ADDRESS"
  | "LOADING"
  | "SUCCESS"
  | "FALLBACK"
  | "NOT_FOUND";

interface FarmMapLookupPanelProps {
  status: FarmMapLookupStatus;
  radiusMeters: number;
  canLookup: boolean;
  canSelectLocation: boolean;
  loading: boolean;
  warning: string | null;
  parcels: FarmMapParcel[];
  selectedParcelId: string | null;
  parcelFocusRequest: number;
  addressLocation: FarmMapCoordinate | null;
  onRadiusChange: (radiusMeters: number) => void;
  onRetry: () => void;
  onSelectLocation: (location: FarmMapCoordinate) => void;
  onSelectParcel: (parcel: FarmMapParcel) => void;
  showRadiusControls?: boolean;
  showParcelList?: boolean;
  heightClassName?: string;
}

export function FarmMapLookupPanel({
  status,
  radiusMeters,
  canLookup,
  canSelectLocation,
  loading,
  warning,
  parcels,
  selectedParcelId,
  parcelFocusRequest,
  addressLocation,
  onRadiusChange,
  onRetry,
  onSelectLocation,
  onSelectParcel,
  showRadiusControls = true,
  showParcelList = true,
  heightClassName = "h-[calc(100vh-4rem)] min-h-[620px]",
}: FarmMapLookupPanelProps) {
  return (
    <section className={cn("relative overflow-hidden", heightClassName)}>
      <FarmParcelBoundaryMap
        parcels={parcels}
        selectedParcelId={selectedParcelId}
        addressLocation={addressLocation}
        loading={loading}
        canSelectLocation={canSelectLocation}
        onMapClick={onSelectLocation}
        onSelect={onSelectParcel}
        fullHeight
        focusRequest={parcelFocusRequest}
      />

      {showRadiusControls && (
        <div className="absolute left-3 top-16 z-[600] flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 rounded-lg border border-white/80 bg-white/95 p-2 shadow-xl backdrop-blur-md">
          <span className="inline-flex items-center gap-1.5 px-1 text-xs font-black text-slate-800">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
            ) : (
              <Ruler className="h-4 w-4 text-emerald-700" />
            )}
            {status === "NOT_FOUND" ? "필지 없음" : loading ? "팜맵 조회 중" : "조회 반경"}
          </span>
          <div className="flex items-center gap-1 rounded-md bg-slate-100 p-1">
            {FARMMAP_RADIUS_OPTIONS.map((radius) => (
              <button
                key={radius}
                type="button"
                disabled={!canLookup || loading}
                onClick={() => onRadiusChange(radius)}
                className={cn(
                  "h-7 rounded px-2 text-[11px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-35",
                  radiusMeters === radius
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-slate-500 hover:bg-white hover:text-slate-900",
                )}
              >
                {radius}m
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!canLookup || loading}
            onClick={onRetry}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            재조회
          </button>
        </div>
      )}

      {warning && (
        <div className="absolute left-3 top-[7.5rem] z-[600] flex max-w-md items-start gap-2 rounded-md border border-amber-200 bg-amber-50/95 p-3 text-xs leading-5 text-amber-900 shadow-lg backdrop-blur-md">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      {showParcelList && parcels.length > 0 && (
        <aside className="absolute bottom-12 right-3 z-[600] w-[min(330px,calc(100%-1.5rem))] overflow-hidden rounded-xl border border-white/80 bg-white/95 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-black text-slate-950">조회 필지</h3>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
              {parcels.length}개
            </span>
          </div>
          <div className="max-h-[34vh] overflow-y-auto p-2">
            {parcels.map((parcel) => (
              <ParcelRow
                key={parcel.farmMapId}
                parcel={parcel}
                selected={selectedParcelId === parcel.farmMapId}
                onSelect={() => onSelectParcel(parcel)}
              />
            ))}
          </div>
        </aside>
      )}
    </section>
  );
}

function ParcelRow({
  parcel,
  selected,
  onSelect,
}: {
  parcel: FarmMapParcel;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "mb-1 flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors last:mb-0",
        selected
          ? "border-emerald-600 bg-emerald-50"
          : "border-transparent hover:border-slate-200 hover:bg-slate-50",
      )}
    >
      {selected ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
      ) : (
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      )}
      <span className="min-w-0">
        <span className="block truncate text-xs font-bold text-slate-900">
          {parcel.representativeAddress}
        </span>
        <span className="mt-1 block text-[11px] text-slate-500">
          {parcel.cropLandType} · {Math.round(parcel.areaSquareMeter).toLocaleString()}㎡
        </span>
      </span>
    </button>
  );
}
