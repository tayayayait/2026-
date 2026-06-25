export type MachineType = "TRACTOR" | "COMBINE" | "DRONE" | "PLANTER" | "CULTIVATOR" | "OTHER";
export type MachineCategory =
  | "TRACTOR_EQUIPMENT"
  | "CULTIVATOR_EQUIPMENT"
  | "MANAGER_EQUIPMENT"
  | "ROOT_CROP_HARVESTER"
  | "THRESHER_SORTER"
  | "SELF_PROPELLED_PLANTER"
  | "TRANSPLANTER_EQUIPMENT"
  | "RICE_HARVEST_TRANSPORT"
  | "OTHER_RENTAL_INFO";
export type MachineStatus = "AVAILABLE" | "LIMITED" | "REQUEST_ONLY" | "UNKNOWN" | "UNAVAILABLE";
export type MachineAvailabilityBasis = "HOLDING_COUNT" | "HOLDING_INFO" | "RENTAL_STATUS" | "DEMO";
export type RentalDataSource =
  | "PUBLIC_DATA_ODCLOUD"
  | "PUBLIC_DATA"
  | "ODCLOUD"
  | "SAMPLE_FALLBACK";

export interface MachineInventory {
  id: string;
  type: MachineType;
  category?: MachineCategory;
  name: string;
  status: MachineStatus;
  count: number;
  holdingText?: string;
  availabilityBasis?: MachineAvailabilityBasis;
}

export interface MachineScore {
  machineId: string;
  score: number;
  distanceKm: number;
  factors: {
    taskFit: number;
    distanceScore: number;
    availabilityScore: number;
    weatherWindowScore: number;
    urgencyScore: number;
  };
}

export interface Rental {
  id: string;
  name: string;
  address?: string;
  institutionName?: string;
  institutionCode?: string;
  referenceDate?: string;
  region: string;
  lat: number;
  lng: number;
  phone?: string;
  machines: MachineInventory[];
}
