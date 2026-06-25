type OpenApiParamValue = string | number | boolean | null | undefined;

export type OpenApiParams = Record<string, OpenApiParamValue>;

export const buildOpenApiUrl = (baseUrl: string, params: OpenApiParams): string => {
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
};
