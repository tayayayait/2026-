export type OpenApiSource =
  | "PUBLIC_DATA"
  | "KMA"
  | "NCPMS"
  | "RDA"
  | "NAVER"
  | "VWORLD"
  | "JUSO"
  | "ODCLOUD"
  | "FARMMAP"
  | "STANDARD_REGION"
  | "PERS"
  | "KAMIS";

export interface KoreanOpenApiEnvelope {
  resultCode: string;
  resultMsg: string;
}

export interface OpenApiErrorDetail {
  source: OpenApiSource;
  code: string;
  message: string;
  recoverable: boolean;
  status?: number;
}

export class OpenApiIntegrationError extends Error {
  readonly source: OpenApiSource;
  readonly code: string;
  readonly recoverable: boolean;
  readonly status?: number;

  constructor(detail: OpenApiErrorDetail) {
    super(`[${detail.source}] ${detail.code}: ${detail.message}`);
    this.name = "OpenApiIntegrationError";
    this.source = detail.source;
    this.code = detail.code;
    this.recoverable = detail.recoverable;
    this.status = detail.status;
  }
}
