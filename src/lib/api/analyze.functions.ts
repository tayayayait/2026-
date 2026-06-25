import { createServerFn } from "@tanstack/react-start";
import { executeFarmAnalysis } from "@/domains/analysis/farm-analysis-service";
import type { Farm } from "@/domains/farms/types";

export const analyzeFarmRisk = createServerFn({ method: "POST" })
  .validator((data: unknown) => data as Farm)
  .handler(async ({ data: farm }) => {
    try {
      return { ok: true, data: await executeFarmAnalysis(farm) };
    } catch (error) {
      console.error("Analysis failed:", error);
      return { ok: false, error: "위험도 분석에 실패했습니다." };
    }
  });
