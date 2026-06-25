import { useState, useEffect, useRef } from "react";
import type { FarmMapParcel, FarmMapCoordinate, FarmParcelRaw } from "@/domains/farms/types";
import { normalizeCropLandType } from "@/domains/farms/registration";

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

const calculateCentroidFromCoordinates = (coordinates: any[]): FarmMapCoordinate => {
  try {
    // GeoJSON coordinates can be deeply nested.
    // Polygon: [[[lng, lat], ...]]
    // MultiPolygon: [[[[lng, lat], ...]]]
    const flatCoords: [number, number][] = [];
    
    const flatten = (arr: any[]) => {
      if (arr.length === 2 && typeof arr[0] === "number" && typeof arr[1] === "number") {
        flatCoords.push([arr[0], arr[1]]);
      } else if (Array.isArray(arr)) {
        for (const item of arr) {
          flatten(item);
        }
      }
    };
    
    flatten(coordinates);
    
    if (flatCoords.length === 0) return { lat: 0, lng: 0 };
    
    const lats = flatCoords.map(c => c[1]);
    const lngs = flatCoords.map(c => c[0]);
    
    return {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    };
  } catch (e) {
    return { lat: 0, lng: 0 };
  }
};

export function useFarmMapWfs(bbox: BoundingBox | null, zoom: number) {
  const [parcels, setParcels] = useState<FarmMapParcel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use a ref to keep track of the latest bbox request to prevent race conditions
  const requestRef = useRef<string>("");

  useEffect(() => {
    // Only fetch WFS data if zoom is high enough to not overload the server
    // and if bbox is valid.
    if (!bbox || zoom < 14) {
      if (zoom < 14 && parcels.length > 0) {
        setParcels([]); // Clear parcels if zoomed out
      }
      return;
    }

    const bboxString = `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`;
    if (requestRef.current === bboxString) {
      return; // Already fetched or fetching this bbox
    }
    
    requestRef.current = bboxString;
    const currentRequest = bboxString;
    
    const fetchWfsData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/farm-map/wfs?bbox=${bboxString}`);
        if (!response.ok) {
          throw new Error("Failed to fetch WFS data");
        }
        
        const data = await response.json();
        
        // If we made a new request in the meantime, ignore this response
        if (requestRef.current !== currentRequest) return;

        if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
          const parsedParcels: FarmMapParcel[] = data.features.map((feature: any, index: number) => {
            const props = feature.properties || {};
            const geometry = feature.geometry || {};
            
            // Map GeoJSON geometry to our FarmMapPolygon format
            let mappedGeometry = null;
            if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
              const coordinates = geometry.coordinates;
              // Extract rings based on GeoJSON format
              let rings: FarmMapCoordinate[][] = [];
              
              if (geometry.type === "Polygon") {
                rings = coordinates.map((ring: any[]) => 
                  ring.map((c: any[]) => ({ lng: c[0], lat: c[1] }))
                );
              } else if (geometry.type === "MultiPolygon") {
                rings = coordinates.flatMap((polygon: any[]) => 
                  polygon.map((ring: any[]) => 
                    ring.map((c: any[]) => ({ lng: c[0], lat: c[1] }))
                  )
                );
              }
              
              mappedGeometry = {
                type: "Polygon" as const,
                coordinates: rings
              };
            }
            
            const area = Number.parseFloat(props.area || props.fl_ar || "0");
            
            return {
              farmMapId: props.id || props.pnu || `wfs-${index}`,
              pnu: props.pnu || null,
              representativeAddress: props.stdg_addr || "",
              legalDongAddress: props.stdg_addr || null,
              landCategory: props.ldcg_cd || null,
              cropLandType: normalizeCropLandType(props.clsf_nm || props.fl_nm),
              areaSquareMeter: Number.isFinite(area) ? area : 0,
              cultivatedAreaSquareMeter: null,
              cultivationRatio: null,
              cadastralMatchRate: props.cad_con_ra ? Number.parseFloat(props.cad_con_ra) : null,
              aerialPhotoYear: props.flight_ymd?.substring(0, 4) || null,
              updatedYear: props.updt_ymd?.substring(0, 4) || null,
              geometry: mappedGeometry,
              centroid: calculateCentroidFromCoordinates(geometry.coordinates || []),
              source: "FARMMAP",
              raw: props as FarmParcelRaw,
            } as FarmMapParcel;
          });
          
          setParcels(parsedParcels);
        } else {
          setParcels([]);
        }
      } catch (err) {
        if (requestRef.current === currentRequest) {
          console.error("WFS Fetch Error:", err);
          setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
          // Only clear if we failed
          setParcels([]);
        }
      } finally {
        if (requestRef.current === currentRequest) {
          setLoading(false);
        }
      }
    };
    
    // Add a small debounce delay to avoid fetching while panning quickly
    const timeoutId = setTimeout(fetchWfsData, 300);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [bbox?.minLng, bbox?.minLat, bbox?.maxLng, bbox?.maxLat, zoom, parcels.length]);

  return { parcels, loading, error };
}
