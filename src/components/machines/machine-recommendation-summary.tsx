import { ArrowUpRight, ClipboardList, Tractor } from "lucide-react";
import type { RecommendationResult } from "@/domains/machines/recommender";
import type { WorkType } from "@/domains/shared/types";

interface MachineRecommendationSummaryProps {
  works: WorkType[];
  recommendations: RecommendationResult[];
}

export const MachineRecommendationSummary = ({
  works,
  recommendations,
}: MachineRecommendationSummaryProps) => {
  const machines = [...new Set(recommendations.map((item) => item.machineName))].slice(0, 4);

  return (
    <section className="overflow-hidden rounded-[1.25rem] bg-[#123d2d] text-white shadow-[0_24px_70px_-38px_rgba(13,55,38,0.75)]">
      <div className="relative grid gap-8 px-5 py-6 md:grid-cols-[0.85fr_1.15fr] md:px-8 md:py-8">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute -right-2 -top-12 h-40 w-40 rounded-full border border-white/10" />

        <div className="relative">
          <div className="mb-4 flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-emerald-200">
            <ClipboardList className="h-4 w-4" /> 현장 작업 기준
          </div>
          <h2 className="max-w-md text-2xl font-black leading-tight tracking-[-0.04em] md:text-3xl">
            필요한 장비부터 확인하고,
            <br />
            가까운 사업소에 문의하세요.
          </h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {works.map((work) => (
              <span
                key={work}
                className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/90"
              >
                {work}
              </span>
            ))}
          </div>
        </div>

        <div className="relative grid gap-2 sm:grid-cols-2">
          {machines.length > 0 ? (
            machines.map((machine, index) => (
              <div
                key={machine}
                className="group flex min-h-20 items-center justify-between rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur-sm transition-colors hover:bg-white/[0.12]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-xs font-black tabular-nums text-emerald-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div className="truncate text-sm font-bold">{machine}</div>
                    <div className="mt-1 text-[11px] text-white/55">보유 사업소 확인</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-white/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
            ))
          ) : (
            <div className="col-span-full flex min-h-28 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] px-5 text-sm text-white/70">
              <Tractor className="h-5 w-5" /> 조건에 맞는 장비 정보를 찾지 못했습니다.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
