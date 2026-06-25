import { AlertTriangle, CheckCircle2, CircleDollarSign, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type {
  DecisionItemId,
  DecisionTone,
  FarmDecisionSummary,
} from "@/domains/analysis/farm-decision-summary";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TONE_CLASS: Record<DecisionTone, string> = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-900",
  watch: "border-amber-200 bg-amber-50 text-amber-900",
  bad: "border-red-200 bg-red-50 text-red-900",
  neutral: "border-slate-200 bg-slate-50 text-slate-800",
};

const TONE_DOT_CLASS: Record<DecisionTone, string> = {
  good: "bg-emerald-600",
  watch: "bg-amber-600",
  bad: "bg-red-600",
  neutral: "bg-slate-500",
};

const ITEM_ICON: Record<DecisionItemId, ReactNode> = {
  pesticide: <ShieldCheck className="h-4 w-4" />,
  market: <CircleDollarSign className="h-4 w-4" />,
};

export const FarmDecisionSummaryCard = ({ summary }: { summary: FarmDecisionSummary }) => (
  <Card className={cn("overflow-hidden border-2", TONE_CLASS[summary.tone])}>
    <CardHeader className="pb-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            {summary.tone === "bad" || summary.tone === "watch" ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            {summary.title}
          </CardTitle>
          <p className="mt-2 max-w-2xl text-sm opacity-80">{summary.subtitle}</p>
        </div>
        <span className="inline-flex h-8 shrink-0 items-center gap-2 rounded-md border bg-background/70 px-3 text-xs font-bold">
          <span className={cn("h-2 w-2 rounded-full", TONE_DOT_CLASS[summary.tone])} />
          실행 요약
        </span>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {summary.items.map((item) => (
          <section key={item.id} className="rounded-md border bg-background/80 p-4 text-foreground">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className={cn("mt-0.5 rounded-md border p-2", TONE_CLASS[item.tone])}>
                  {ITEM_ICON[item.id]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
                </div>
              </div>
              <span className="shrink-0 rounded-md bg-secondary px-2.5 py-1 text-xs font-bold">
                {item.metric}
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-muted-foreground">{item.source}</p>
          </section>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {summary.caveats.map((caveat) => (
          <p key={caveat} className="rounded-md border bg-background/60 px-3 py-2 text-xs text-muted-foreground">
            {caveat}
          </p>
        ))}
      </div>
    </CardContent>
  </Card>
);
