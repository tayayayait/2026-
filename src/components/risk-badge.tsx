import type { RiskLevel } from "@/domains/shared/types";

const META: Record<RiskLevel, { label: string; bg: string; fg: string }> = {
  SAFE: { label: "안정", bg: "bg-risk-safe-bg", fg: "text-risk-safe-fg" },
  WATCH: { label: "관심", bg: "bg-risk-watch-bg", fg: "text-risk-watch-fg" },
  WARNING: { label: "주의", bg: "bg-risk-warning-bg", fg: "text-risk-warning-fg" },
  CRITICAL: { label: "긴급", bg: "bg-risk-critical-bg", fg: "text-risk-critical-fg" },
  UNKNOWN: { label: "데이터 부족", bg: "bg-risk-unknown-bg", fg: "text-risk-unknown-fg" },
};

export function RiskBadge({
  level,
  score,
  size = "md",
}: {
  level: RiskLevel;
  score?: number;
  size?: "sm" | "md";
}) {
  const m = META[level];
  const padding = size === "sm" ? "px-2 h-6 text-xs" : "px-3 h-7 text-[13px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${padding} ${m.bg} ${m.fg}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {m.label}
      {score !== undefined ? ` / ${score}` : ""}
    </span>
  );
}

export function RiskGauge({ score, level }: { score: number; level: RiskLevel }) {
  const m = META[level];
  const angle = (score / 100) * 360;
  const ring = `conic-gradient(currentColor ${angle}deg, transparent 0deg)`;

  return (
    <div className={`relative h-24 w-24 rounded-full ${m.fg}`}>
      <div className="absolute inset-0 rounded-full" style={{ background: ring }} />
      <div className="absolute inset-1.5 rounded-full bg-card flex flex-col items-center justify-center">
        <div className="text-2xl font-extrabold leading-none">{score}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">/ 100</div>
      </div>
    </div>
  );
}
