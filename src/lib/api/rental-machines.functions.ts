import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createOdcloudRentalContexts,
  fetchOdcloudRentalMachines,
  fetchPublicRentalCenters,
  mergeRentalData,
} from "@/integrations/rentalMachines/rental-machines";
import { calculateDistanceKm, recommendMachines } from "@/domains/machines/recommender";
import { SAMPLE_RENTALS } from "@/data/demo";
import type { Rental } from "@/domains/machines/types";
import type { WorkType } from "@/domains/shared/types";

const WorkTypeSchema = z.enum([
  "방제",
  "관수",
  "배수",
  "수확",
  "파종",
  "정식",
  "경운/정지",
  "제초",
]);

interface RentalLoadResult {
  rentals: Rental[];
  source: "PUBLIC_DATA_ODCLOUD" | "PUBLIC_DATA" | "ODCLOUD" | "SAMPLE_FALLBACK";
  warning?: string;
}

const createSampleRentalFallback = (): Rental[] =>
  SAMPLE_RENTALS.map((rental) => ({
    ...rental,
    machines: rental.machines.map((machine) => ({
      ...machine,
      status: "REQUEST_ONLY",
      availabilityBasis: "DEMO",
    })),
  }));

const loadRentalCenters = async (): Promise<RentalLoadResult> => {
  let publicRentals: Rental[] = [];
  let publicError: unknown = null;
  let odcloudRentals: Rental[] = [];
  let odcloudError: unknown = null;

  try {
    publicRentals = await fetchPublicRentalCenters({ numOfRows: 1000 });
  } catch (error) {
    publicError = error;
    console.error("Public rental API failed:", error);
  }

  try {
    odcloudRentals = await fetchOdcloudRentalMachines(
      { perPage: 1000 },
      createOdcloudRentalContexts(publicRentals),
    );
  } catch (error) {
    odcloudError = error;
    console.error("ODCloud rental machine API failed:", error);
  }

  const rentals = mergeRentalData(publicRentals, odcloudRentals);
  if (rentals.length > 0) {
    const source =
      publicRentals.length > 0 && odcloudRentals.length > 0
        ? "PUBLIC_DATA_ODCLOUD"
        : publicRentals.length > 0
          ? "PUBLIC_DATA"
          : "ODCLOUD";
    const warning =
      publicRentals.length > 0 && odcloudError
        ? "ODCloud 농기계 상세 데이터 호출에 실패해 표준 임대사업소 데이터만 사용했습니다."
        : undefined;

    return {
      rentals,
      source,
      warning,
    };
  }

  const warning = publicError
    ? "농기계 임대 API 호출에 실패해 샘플 데이터를 사용했습니다."
    : "공공데이터 응답에 사용할 수 있는 임대사업소가 없어 샘플 데이터를 사용했습니다.";

  return {
    rentals: createSampleRentalFallback(),
    source: "SAMPLE_FALLBACK",
    warning,
  };
};

export const listRentalCenters = createServerFn({ method: "GET" }).handler(async () => {
  const result = await loadRentalCenters();
  return {
    ok: true,
    data: result.rentals,
    source: result.source,
    warning: result.warning,
  };
});

export const getMachineRecommendations = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        farmLocation: z.object({ lat: z.number(), lng: z.number() }),
        works: z.array(WorkTypeSchema),
        maxDistanceKm: z.number().min(1).max(200).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const result = await loadRentalCenters();
    const maxDistanceKm = data.maxDistanceKm ?? 30;
    const recommendations = recommendMachines(
      data.farmLocation,
      data.works as WorkType[],
      maxDistanceKm,
      result.rentals,
    );
    const rentals = result.rentals.filter(
      (rental) => calculateDistanceKm(data.farmLocation, rental) <= maxDistanceKm,
    );

    return {
      ok: true,
      data: {
        recommendations,
        rentals,
        source: result.source,
        warning: result.warning,
      },
    };
  });
