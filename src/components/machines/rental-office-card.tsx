import { Building2, CalendarClock, MapPin, Navigation, Phone } from "lucide-react";
import type { RentalOfficeRecommendation } from "@/domains/machines/rental-office-recommendations";
import { getMachineCountLabel, getMachineStatusLabel } from "@/domains/machines/presentation";

interface RentalOfficeCardProps {
  office: RentalOfficeRecommendation;
  index: number;
  leadLabel: string | null;
}

const STATUS_STYLE = {
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  LIMITED: "bg-amber-100 text-amber-800",
  REQUEST_ONLY: "bg-sky-100 text-sky-800",
  UNKNOWN: "bg-slate-100 text-slate-700",
  UNAVAILABLE: "bg-rose-100 text-rose-800",
} as const;

export const RentalOfficeCard = ({ office, index, leadLabel }: RentalOfficeCardProps) => {
  const { rental } = office;
  const mapQuery = encodeURIComponent(rental.address || rental.name);

  return (
    <article
      className="group overflow-hidden rounded-2xl border border-[#dce5df] bg-white shadow-[0_18px_55px_-44px_rgba(13,55,38,0.65)] transition duration-300 hover:-translate-y-0.5 hover:border-[#88ac98] hover:shadow-[0_22px_58px_-40px_rgba(13,55,38,0.8)]"
      style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
    >
      <div className="grid grid-cols-[3.5rem_1fr]">
        <div className="flex flex-col items-center border-r border-[#e5ece7] bg-[#f3f6f2] pt-5">
          <span className="text-[10px] font-black tracking-[0.16em] text-[#789083]">NO.</span>
          <span className="mt-1 text-xl font-black tabular-nums text-[#174c37]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="mt-auto h-12 w-px bg-gradient-to-b from-[#9db8a8] to-transparent" />
        </div>

        <div className="min-w-0 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {leadLabel && (
                <span className="mb-2 inline-flex rounded-full bg-[#163f2f] px-2.5 py-1 text-[10px] font-black tracking-wide text-white">
                  {leadLabel}
                </span>
              )}
              <h3 className="text-base font-black leading-snug tracking-[-0.02em] text-[#172d24] md:text-lg">
                {rental.name}
              </h3>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[10px] font-bold text-[#779084]">직선거리</div>
              <div className="text-lg font-black tabular-nums text-[#c6642d]">
                {office.distanceKm.toFixed(1)}
                <span className="ml-0.5 text-xs">km</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[#64786e]">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2d7456]" />
            <span>{rental.address || rental.region}</span>
          </div>

          <div className="mt-4 space-y-2">
            {office.recommendations.map((recommendation) => (
              <div
                key={`${recommendation.type}-${recommendation.machineName}-${recommendation.count}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e5ece7] bg-[#fafcfa] px-3 py-2.5"
              >
                <div>
                  <div className="text-sm font-bold text-[#203c2f]">
                    {recommendation.machineName}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#71847a]">{recommendation.reason}</div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-black ${STATUS_STYLE[recommendation.status]}`}
                >
                  {getMachineStatusLabel(recommendation.status, recommendation.availabilityBasis)} ·{" "}
                  {getMachineCountLabel(recommendation.count, recommendation.availabilityBasis)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-dashed border-[#dce5df] pt-3 text-[11px] text-[#71847a]">
            {rental.institutionName && (
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> {rental.institutionName}
              </span>
            )}
            {rental.referenceDate && (
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" /> 기준일 {rental.referenceDate}
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <a
              href={`https://map.naver.com/p/search/${mapQuery}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cad9d0] text-xs font-bold text-[#315c49] transition hover:bg-[#f0f5f1]"
            >
              <Navigation className="h-3.5 w-3.5" /> 지도에서 보기
            </a>
            {rental.phone ? (
              <a
                href={`tel:${rental.phone}`}
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1f684a] text-xs font-black text-white transition hover:bg-[#174f39]"
              >
                <Phone className="h-3.5 w-3.5" /> 전화 문의
              </a>
            ) : (
              <span className="flex h-10 items-center justify-center rounded-lg bg-[#edf1ee] text-xs font-bold text-[#819087]">
                연락처 확인 필요
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
