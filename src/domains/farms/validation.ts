import { z } from "zod";

export const farmValidationSchema = z.object({
  name: z.string().optional(),
  address: z.string().min(5, "주소를 상세히 입력해 주세요."),
  region: z.string(),
  lat: z.number().min(35.3).max(36.2, "전북 지역 좌표가 아닙니다."),
  lng: z.number().min(126.4).max(127.7, "전북 지역 좌표가 아닙니다."),
  crop: z.enum(["감귤", "감자", "고추", "벼", "배", "사과", "파", "포도"]),
  area: z.number().min(1).max(999999, "올바른 면적을 입력해 주세요."),
  growthStageCode: z.enum(["18601", "18602", "18603", "18604", "18605"]),
  interestedWork: z.array(z.string()),
});
