import type { WorkType } from "../shared/types";
import type { MachineCategory, MachineType } from "./types";

export const WORK_TO_MACHINE: Record<WorkType, MachineType[]> = {
  방제: ["DRONE", "TRACTOR", "OTHER"],
  관수: ["OTHER", "TRACTOR"],
  배수: ["OTHER", "TRACTOR"],
  수확: ["COMBINE", "TRACTOR"],
  파종: ["PLANTER", "TRACTOR"],
  정식: ["PLANTER", "TRACTOR"],
  "경운/정지": ["TRACTOR", "CULTIVATOR"],
  제초: ["CULTIVATOR", "TRACTOR"],
};

export const WORK_TO_MACHINE_CATEGORY: Record<WorkType, MachineCategory[]> = {
  방제: ["TRACTOR_EQUIPMENT"],
  관수: [],
  배수: [],
  수확: ["TRACTOR_EQUIPMENT", "ROOT_CROP_HARVESTER", "THRESHER_SORTER", "RICE_HARVEST_TRANSPORT"],
  파종: ["TRACTOR_EQUIPMENT", "SELF_PROPELLED_PLANTER"],
  정식: ["TRACTOR_EQUIPMENT", "TRANSPLANTER_EQUIPMENT"],
  "경운/정지": ["TRACTOR_EQUIPMENT", "CULTIVATOR_EQUIPMENT", "MANAGER_EQUIPMENT"],
  제초: ["TRACTOR_EQUIPMENT", "CULTIVATOR_EQUIPMENT", "MANAGER_EQUIPMENT"],
};

export const getRequiredMachineTypes = (tasks: WorkType[]): MachineType[] => {
  const types = new Set<MachineType>();
  for (const task of tasks) {
    for (const type of WORK_TO_MACHINE[task] || []) {
      types.add(type);
    }
  }
  return Array.from(types);
};
