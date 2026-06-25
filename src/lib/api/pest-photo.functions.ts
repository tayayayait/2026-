import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  fetchNcpmsDiseaseDetail,
  fetchNcpmsInsectDetail,
  fetchNcpmsInsectInfoDetail,
  fetchNcpmsNaturalEnemyDetail,
  fetchNcpmsWeedDetail,
} from "@/integrations/ncpms/disease";
import {
  fetchNcpmsPhotoCandidates,
  fetchNcpmsPhotoCrops,
  fetchNcpmsPhotoSections,
} from "@/integrations/ncpms/photo-search";
import {
  enrichPhotoDetailPanel,
  resolveNcpmsPhotoDetailRequest,
} from "@/domains/pests/photo-search";
import { normalizeNcpmsPestDetail } from "@/domains/pests/detail-selection";

const PhotoCandidateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  type: z.enum(["DISEASE", "INSECT", "WEED", "UNKNOWN"]),
  detailServiceCode: z.enum(["SVC05", "SVC07", "SVC08", "SVC10", "SVC15", "UNKNOWN"]),
  detailSupported: z.boolean(),
  imageUrl: z.string().optional(),
});

const PhotoCandidateSearchSchema = z
  .object({
    cropCode: z.string().min(1).optional(),
    cropSectionCode: z.string().optional(),
    categoryCode: z.enum(["18601", "18602", "18603", "18604", "18605"]).optional(),
    partName: z.string().optional(),
    pestName: z.string().optional(),
    startPoint: z.number().min(1).optional(),
  })
  .refine(
    (data) => Boolean(data.cropCode) !== (data.cropSectionCode === "6"),
    "cropCode 또는 cropSectionCode=6 중 하나가 필요합니다.",
  );

export const getNcpmsPhotoSections = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return { ok: true, data: await fetchNcpmsPhotoSections() };
  } catch (error) {
    console.error("NCPMS photo sections fetch failed:", error);
    return { ok: false, error: "사진검색 작물 분류를 가져오지 못했습니다." };
  }
});

export const getNcpmsPhotoCrops = createServerFn({ method: "GET" })
  .validator((data: { cropSectionCode: string; startPoint?: number }) =>
    z
      .object({
        cropSectionCode: z.string().min(1),
        startPoint: z.number().min(1).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      return { ok: true, data: await fetchNcpmsPhotoCrops(data) };
    } catch (error) {
      console.error("NCPMS photo crops fetch failed:", error);
      return { ok: false, error: "사진검색 작물 목록을 가져오지 못했습니다." };
    }
  });

export const searchNcpmsPhotoCandidates = createServerFn({ method: "GET" })
  .validator(
    (data: {
      cropCode?: string;
      cropSectionCode?: string;
      categoryCode?: "18601" | "18602" | "18603" | "18604" | "18605";
      partName?: string;
      pestName?: string;
      startPoint?: number;
    }) => PhotoCandidateSearchSchema.parse(data),
  )
  .handler(async ({ data }) => {
    try {
      return { ok: true, data: await fetchNcpmsPhotoCandidates(data) };
    } catch (error) {
      console.error("NCPMS photo candidates fetch failed:", error);
      return { ok: false, error: "사진검색 병해충 후보를 가져오지 못했습니다." };
    }
  });

export const getNcpmsPhotoCandidateDetail = createServerFn({ method: "GET" })
  .validator((data: { candidate: z.infer<typeof PhotoCandidateSchema>; crop: string }) =>
    z.object({ candidate: PhotoCandidateSchema, crop: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const request = resolveNcpmsPhotoDetailRequest(data.candidate, data.crop);
    if (!request) {
      return { ok: false, error: "이 후보의 상세조회 서비스는 아직 지원하지 않습니다." };
    }

    try {
      if (request.detailType === "DISEASE") {
        return {
          ok: true,
          data: enrichPhotoDetailPanel(
            data.candidate,
            data.crop,
            normalizeNcpmsPestDetail({
              detailType: "DISEASE",
              detail: await fetchNcpmsDiseaseDetail(request.id),
            }),
          ),
        };
      }
      if (request.detailType === "INSECT") {
        const insectDetail =
          request.detailServiceCode === "SVC08"
            ? await fetchNcpmsInsectInfoDetail(request.id)
            : request.detailServiceCode === "SVC15"
              ? await fetchNcpmsNaturalEnemyDetail(request.id)
              : await fetchNcpmsInsectDetail(request.id);

        return {
          ok: true,
          data: enrichPhotoDetailPanel(
            data.candidate,
            data.crop,
            normalizeNcpmsPestDetail({ detailType: "INSECT", detail: insectDetail }),
          ),
        };
      }

      return {
        ok: true,
        data: enrichPhotoDetailPanel(
          data.candidate,
          data.crop,
          normalizeNcpmsPestDetail({
            detailType: "WEED",
            detail: await fetchNcpmsWeedDetail(request.id),
          }),
        ),
      };
    } catch (error) {
      console.error("NCPMS photo candidate detail fetch failed:", error);
      return { ok: false, error: "사진검색 후보 상세정보를 가져오지 못했습니다." };
    }
  });
