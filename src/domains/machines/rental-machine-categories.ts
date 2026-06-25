import type { MachineCategory, MachineType } from "./types";

export interface RentalMachineCategoryOption {
  value: MachineCategory;
  type: MachineType;
  label: string;
}

export const RENTAL_MACHINE_CATEGORY_OPTIONS = [
  { value: "TRACTOR_EQUIPMENT", type: "TRACTOR", label: "트랙터 및 작업기" },
  { value: "CULTIVATOR_EQUIPMENT", type: "CULTIVATOR", label: "경운기 및 작업기" },
  { value: "MANAGER_EQUIPMENT", type: "CULTIVATOR", label: "관리기 및 작업기" },
  { value: "ROOT_CROP_HARVESTER", type: "OTHER", label: "땅속작물 수확기" },
  { value: "THRESHER_SORTER", type: "OTHER", label: "탈곡기 및 정선작업기" },
  { value: "SELF_PROPELLED_PLANTER", type: "PLANTER", label: "자주형 파종기" },
  { value: "TRANSPLANTER_EQUIPMENT", type: "PLANTER", label: "이앙 작업기" },
  { value: "RICE_HARVEST_TRANSPORT", type: "COMBINE", label: "벼 수확 및 운반 작업기" },
  { value: "OTHER_RENTAL_INFO", type: "OTHER", label: "기타 임대 농기계" },
] as const satisfies readonly RentalMachineCategoryOption[];

const categoryDefinitions = Object.fromEntries(
  RENTAL_MACHINE_CATEGORY_OPTIONS.map((option) => [option.value, option]),
) as Record<MachineCategory, RentalMachineCategoryOption>;

export const getRentalMachineCategoryDefinition = (category: MachineCategory) =>
  categoryDefinitions[category];
