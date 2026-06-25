import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type DataStatus = "SUCCESS" | "PARTIAL" | "STALE" | "ERROR";

interface DataStatusBadgeProps {
  status: DataStatus;
  lastUpdated?: Date;
  label?: string;
  className?: string;
}

const statusConfig = {
  SUCCESS: {
    icon: CheckCircle2,
    label: "정상 연동",
    colors: "bg-green-100 text-green-700 border-green-200",
  },
  PARTIAL: {
    icon: Clock,
    label: "일부 지연",
    colors: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  STALE: {
    icon: Clock,
    label: "갱신 지연",
    colors: "bg-gray-100 text-gray-700 border-gray-200",
  },
  ERROR: {
    icon: AlertCircle,
    label: "연결 오류",
    colors: "bg-red-100 text-red-700 border-red-200",
  },
};

export function DataStatusBadge({ status, lastUpdated, label, className }: DataStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
        config.colors,
        className,
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label ?? config.label}</span>
      {lastUpdated && (
        <span className="opacity-70 ml-1 font-normal hidden sm:inline-block">
          ({lastUpdated.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })})
        </span>
      )}
    </div>
  );
}
