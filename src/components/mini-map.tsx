import { useEffect, useRef } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type { RiskLevel } from "@/domains/shared/types";

interface Marker {
  lat: number;
  lng: number;
  label: string;
  level?: RiskLevel;
  kind: "farm" | "rental";
}

const RISK_COLORS: Record<RiskLevel, string> = {
  SAFE: "#10b981", // emerald-500
  WATCH: "#eab308", // yellow-500
  WARNING: "#f97316", // orange-500
  CRITICAL: "#ef4444", // red-500
  UNKNOWN: "#94a3b8", // slate-400
};

export function MiniMap({
  markers,
  height = 360,
  legendMode = "risk",
}: {
  markers: Marker[];
  height?: number;
  legendMode?: "risk" | "rental";
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import("leaflet").then((leaflet) => {
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        // Default to Jeonbuk center
        const center: [number, number] = [35.819, 127.108];
        const zoom = 9;

        const map = leaflet.map(containerRef.current, {
          center,
          zoom,
          zoomControl: true,
          attributionControl: false,
        });

        // VWorld base map
        const vworldBaseLayer = leaflet.tileLayer(
          "http://xdworld.vworld.kr:8080/2d/Base/service/{z}/{x}/{y}.png",
          { maxZoom: 19 },
        );

        const farmMapWmsLayer = leaflet.tileLayer.wms("/api/farm-map/wms", {
          version: "1.1.1",
          layers: "farm_map_api",
          styles: "01",
          format: "image/png",
          transparent: true,
          crs: leaflet.CRS.EPSG3857,
          minZoom: 12,
          maxZoom: 19,
          opacity: 0.65,
        });

        vworldBaseLayer.addTo(map);
        farmMapWmsLayer.addTo(map);

        mapRef.current = map;
        markerLayerRef.current = leaflet.layerGroup().addTo(map);
      }

      const map = mapRef.current;
      const markerLayer = markerLayerRef.current;
      if (!map || !markerLayer) return;

      markerLayer.clearLayers();

      const latLngs: [number, number][] = [];

      for (const m of markers) {
        latLngs.push([m.lat, m.lng]);

        if (m.kind === "rental") {
          const icon = leaflet.divIcon({
            html: `<div style="background:#3b82f6;border:2px solid white;width:12px;height:12px;border-radius:2px;box-shadow:0 1px 2px rgba(0,0,0,0.2);"></div>`,
            className: "",
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          });
          const marker = leaflet.marker([m.lat, m.lng], { icon }).addTo(markerLayer);
          marker.bindTooltip(`<strong>${m.label}</strong>`, {
            permanent: true,
            direction: "right",
            className: "bg-transparent border-0 shadow-none text-xs font-bold text-slate-800",
            offset: [8, 0],
          });
        } else {
          const color = RISK_COLORS[m.level ?? "UNKNOWN"];
          const circle = leaflet.circleMarker([m.lat, m.lng], {
            radius: 7,
            color: "white",
            weight: 2,
            fillColor: color,
            fillOpacity: 0.9,
          });

          circle.addTo(markerLayer);
          circle.bindTooltip(`<strong>${m.label}</strong>`, {
            permanent: true,
            direction: "right",
            className: "bg-transparent border-0 shadow-none text-xs font-bold text-slate-800",
            offset: [6, 0],
          });
        }
      }

      if (latLngs.length > 0) {
        const bounds = leaflet.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: false });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [markers]);

  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    },
    [],
  );

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-border bg-slate-50"
      style={{ height }}
    >
      <div ref={containerRef} className="absolute inset-0 z-0" />
      <div className="absolute bottom-3 left-3 z-[500] flex flex-wrap gap-2 rounded-md border border-white/50 bg-white/95 px-3 py-2 text-[11px] shadow-sm backdrop-blur">
        {legendMode === "risk" ? (
          <>
            {(
              [
                ["SAFE", "안정"],
                ["WATCH", "관심"],
                ["WARNING", "주의"],
                ["CRITICAL", "긴급"],
              ] as const
            ).map(([level, label]) => (
              <span key={level} className="flex items-center gap-1.5 font-medium text-slate-700">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: RISK_COLORS[level] }}
                />
                {label}
              </span>
            ))}
          </>
        ) : (
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: RISK_COLORS.SAFE }} />
            선택 농장
          </span>
        )}
        <span className="flex items-center gap-1.5 border-l pl-3 font-medium text-slate-700">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
          임대사업소
        </span>
      </div>
      <style>{`
        .leaflet-tooltip.bg-transparent {
          background: transparent;
          border: none;
          box-shadow: none;
          text-shadow: 1px 1px 2px white, -1px -1px 2px white, 1px -1px 2px white, -1px 1px 2px white;
        }
      `}</style>
    </div>
  );
}
