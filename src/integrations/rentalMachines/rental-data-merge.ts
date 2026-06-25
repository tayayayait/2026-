import type { MachineInventory, Rental } from "../../domains/machines/types";

export interface OdcloudContext {
  lat?: number;
  lng?: number;
  phone?: string;
  region?: string;
  address?: string;
}

const RENTAL_MATCH_STOP_WORDS = [
  "농기계",
  "임대",
  "사업소",
  "임대사업소",
  "농업기술센터",
  "농업기술",
  "센터",
  "분소",
  "본소",
  "지점",
  "출장소",
];

export const normalizeRentalMatchText = (value: string) => {
  let normalized = value.toLowerCase().normalize("NFKC");
  for (const word of RENTAL_MATCH_STOP_WORDS) {
    normalized = normalized.replaceAll(word, "");
  }
  return normalized.replace(/[^\dA-Za-z가-힣]+/g, "");
};

const createRentalMatchTokens = (rental: Pick<Rental, "name" | "region" | "address">) => {
  const text = [rental.name, rental.region, rental.address].filter(Boolean).join(" ");
  return new Set(
    text
      .normalize("NFKC")
      .split(/[^\dA-Za-z가-힣]+/g)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
      .filter((token) => !RENTAL_MATCH_STOP_WORDS.includes(token)),
  );
};

const scoreRentalMatch = (base: Rental, candidate: Rental) => {
  const baseKey = normalizeRentalMatchText(base.name);
  const candidateKey = normalizeRentalMatchText(candidate.name);
  if (baseKey && candidateKey && baseKey === candidateKey) return 100;
  if (
    baseKey.length >= 4 &&
    candidateKey.length >= 4 &&
    (baseKey.includes(candidateKey) || candidateKey.includes(baseKey))
  ) {
    return 80;
  }

  const candidateTokens = createRentalMatchTokens(candidate);
  let overlap = 0;
  for (const token of createRentalMatchTokens(base)) {
    if (candidateTokens.has(token)) overlap += 1;
  }
  return overlap;
};

const isUsableRentalCoordinate = (rental: Rental) =>
  Number.isFinite(rental.lat) &&
  Number.isFinite(rental.lng) &&
  Math.abs(rental.lat) <= 90 &&
  Math.abs(rental.lng) <= 180 &&
  !(rental.lat === 0 && rental.lng === 0);

const cloneRental = (rental: Rental): Rental => ({
  ...rental,
  machines: rental.machines.map((machine) => ({ ...machine })),
});

const appendMachines = (
  current: MachineInventory[],
  incoming: MachineInventory[],
): MachineInventory[] => {
  const ids = new Set(current.map((machine) => machine.id));
  const additions = incoming.filter((machine) => {
    if (ids.has(machine.id)) return false;
    ids.add(machine.id);
    return true;
  });
  return [...current, ...additions.map((machine) => ({ ...machine }))];
};

export const createOdcloudRentalContexts = (rentals: Rental[]): Record<string, OdcloudContext> => {
  const contexts: Record<string, OdcloudContext> = {};

  for (const rental of rentals) {
    const context: OdcloudContext = {
      lat: rental.lat,
      lng: rental.lng,
      phone: rental.phone,
      region: rental.region,
      address: rental.address,
    };
    contexts[rental.name] = context;
    contexts[normalizeRentalMatchText(rental.name)] = context;
  }

  return contexts;
};

export const mergeRentalData = (publicRentals: Rental[], odcloudRentals: Rental[]): Rental[] => {
  const merged = publicRentals.map(cloneRental);

  for (const odcloudRental of odcloudRentals) {
    let bestMatch: Rental | null = null;
    let bestScore = 0;

    for (const publicRental of merged) {
      const score = scoreRentalMatch(publicRental, odcloudRental);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = publicRental;
      }
    }

    if (bestMatch && bestScore >= 2) {
      bestMatch.machines = appendMachines(bestMatch.machines, odcloudRental.machines);
      continue;
    }

    merged.push(cloneRental(odcloudRental));
  }

  return merged.filter((rental) => publicRentals.length === 0 || isUsableRentalCoordinate(rental));
};
