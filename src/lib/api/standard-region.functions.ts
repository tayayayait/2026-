import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  fetchAllStandardRegions,
  fetchStandardRegionPage,
} from "@/integrations/standardRegion/standard-region-client";

const standardRegionQuerySchema = z.object({
  query: z.string().trim().min(2).max(100),
});

export const searchStandardRegionCodes = createServerFn({ method: "GET" })
  .validator((data: unknown) => standardRegionQuerySchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const page = await fetchStandardRegionPage({
        query: data.query,
        pageNo: 1,
        numOfRows: 50,
      });
      return { ok: true, data: page };
    } catch (error) {
      console.error("Standard-region search failed:", error);
      return { ok: false, error: "법정동코드 검색에 실패했습니다." };
    }
  });

export const getStandardRegionTree = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({}).strict().parse(data))
  .handler(async () => {
    try {
      return { ok: true, data: await fetchAllStandardRegions() };
    } catch (error) {
      console.error("Standard-region hierarchy load failed:", error);
      return { ok: false, error: "법정동코드 목록을 불러오지 못했습니다." };
    }
  });
