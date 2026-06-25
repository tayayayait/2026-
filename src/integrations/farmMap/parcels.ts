import { buildFallbackFarmMapParcel } from "../../domains/farms/registration";
import type { FarmMapParcelSearchResult } from "../../domains/farms/types";
import { readOptionalServerEnv } from "../openapi";
import {
  buildFarmMapRadiusUrl,
  buildFarmMapPointUrl,
  buildFarmMapPnuUrl,
  normalizeFarmMapRadiusPayload,
  parseFarmMapJsonp,
} from "./farmmap-contract";
import type { FarmMapParcelLookupInput } from "./farmmap-contract";

const fallbackResult = (
  input: FarmMapParcelLookupInput,
  warning: string,
): FarmMapParcelSearchResult => ({
  status: "FALLBACK",
  parcels: [
    buildFallbackFarmMapParcel({
      lat: input.lat,
      lng: input.lng,
      representativeAddress: input.representativeAddress,
    }),
  ],
  warning,
});

export const lookupFarmMapParcels = async (
  input: FarmMapParcelLookupInput,
): Promise<FarmMapParcelSearchResult> => {
  const apiKey = readOptionalServerEnv({ source: "FARMMAP", names: ["FARMMAP_API_KEY"] });
  const domain = readOptionalServerEnv({
    source: "FARMMAP",
    names: ["FARMMAP_API_DOMAIN", "FARMMAP_DOMAIN"],
  });
  const endpoint = readOptionalServerEnv({
    source: "FARMMAP",
    names: ["FARMMAP_API_BASE_URL"],
  });

  if (!apiKey || !domain) {
    return fallbackResult(
      input,
      "FarmMap API 인증키 또는 등록 도메인이 설정되지 않아 좌표 기준으로 분석합니다.",
    );
  }

  try {
    const requestUrl =
      input.lookupMode === "PNU"
        ? buildFarmMapPnuUrl(apiKey, domain, input)
        : input.lookupMode === "POINT"
          ? buildFarmMapPointUrl(apiKey, domain, input)
          : buildFarmMapRadiusUrl(apiKey, domain, input, endpoint ?? undefined);
    const response = await fetch(requestUrl, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return fallbackResult(input, `FarmMap API HTTP 오류: ${response.status}`);
    return normalizeFarmMapRadiusPayload(parseFarmMapJsonp(await response.text()), input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 FarmMap API 오류";
    return fallbackResult(input, message);
  }
};
