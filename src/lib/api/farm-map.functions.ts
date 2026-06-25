import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_FARMMAP_RADIUS_METERS } from "@/domains/farms/registration";
import { farmParcelSearchRequestSchema } from "@/domains/farms/parcel-search-contract";
import { lookupFarmMapParcels } from "@/integrations/farmMap/parcels";
import { searchFarmMapParcels } from "@/integrations/farmMap/parcel-search-service";

export const searchFarmParcelCandidates = createServerFn({ method: "GET" })
  .validator((data: unknown) => farmParcelSearchRequestSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      return { ok: true, data: await searchFarmMapParcels(data) };
    } catch (error) {
      console.error("FarmMap advanced parcel search failed:", error);
      return { ok: false, error: "팜맵 필지 검색에 실패했습니다." };
    }
  });

export const getFarmMapParcels = createServerFn({ method: "GET" })
  .validator(
    (data: {
      lat: number;
      lng: number;
      representativeAddress: string;
      lookupMode?: "RADIUS" | "POINT";
      radiusMeters?: number;
    }) =>
      z
        .object({
          lat: z.number(),
          lng: z.number(),
          representativeAddress: z.string().min(1),
          lookupMode: z.enum(["RADIUS", "POINT"]).optional(),
          radiusMeters: z.number().min(1).max(3000).optional(),
        })
        .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const result = await lookupFarmMapParcels({
        lat: data.lat,
        lng: data.lng,
        representativeAddress: data.representativeAddress,
        lookupMode: data.lookupMode ?? "RADIUS",
        radiusMeters: data.radiusMeters ?? DEFAULT_FARMMAP_RADIUS_METERS,
      });

      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      console.error("FarmMap lookup failed:", error);
      return { ok: false, error: "팜맵 필지 조회에 실패했습니다." };
    }
  });
