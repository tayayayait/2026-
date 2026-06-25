import { createOpenApiError } from "./result-codes";
import type { OpenApiSource } from "./types";

type EnvReader = Record<string, string | undefined>;

interface ServerEnvRequest {
  source: OpenApiSource;
  names: string[];
}

const getDefaultEnv = (): EnvReader => {
  if (typeof process === "undefined") return {};
  return process.env;
};

export const readServerEnv = (
  request: ServerEnvRequest,
  env: EnvReader = getDefaultEnv(),
): string => {
  for (const name of request.names) {
    const value = env[name];
    if (value && value.trim().length > 0) return value;
  }

  throw createOpenApiError(
    request.source,
    "ENV_MISSING",
    `필수 환경변수가 없습니다: ${request.names.join(" 또는 ")}`,
  );
};

export const readOptionalServerEnv = (
  request: ServerEnvRequest,
  env: EnvReader = getDefaultEnv(),
): string | null => {
  for (const name of request.names) {
    const value = env[name];
    if (value && value.trim().length > 0) return value;
  }

  return null;
};
