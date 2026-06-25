import type { FarmMapCoordinate, FarmMapParcel } from "./types";

export interface ProjectedFarmMapParcel {
  farmMapId: string;
  rings: { x: number; y: number }[][];
}

export interface FarmParcelMapViewport {
  center: FarmMapCoordinate;
  bounds: {
    southWest: FarmMapCoordinate;
    northEast: FarmMapCoordinate;
  };
}

const DEFAULT_JEONBUK_CENTER: FarmMapCoordinate = { lat: 35.7175, lng: 127.153 };
const SINGLE_POINT_PADDING = 0.0025;

export const createFarmParcelMapViewport = (
  parcels: FarmMapParcel[],
  addressLocation: FarmMapCoordinate | null,
): FarmParcelMapViewport => {
  const parcelPoints = parcels.flatMap(
    (parcel) => parcel.geometry?.coordinates.flat() ?? [parcel.centroid],
  );
  const points = addressLocation ? [addressLocation, ...parcelPoints] : parcelPoints;

  if (points.length === 0) {
    return {
      center: DEFAULT_JEONBUK_CENTER,
      bounds: {
        southWest: { lat: 35.35, lng: 126.45 },
        northEast: { lat: 36.15, lng: 127.65 },
      },
    };
  }

  const latitudes = points.map((point) => point.lat);
  const longitudes = points.map((point) => point.lng);
  const latMin = Math.min(...latitudes);
  const latMax = Math.max(...latitudes);
  const lngMin = Math.min(...longitudes);
  const lngMax = Math.max(...longitudes);

  return {
    center:
      addressLocation ??
      ({
        lat: (latMin + latMax) / 2,
        lng: (lngMin + lngMax) / 2,
      } satisfies FarmMapCoordinate),
    bounds: {
      southWest: {
        lat: latMin === latMax ? latMin - SINGLE_POINT_PADDING : latMin,
        lng: lngMin === lngMax ? lngMin - SINGLE_POINT_PADDING : lngMin,
      },
      northEast: {
        lat: latMin === latMax ? latMax + SINGLE_POINT_PADDING : latMax,
        lng: lngMin === lngMax ? lngMax + SINGLE_POINT_PADDING : lngMax,
      },
    },
  };
};

export const createSelectedFarmParcelMapViewport = (
  parcel: FarmMapParcel,
): FarmParcelMapViewport => {
  const viewport = createFarmParcelMapViewport([parcel], null);
  return {
    ...viewport,
    center: parcel.centroid,
  };
};

export const projectFarmMapParcels = (
  parcels: FarmMapParcel[],
  width: number,
  height: number,
  padding: number,
): ProjectedFarmMapParcel[] => {
  const visible = parcels.filter((parcel) => parcel.geometry?.coordinates.length);
  const coordinates = visible.flatMap((parcel) => parcel.geometry?.coordinates.flat() ?? []);
  if (coordinates.length === 0) return [];

  const latitudes = coordinates.map((point) => point.lat);
  const longitudes = coordinates.map((point) => point.lng);
  const bounds = {
    latMin: Math.min(...latitudes),
    latMax: Math.max(...latitudes),
    lngMin: Math.min(...longitudes),
    lngMax: Math.max(...longitudes),
  };
  const availableWidth = Math.max(1, width - padding * 2);
  const availableHeight = Math.max(1, height - padding * 2);
  const lngSpan = Math.max(bounds.lngMax - bounds.lngMin, Number.EPSILON);
  const latSpan = Math.max(bounds.latMax - bounds.latMin, Number.EPSILON);
  const scale = Math.min(availableWidth / lngSpan, availableHeight / latSpan);
  const contentWidth = lngSpan * scale;
  const contentHeight = latSpan * scale;
  const offsetX = (width - contentWidth) / 2;
  const offsetY = (height - contentHeight) / 2;

  const project = (point: FarmMapCoordinate) => ({
    x: offsetX + (point.lng - bounds.lngMin) * scale,
    y: offsetY + (bounds.latMax - point.lat) * scale,
  });

  return visible.map((parcel) => ({
    farmMapId: parcel.farmMapId,
    rings: parcel.geometry?.coordinates.map((ring) => ring.map(project)) ?? [],
  }));
};
