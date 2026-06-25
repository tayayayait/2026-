import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PestPhotoSearch } from "@/components/pest-photo-search/pest-photo-search";
import { useEffect } from "react";
import { useFarmsStore } from "@/domains/farms/store";

export const Route = createFileRoute("/pests/photo-search")({
  validateSearch: (search: Record<string, unknown>) => ({
    farmId: typeof search.farmId === "string" && search.farmId.trim() ? search.farmId : undefined,
  }),
  component: PestPhotoSearchPage,
});

function PestPhotoSearchPage() {
  const { farmId } = Route.useSearch();
  const { farms, loadFarms } = useFarmsStore();
  useEffect(() => {
    if (farmId && farms.length === 0) void loadFarms();
  }, [farmId, farms.length, loadFarms]);
  const farm = farmId ? farms.find((item) => item.id === farmId) ?? null : null;

  return (
    <AppShell
      title="병해충 사진검색"
      subtitle="작물 분류와 사진을 기준으로 병·해충·잡초 상세정보를 조회합니다."
      right={
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          통합 대시보드
        </Link>
      }
    >
      <div className="mx-auto max-w-[1500px] p-4 md:p-6">
        <PestPhotoSearch farm={farm} />
      </div>
    </AppShell>
  );
}
