import { createFileRoute } from "@tanstack/react-router";
import { UnifiedDashboard } from "@/components/unified-dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Farm-Sync - 통합 대시보드" },
      {
        name: "description",
        content: "전북 농가의 기상, 병해충, 농기계, 지역 운영 현황을 확인하는 통합 대시보드",
      },
    ],
  }),
  component: UnifiedDashboard,
});
