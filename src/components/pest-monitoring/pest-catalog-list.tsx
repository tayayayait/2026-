import { useMemo, useState } from "react";
import { Bug, ChevronDown, Leaf, Search, Sprout } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  filterPestCatalogGroups,
  type PestCatalogFilterType,
  type PestCatalogGroup,
  type PestCatalogSummary,
} from "@/domains/pests/catalog-groups";

interface PestCatalogListProps {
  groups: PestCatalogGroup[];
  summary: PestCatalogSummary;
}

const TYPE_META = {
  DISEASE: { label: "병", icon: Leaf, className: "bg-rose-50 text-rose-700 ring-rose-200" },
  INSECT: { label: "해충", icon: Bug, className: "bg-amber-50 text-amber-800 ring-amber-200" },
  WEED: {
    label: "잡초",
    icon: Sprout,
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
} as const;

const FILTERS: Array<{ type: PestCatalogFilterType; label: string }> = [
  { type: "ALL", label: "전체" },
  { type: "DISEASE", label: "병" },
  { type: "INSECT", label: "해충" },
  { type: "WEED", label: "잡초" },
];

const getFilterCount = (type: PestCatalogFilterType, summary: PestCatalogSummary) => {
  if (type === "DISEASE") return summary.diseaseCount;
  if (type === "INSECT") return summary.insectCount;
  if (type === "WEED") return summary.weedCount;
  return summary.totalCount;
};

const PestCatalogRow = ({ group }: { group: PestCatalogGroup }) => {
  const meta = TYPE_META[group.type];
  const Icon = meta.icon;

  return (
    <article className="group rounded-xl border border-[#dfe4dc] bg-white/80 px-4 py-3.5 transition-colors hover:border-[#a9bcae] hover:bg-white">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ring-1",
            meta.className,
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold tracking-[-0.01em] text-[#17241d]">
              {group.name}
            </h4>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                meta.className,
              )}
            >
              {meta.label}
            </span>
          </div>

          {group.aliases.length <= 1 ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              <span className="font-medium text-[#667269]">학명·영문명</span>{" "}
              {group.aliases[0] ?? "제공된 상세 명칭 없음"}
            </p>
          ) : (
            <details className="group mt-1 text-xs text-muted-foreground">
              <summary className="flex min-h-7 cursor-pointer list-none items-center gap-1 font-medium text-[#52635a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                학명·영문명 {group.aliases.length}건
                <ChevronDown
                  className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <ul className="mt-1.5 space-y-1 border-l border-[#cfdbd1] pl-3 leading-5">
                {group.aliases.map((alias) => (
                  <li key={alias}>{alias}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
        {group.recordCount > 1 && (
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            원본 {group.recordCount}건
          </span>
        )}
      </div>
    </article>
  );
};

export const PestCatalogList = ({ groups, summary }: PestCatalogListProps) => {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<PestCatalogFilterType>("ALL");
  const [showAll, setShowAll] = useState(false);
  const filteredGroups = useMemo(
    () => filterPestCatalogGroups(groups, { query, type }),
    [groups, query, type],
  );
  const shouldLimit = !showAll && !query.trim() && type === "ALL";
  const visibleGroups = shouldLimit ? filteredGroups.slice(0, 8) : filteredGroups;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="병해충 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="병명·해충명·학명 검색"
            className="h-11 rounded-full border-[#cfd9d1] bg-white pl-9 shadow-none"
          />
        </div>

        <div className="flex flex-wrap gap-2" aria-label="병해충 유형 필터">
          {FILTERS.filter((filter) => filter.type !== "WEED" || summary.weedCount > 0).map(
            (filter) => {
              const active = type === filter.type;
              return (
                <button
                  key={filter.type}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setType(filter.type)}
                  className={cn(
                    "min-h-10 rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    active
                      ? "border-[#1f6548] bg-[#1f6548] text-white"
                      : "border-[#d3ddd5] bg-white text-[#4e5d54] hover:border-[#8ca292]",
                  )}
                >
                  {filter.label} {getFilterCount(filter.type, summary)}
                </button>
              );
            },
          )}
        </div>
      </div>

      {visibleGroups.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-2">
          {visibleGroups.map((group) => (
            <PestCatalogRow key={group.key} group={group} />
          ))}
        </div>
      ) : (
        <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-[#cbd6cd] bg-[#f8faf7] px-4 text-center text-sm text-muted-foreground">
          검색 조건에 맞는 관련 병해충이 없습니다.
        </div>
      )}

      {filteredGroups.length > 8 && !query.trim() && type === "ALL" && (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="min-h-11 w-full rounded-xl border border-[#c8d5cb] bg-white text-sm font-semibold text-[#225c43] transition-colors hover:bg-[#f2f7f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {showAll ? "목록 접기" : `전체 ${filteredGroups.length}종 보기`}
        </button>
      )}
    </div>
  );
};
