import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  fetchNcpmsDiseaseDetail,
  fetchNcpmsInsectDetail,
  fetchNcpmsWeedDetail,
  searchPestsByCrop,
} from "@/integrations/ncpms/disease";
import {
  fetchRdaPestOccurrenceList,
  fetchRdaPestOccurrenceYears,
} from "@/integrations/rda/pest-occurrence";

export const getPestsForCrop = createServerFn({ method: "GET" })
  .validator((data: { crop: string }) => z.object({ crop: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    try {
      const pests = await searchPestsByCrop(data.crop);
      return {
        ok: true,
        data: pests,
      };
    } catch (error) {
      console.error("NCPMS fetch failed:", error);
      return { ok: false, error: "병해충 정보를 가져오지 못했습니다." };
    }
  });

export const getNcpmsDiseaseDetail = createServerFn({ method: "GET" })
  .validator((data: { sickKey: string }) => z.object({ sickKey: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    try {
      const detail = await fetchNcpmsDiseaseDetail(data.sickKey);
      return { ok: true, data: detail };
    } catch (error) {
      console.error("NCPMS disease detail fetch failed:", error);
      return { ok: false, error: "병 상세 정보를 가져오지 못했습니다." };
    }
  });

export const getNcpmsInsectDetail = createServerFn({ method: "GET" })
  .validator((data: { insectKey: string }) =>
    z.object({ insectKey: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const detail = await fetchNcpmsInsectDetail(data.insectKey);
      return { ok: true, data: detail };
    } catch (error) {
      console.error("NCPMS insect detail fetch failed:", error);
      return { ok: false, error: "해충 상세 정보를 가져오지 못했습니다." };
    }
  });

export const getNcpmsWeedDetail = createServerFn({ method: "GET" })
  .validator((data: { weedsKey: string }) => z.object({ weedsKey: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    try {
      const detail = await fetchNcpmsWeedDetail(data.weedsKey);
      return { ok: true, data: detail };
    } catch (error) {
      console.error("NCPMS weed detail fetch failed:", error);
      return { ok: false, error: "잡초 상세 정보를 가져오지 못했습니다." };
    }
  });

export const getPestOccurrenceYears = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const years = await fetchRdaPestOccurrenceYears();
    return { ok: true, data: years };
  } catch (error) {
    console.error("RDA pest occurrence years fetch failed:", error);
    return { ok: false, error: "병해충 발생정보 연도 목록을 가져오지 못했습니다." };
  }
});

export const searchPestOccurrences = createServerFn({ method: "GET" })
  .validator(
    (data: { sYear?: string; sType?: "sCntntsSj" | "sWriteNm"; sText?: string; pageNo?: number }) =>
      z
        .object({
          sYear: z.string().optional(),
          sType: z.enum(["sCntntsSj", "sWriteNm"]).optional(),
          sText: z.string().optional(),
          pageNo: z.number().min(1).optional(),
        })
        .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const occurrences = await fetchRdaPestOccurrenceList(data);
      return { ok: true, data: occurrences };
    } catch (error) {
      console.error("RDA pest occurrence list fetch failed:", error);
      return { ok: false, error: "병해충 발생정보 목록을 가져오지 못했습니다." };
    }
  });
