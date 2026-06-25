import { AlertCircle, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasMorePhotoItems, WEED_CROP_SECTION_CODE } from "@/domains/pests/photo-search-flow";
import { PhotoSearchDetail } from "./photo-search-detail";
import { PhotoSearchList } from "./photo-search-list";
import { usePestPhotoSearch } from "./use-pest-photo-search";
import { Badge } from "@/components/ui/badge";
import { NCPMS_GROWTH_STAGES, getNcpmsGrowthStageLabel } from "@/domains/farms/growth-stage";
import type { Farm, NcpmsGrowthStageCode } from "@/domains/farms/types";

export const PestPhotoSearch = ({ farm }: { farm?: Farm | null }) => {
  const search = usePestPhotoSearch(farm);
  const stageLabel = getNcpmsGrowthStageLabel(search.selectedGrowthStageCode || null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>NCPMS SVC13</Badge>
            {farm && <Badge variant="outline">{farm.name} · {farm.crop}</Badge>}
            <Badge variant={stageLabel ? "secondary" : "destructive"}>
              {stageLabel ?? (farm ? "생육단계 재선택 필요" : "생육단계 전체")}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            작물과 생육단계는 NCPMS 사진검색 후보의 공식 필터로 전송됩니다.
          </p>
        </div>
        <label className="space-y-1 text-xs font-semibold">
          <span className="text-muted-foreground">생육 단계 필터</span>
          <select
            className="block h-9 min-w-40 rounded-md border border-input bg-background px-3 text-sm"
            value={search.selectedGrowthStageCode}
            onChange={(event) =>
              void search.selectGrowthStage(event.target.value as NcpmsGrowthStageCode | "")
            }
            disabled={search.selectedSection?.code === WEED_CROP_SECTION_CODE}
          >
            <option value="">전체 단계</option>
            {NCPMS_GROWTH_STAGES.map((stage) => (
              <option key={stage.code} value={stage.code}>
                {stage.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search.query}
            onChange={(event) => search.setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void search.search();
            }}
            placeholder="병해충 또는 잡초 이름 검색"
            className="pl-9"
            disabled={!search.selectedSection}
          />
        </div>
        <Button
          type="button"
          onClick={() => void search.search()}
          disabled={!search.selectedSection}
        >
          <Search />
          검색
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            search.setQuery("");
            void search.search("");
          }}
          disabled={!search.selectedSection}
          title="검색 조건 초기화"
        >
          <RotateCcw />
          초기화
        </Button>
      </div>

      {search.error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {search.error}
        </div>
      )}

      <div className="grid overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-[0.8fr_1fr_1.2fr_1.35fr]">
        <PhotoSearchList
          title="1. 작물 분류"
          items={search.sections.map((section) => ({
            id: section.code,
            name: section.name,
            imageUrl: section.imageUrl,
          }))}
          selectedId={search.selectedSection?.code}
          loading={search.loadingSections}
          emptyText="작물 분류 데이터가 없습니다."
          onSelect={(id) => {
            const section = search.sections.find((item) => item.code === id);
            if (section) void search.selectSection(section);
          }}
        />
        <PhotoSearchList
          title="2. 작물"
          items={
            search.selectedSection?.code === WEED_CROP_SECTION_CODE
              ? [{ id: "weed", name: "잡초 전체", meta: "작물 선택 없이 검색" }]
              : search.crops.items.map((crop) => ({
                  id: crop.code,
                  name: crop.name,
                  imageUrl: crop.imageUrl,
                }))
          }
          selectedId={
            search.selectedSection?.code === WEED_CROP_SECTION_CODE
              ? "weed"
              : search.selectedCrop?.code
          }
          loading={search.loadingCrops}
          emptyText="먼저 작물 분류를 선택하세요."
          hasMore={hasMorePhotoItems(search.crops)}
          onLoadMore={() => void search.loadMoreCrops()}
          onSelect={(id) => {
            const crop = search.crops.items.find((item) => item.code === id);
            if (crop) void search.selectCrop(crop);
          }}
        />
        <PhotoSearchList
          title="3. 사진 후보"
          items={search.candidates.items.map((candidate) => ({
            id: `${candidate.id}-${candidate.category}`,
            name: candidate.name,
            imageUrl: candidate.imageUrl,
            meta: candidate.detailSupported
              ? candidate.category
              : `${candidate.category} · 상세조회 미지원`,
            disabled: !candidate.detailSupported,
          }))}
          selectedId={
            search.selectedCandidate
              ? `${search.selectedCandidate.id}-${search.selectedCandidate.category}`
              : undefined
          }
          loading={search.loadingCandidates}
          emptyText="작물 또는 잡초 분류를 선택하면 사진 후보가 표시됩니다."
          hasMore={hasMorePhotoItems(search.candidates)}
          onLoadMore={() => void search.loadMoreCandidates()}
          onSelect={(id) => {
            const candidate = search.candidates.items.find(
              (item) => `${item.id}-${item.category}` === id,
            );
            if (candidate) void search.selectCandidate(candidate);
          }}
        />
        <PhotoSearchDetail
          detail={search.detail}
          loading={search.loadingDetail}
          error={search.detailError}
        />
      </div>
    </div>
  );
};
