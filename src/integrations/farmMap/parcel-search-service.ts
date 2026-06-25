import type { FarmParcelSearchRequest } from "@/domains/farms/parcel-search-contract";
import type {
  FarmMapParcelSearchResult,
  FarmParcelCandidateSearchResult,
} from "@/domains/farms/types";
import { searchAdvancedFarmMapParcels } from "./advanced-parcel-search";
import { lookupFarmMapParcels } from "./parcels";

type CoordinateSearchRequest = Extract<FarmParcelSearchRequest, { mode: "RADIUS" | "POINT" }>;
type AdvancedSearchRequest = Extract<FarmParcelSearchRequest, { mode: "PNU" | "REGION" }>;

interface ParcelSearchDependencies {
  lookupCoordinate: (input: {
    lat: number;
    lng: number;
    representativeAddress: string;
    lookupMode: "RADIUS" | "POINT";
    radiusMeters?: number;
  }) => Promise<FarmMapParcelSearchResult>;
  lookupAdvanced: (
    request: AdvancedSearchRequest,
  ) => Promise<FarmParcelCandidateSearchResult>;
}

const defaultDependencies: ParcelSearchDependencies = {
  lookupCoordinate: lookupFarmMapParcels,
  lookupAdvanced: searchAdvancedFarmMapParcels,
};

const searchCoordinate = async (
  request: CoordinateSearchRequest,
  lookup: ParcelSearchDependencies["lookupCoordinate"],
): Promise<FarmParcelCandidateSearchResult> => {
  const result = await lookup({
    lat: request.lat,
    lng: request.lng,
    representativeAddress: request.representativeAddress,
    lookupMode: request.mode,
    ...(request.mode === "RADIUS" ? { radiusMeters: request.radiusMeters } : {}),
  });
  return {
    status: result.status,
    candidates: result.parcels,
    warning: result.warning,
  };
};

export const searchFarmMapParcels = async (
  request: FarmParcelSearchRequest,
  dependencies: ParcelSearchDependencies = defaultDependencies,
): Promise<FarmParcelCandidateSearchResult> => {
  if (request.mode === "RADIUS" || request.mode === "POINT") {
    return searchCoordinate(request, dependencies.lookupCoordinate);
  }
  return dependencies.lookupAdvanced(request);
};
