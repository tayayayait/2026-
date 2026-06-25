import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { geocodeAddress } from "@/integrations/naverMaps/geocode";
import { searchOfficialFarmMapAddress } from "@/integrations/farmMap/address-search";
import { normalizeAddressCandidate } from "@/domains/farms/registration";

export const getCoordinatesForAddress = createServerFn({ method: "GET" })
  .validator((data: { query: string }) => z.object({ query: z.string() }).parse(data))
  .handler(async ({ data }) => {
    try {
      const response = await geocodeAddress(data.query);
      const firstMatch = response.addresses[0];

      if (!firstMatch) {
        return { ok: false, error: "검색 결과가 없습니다." };
      }

      return {
        ok: true,
        data: {
          lat: Number.parseFloat(firstMatch.y),
          lng: Number.parseFloat(firstMatch.x),
          roadAddress: firstMatch.roadAddress,
          jibunAddress: firstMatch.jibunAddress,
        },
      };
    } catch (error) {
      console.error("Geocoding failed:", error);
      return { ok: false, error: "주소 좌표 변환에 실패했습니다." };
    }
  });

export const searchAddressCandidates = createServerFn({ method: "GET" })
  .validator((data: { query: string; type?: "PARCEL" | "ROAD" }) =>
    z
      .object({
        query: z.string().min(2),
        type: z.enum(["PARCEL", "ROAD"]).default("PARCEL"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const response = await searchOfficialFarmMapAddress(data.query, data.type);
      const candidates = response.addresses
        .slice(0, 5)
        .map((address, index) => normalizeAddressCandidate(address, index));

      if (candidates.length === 0) {
        return {
          ok: false,
          error: "입력한 주소를 찾을 수 없습니다. 읍면동과 번지를 함께 입력하세요.",
        };
      }

      return {
        ok: true,
        data: {
          candidates,
          tooMany: (response.meta?.totalCount ?? response.addresses.length) > 5,
        },
      };
    } catch (error) {
      console.error("Address candidate search failed:", error);
      return { ok: false, error: "주소 검색에 실패했습니다. 잠시 후 다시 시도하세요." };
    }
  });
