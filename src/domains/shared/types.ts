export type RiskLevel = "SAFE" | "WATCH" | "WARNING" | "CRITICAL" | "UNKNOWN";
export type DataStatus = "IDLE" | "LOADING" | "SUCCESS" | "PARTIAL" | "STALE" | "ERROR";
export type WorkType = "방제" | "관수" | "배수" | "수확" | "파종" | "정식" | "경운/정지" | "제초";

export interface RiskFactor {
  name: string;
  score: number;
  description: string;
  weight?: number;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
  recommendedWorks: WorkType[];
  updatedAt: string;
}

export interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
  meta: {
    generatedAt: string;
    dataStatus: DataStatus;
  };
}

export interface ApiErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    recoverable: boolean;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
