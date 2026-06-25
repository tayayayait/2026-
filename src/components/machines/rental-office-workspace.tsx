import { useMemo, useState } from "react";
import { MapPinned, SearchX } from "lucide-react";
import { MiniMap } from "@/components/mini-map";
import type { Farm } from "@/domains/farms/types";
import type { RecommendationResult } from "@/domains/machines/recommender";
import { RENTAL_MACHINE_CATEGORY_OPTIONS } from "@/domains/machines/rental-machine-categories";
import {
  buildRentalOfficeRecommendations,
  selectRentalOfficeRecommendations,
} from "@/domains/machines/rental-office-recommendations";
import type { MachineCategory, Rental } from "@/domains/machines/types";
import { RentalOfficeCard } from "./rental-office-card";
import { RentalOfficeFilters } from "./rental-office-filters";

interface RentalOfficeWorkspaceProps {
  farm: Farm;
  rentals: Rental[];
  recommendations: RecommendationResult[];
}

export const RentalOfficeWorkspace = ({
  farm,
  rentals,
  recommendations,
}: RentalOfficeWorkspaceProps) => {
  const [maxDistanceKm, setMaxDistanceKm] = useState(30);
  const [selectedMachineCategory, setSelectedMachineCategory] = useState<MachineCategory | "">("");

  const offices = useMemo(
    () =>
      buildRentalOfficeRecommendations({ lat: farm.lat, lng: farm.lng }, rentals, recommendations),
    [farm.lat, farm.lng, recommendations, rentals],
  );
  const selectedMachineLabel = RENTAL_MACHINE_CATEGORY_OPTIONS.find(
    (option) => option.value === selectedMachineCategory,
  )?.label;
  const selectedOffices = useMemo(
    () =>
      selectRentalOfficeRecommendations(offices, {
        maxDistanceKm,
        machineCategory: selectedMachineCategory || undefined,
        sortBy: "PRIORITY",
      }),
    [maxDistanceKm, offices, selectedMachineCategory],
  );
  const markers = useMemo(
    () => [
      {
        lat: farm.lat,
        lng: farm.lng,
        label: farm.name,
        level: "SAFE" as const,
        kind: "farm" as const,
      },
      ...selectedOffices.map((office) => ({
        lat: office.rental.lat,
        lng: office.rental.lng,
        label: office.rental.name,
        kind: "rental" as const,
      })),
    ],
    [farm, selectedOffices],
  );

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-black tracking-[0.16em] text-[#2f7657]">RENTAL OFFICES</div>
          <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[#172d24] md:text-2xl">
            가까운 임대사업소
          </h2>
        </div>
        <div className="text-right text-xs text-[#6e8177]">
          {selectedMachineLabel && (
            <span className="mb-1 block max-w-52 truncate font-bold text-[#2f7657]">
              {selectedMachineLabel}
            </span>
          )}
          검색 결과{" "}
          <strong className="text-base font-black text-[#174c37]">{selectedOffices.length}</strong>
          곳
        </div>
      </div>

      <RentalOfficeFilters
        machineOptions={RENTAL_MACHINE_CATEGORY_OPTIONS}
        maxDistanceKm={maxDistanceKm}
        selectedMachineCategory={selectedMachineCategory}
        onDistanceChange={setMaxDistanceKm}
        onMachineChange={setSelectedMachineCategory}
      />

      {selectedMachineLabel && (
        <div className="rounded-lg border border-[#cfe0d5] bg-[#edf6f0] px-3 py-2 text-xs font-semibold text-[#315f49]">
          <strong>{selectedMachineLabel}</strong> 항목이 있는 사업소만 표시하며, 카드에는 선택
          장비만 표시됩니다.
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="xl:sticky xl:top-5 xl:self-start">
          <div className="overflow-hidden rounded-2xl border border-[#d8e2dc] bg-white p-2 shadow-[0_22px_60px_-44px_rgba(13,55,38,0.7)]">
            <MiniMap markers={markers} height={520} legendMode="rental" />
          </div>
          <div className="mt-2 flex items-center gap-1.5 px-1 text-[11px] text-[#71847a]">
            <MapPinned className="h-3.5 w-3.5" /> 거리는 좌표 기준 직선거리이며 실제 이동거리와 다를
            수 있습니다.
          </div>
        </div>

        <div className="space-y-3">
          {selectedOffices.length > 0 ? (
            selectedOffices.map((office, index) => (
              <RentalOfficeCard
                key={office.rental.id}
                office={office}
                index={index}
                leadLabel={index === 0 ? "우선 문의처" : null}
              />
            ))
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd9d0] bg-white/70 px-6 text-center">
              <SearchX className="h-8 w-8 text-[#6f8e7d]" />
              <h3 className="mt-4 text-base font-black text-[#203c2f]">
                조건에 맞는 사업소가 없습니다.
              </h3>
              <p className="mt-1 text-sm text-[#71847a]">
                거리 범위를 넓히거나 전체 보유 장비를 선택하세요.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
