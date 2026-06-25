import { OpenApiIntegrationError } from "./types";
import type { KoreanOpenApiEnvelope, OpenApiSource } from "./types";

interface ResultCodeInfo {
  message: string;
  recoverable: boolean;
}

const PUBLIC_DATA_CODES: Record<string, ResultCodeInfo> = {
  "00": { message: "정상", recoverable: true },
  "01": { message: "어플리케이션 에러", recoverable: true },
  "02": { message: "데이터베이스 에러", recoverable: true },
  "03": { message: "데이터 없음", recoverable: true },
  "04": { message: "HTTP 에러", recoverable: true },
  "05": { message: "서비스 연결 실패", recoverable: true },
  "10": { message: "잘못된 요청 파라미터", recoverable: false },
  "11": { message: "필수 요청 파라미터 누락", recoverable: false },
  "12": { message: "해당 OpenAPI 서비스 없음 또는 폐기", recoverable: false },
  "20": { message: "서비스 접근 거부", recoverable: false },
  "21": { message: "일시적으로 사용할 수 없는 서비스키", recoverable: true },
  "22": { message: "서비스 요청 제한 횟수 초과", recoverable: true },
  "30": { message: "등록되지 않은 서비스키", recoverable: false },
  "31": { message: "기한 만료된 서비스키", recoverable: false },
  "32": { message: "등록되지 않은 IP", recoverable: false },
  "33": { message: "서명되지 않은 호출", recoverable: false },
  "99": { message: "기타 오류", recoverable: true },
};

const RDA_CODES: Record<string, ResultCodeInfo> = {
  "00": { message: "정상", recoverable: true },
  "11": { message: "인증키 누락 또는 오류", recoverable: false },
  "12": { message: "중지된 인증키", recoverable: false },
  "13": { message: "존재하지 않는 서비스 또는 operation", recoverable: false },
  "15": { message: "AJAX 요청 도메인 불일치", recoverable: false },
  "91": { message: "시스템 오류", recoverable: true },
};

const getCatalog = (source: OpenApiSource) => {
  if (source === "RDA") return RDA_CODES;
  return PUBLIC_DATA_CODES;
};

export const createOpenApiError = (
  source: OpenApiSource,
  code: string,
  message?: string,
  status?: number,
) => {
  const catalog = getCatalog(source);
  const known = catalog[code];

  return new OpenApiIntegrationError({
    source,
    code,
    message: message || known?.message || "알 수 없는 OpenAPI 오류",
    recoverable: known?.recoverable ?? true,
    status,
  });
};

export const ensureOpenApiSuccess = (source: OpenApiSource, envelope: KoreanOpenApiEnvelope) => {
  if (envelope.resultCode === "00") return;
  throw createOpenApiError(source, envelope.resultCode, envelope.resultMsg);
};

export const describeOpenApiResultCode = (source: OpenApiSource, code: string): ResultCodeInfo => {
  const catalog = getCatalog(source);
  return catalog[code] || { message: "알 수 없는 OpenAPI 결과코드", recoverable: true };
};
