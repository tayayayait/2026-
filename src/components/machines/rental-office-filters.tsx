import { SlidersHorizontal, X } from "lucide-react";
import type { RentalMachineCategoryOption } from "@/domains/machines/rental-machine-categories";
import type { MachineCategory } from "@/domains/machines/types";

interface RentalOfficeFiltersProps {
  machineOptions: readonly RentalMachineCategoryOption[];
  maxDistanceKm: number;
  selectedMachineCategory: MachineCategory | "";
  onDistanceChange: (distance: number) => void;
  onMachineChange: (category: MachineCategory | "") => void;
}

const DISTANCES = [10, 30, 50] as const;

export const RentalOfficeFilters = ({
  machineOptions,
  maxDistanceKm,
  selectedMachineCategory,
  onDistanceChange,
  onMachineChange,
}: RentalOfficeFiltersProps) => (
  <div className="grid gap-4 rounded-2xl border bg-white p-4 shadow-[0_16px_44px_-36px_rgba(16,61,44,0.5)] md:grid-cols-[auto_minmax(180px,1fr)] md:items-end">
    <fieldset>
      <legend className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#315c49]">
        <SlidersHorizontal className="h-3.5 w-3.5" /> 직선거리
      </legend>
      <div className="flex rounded-lg bg-[#eef3ef] p-1">
        {DISTANCES.map((distance) => (
          <button
            key={distance}
            type="button"
            aria-pressed={maxDistanceKm === distance}
            onClick={() => onDistanceChange(distance)}
            className={`min-w-16 rounded-md px-3 py-2 text-xs font-bold transition-all ${
              maxDistanceKm === distance
                ? "bg-white text-[#123d2d] shadow-sm"
                : "text-[#668071] hover:text-[#123d2d]"
            }`}
          >
            {distance}km
          </button>
        ))}
      </div>
    </fieldset>

    <div className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor="rental-machine-filter" className="text-xs font-bold text-[#315c49]">
          필요 장비
        </label>
        {selectedMachineCategory && (
          <button
            type="button"
            onClick={() => onMachineChange("")}
            className="flex items-center gap-1 text-[11px] font-bold text-[#648071] hover:text-[#174c37]"
          >
            <X className="h-3 w-3" /> 선택 해제
          </button>
        )}
      </div>
      <select
        id="rental-machine-filter"
        value={selectedMachineCategory}
        onChange={(event) => onMachineChange(event.target.value as MachineCategory | "")}
        className="h-10 w-full rounded-lg border-[#d9e4dc] bg-[#fbfdfb] px-3 text-sm font-semibold text-[#183d2d] outline-none transition focus:border-[#2b7656] focus:ring-2 focus:ring-[#2b7656]/15"
      >
        <option value="">전체 보유 장비</option>
        {machineOptions.map((machine) => (
          <option key={machine.value} value={machine.value}>
            {machine.label}
          </option>
        ))}
      </select>
    </div>
  </div>
);
