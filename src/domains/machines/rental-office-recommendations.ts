import { calculateDistanceKm, type RecommendationResult } from "./recommender";
import type { MachineCategory, MachineInventory, Rental } from "./types";

export interface RentalOfficeRecommendation {
  rental: Rental;
  distanceKm: number;
  priorityRank: number;
  recommendations: RecommendationResult[];
}

export type RentalOfficeSort = "PRIORITY" | "DISTANCE";

interface RentalOfficeSelection {
  maxDistanceKm: number;
  machineName?: string;
  machineCategory?: MachineCategory;
  sortBy: RentalOfficeSort;
}

const getMachineMatchKey = (rentalId: string, machine: MachineInventory) =>
  `${rentalId}:${machine.type}:${machine.name}`;

export const buildRentalOfficeRecommendations = (
  farmLocation: { lat: number; lng: number },
  rentals: Rental[],
  recommendations: RecommendationResult[],
): RentalOfficeRecommendation[] => {
  const recommendationById = new Map<string, RecommendationResult>();
  const recommendationByName = new Map<string, RecommendationResult>();

  for (const recommendation of recommendations) {
    if (recommendation.machineId) {
      recommendationById.set(
        `${recommendation.rental.id}:${recommendation.machineId}`,
        recommendation,
      );
    }
    recommendationByName.set(
      `${recommendation.rental.id}:${recommendation.type}:${recommendation.machineName}`,
      recommendation,
    );
  }

  return rentals
    .flatMap<RentalOfficeRecommendation>((rental) => {
      if (rental.machines.length === 0) return [];
      const distanceKm = calculateDistanceKm(farmLocation, rental);
      const inventory = rental.machines.map<RecommendationResult>((machine) => {
        const matched =
          recommendationById.get(`${rental.id}:${machine.id}`) ??
          recommendationByName.get(getMachineMatchKey(rental.id, machine));
        if (matched) return matched;

        return {
          machineId: machine.id,
          type: machine.type,
          category: machine.category,
          machineName: machine.name,
          rental,
          status: machine.status,
          count: machine.count,
          availabilityBasis: machine.availabilityBasis,
          distanceKm,
          reason: "공공데이터 보유정보",
          rank: 0,
        };
      });

      return [
        {
          rental,
          distanceKm,
          priorityRank: Math.max(0, ...inventory.map((item) => item.rank)),
          recommendations: inventory,
        },
      ];
    })
    .sort((a, b) => b.priorityRank - a.priorityRank || a.distanceKm - b.distanceKm);
};

export const groupRentalOfficeRecommendations = (
  recommendations: RecommendationResult[],
): RentalOfficeRecommendation[] => {
  const offices = new Map<string, RentalOfficeRecommendation>();

  for (const recommendation of recommendations) {
    const current = offices.get(recommendation.rental.id);
    if (!current) {
      offices.set(recommendation.rental.id, {
        rental: recommendation.rental,
        distanceKm: recommendation.distanceKm,
        priorityRank: recommendation.rank,
        recommendations: [recommendation],
      });
      continue;
    }

    current.distanceKm = Math.min(current.distanceKm, recommendation.distanceKm);
    current.priorityRank = Math.max(current.priorityRank, recommendation.rank);
    current.recommendations.push(recommendation);
  }

  return [...offices.values()].sort((a, b) => b.priorityRank - a.priorityRank);
};

export const selectRentalOfficeRecommendations = (
  offices: RentalOfficeRecommendation[],
  selection: RentalOfficeSelection,
): RentalOfficeRecommendation[] => {
  const selected = offices.flatMap((office) => {
    if (office.distanceKm > selection.maxDistanceKm) return [];
    if (!selection.machineName && !selection.machineCategory) return [office];

    const recommendations = office.recommendations.filter(
      (recommendation) =>
        (!selection.machineCategory || recommendation.category === selection.machineCategory) &&
        (!selection.machineName || recommendation.machineName === selection.machineName),
    );
    if (recommendations.length === 0) return [];

    return [
      {
        ...office,
        priorityRank: Math.max(...recommendations.map((recommendation) => recommendation.rank)),
        recommendations,
      },
    ];
  });

  return [...selected].sort((a, b) => {
    if (selection.sortBy === "DISTANCE") return a.distanceKm - b.distanceKm;
    return b.priorityRank - a.priorityRank || a.distanceKm - b.distanceKm;
  });
};
