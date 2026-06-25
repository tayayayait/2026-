import type { WorkType } from "../shared/types";
import { WORK_TO_MACHINE, WORK_TO_MACHINE_CATEGORY } from "./work-mapping";
import type {
  MachineAvailabilityBasis,
  MachineCategory,
  MachineType,
  MachineStatus,
  Rental,
} from "./types";
import { SAMPLE_RENTALS } from "../../data/demo";

export interface RecommendationResult {
  machineId?: string;
  type: MachineType;
  category?: MachineCategory;
  machineName: string;
  rental: Rental;
  status: MachineStatus;
  count: number;
  availabilityBasis?: MachineAvailabilityBasis;
  distanceKm: number;
  reason: string;
  rank: number;
}

export const calculateDistanceKm = (
  first: { lat: number; lng: number },
  second: { lat: number; lng: number },
) => {
  const earthRadiusKm = 6371;
  const dLat = ((second.lat - first.lat) * Math.PI) / 180;
  const dLng = ((second.lng - first.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((first.lat * Math.PI) / 180) *
      Math.cos((second.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

export const recommendMachines = (
  farmLocation: { lat: number; lng: number },
  works: WorkType[],
  maxDistanceKm = 20,
  rentals: Rental[] = SAMPLE_RENTALS,
): RecommendationResult[] => {
  const items: RecommendationResult[] = [];

  for (const rental of rentals) {
    const distanceKm = calculateDistanceKm(farmLocation, rental);
    if (distanceKm > maxDistanceKm) continue;

    for (const machine of rental.machines) {
      const reason = works.find((work) =>
        machine.category
          ? WORK_TO_MACHINE_CATEGORY[work].includes(machine.category)
          : WORK_TO_MACHINE[work].includes(machine.type),
      );
      if (!reason) continue;
      let baseRank = 0;

      if (machine.status === "AVAILABLE") baseRank = 100;
      else if (machine.status === "LIMITED") baseRank = 60;
      else if (machine.status === "REQUEST_ONLY" || machine.status === "UNKNOWN") baseRank = 30;
      else baseRank = -100;

      const distancePenalty = distanceKm * 2;
      const countBonus = Math.min(machine.count, 5);
      const rank = baseRank - distancePenalty + countBonus;

      if (rank > 0) {
        items.push({
          machineId: machine.id,
          type: machine.type,
          category: machine.category,
          machineName: machine.name,
          rental,
          status: machine.status,
          count: machine.count,
          availabilityBasis: machine.availabilityBasis,
          distanceKm,
          reason: `${reason} 작업 권장`,
          rank,
        });
      }
    }
  }

  return items.sort((a, b) => b.rank - a.rank);
};
