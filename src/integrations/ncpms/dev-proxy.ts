const NCPMS_PROXY_PATH = "/api/ncpms-proxy";
const NCPMS_UPSTREAM_PATH = "/npmsAPI/service";

type EnvReader = Record<string, string | undefined>;

export const readNcpmsDevProxyApiKey = (env: EnvReader): string | null => {
  const serverOnlyKey = env.NCPMS_API_KEY?.trim();
  if (serverOnlyKey) return serverOnlyKey;

  const legacyPublicKey = env.VITE_NCPMS_API_KEY?.trim();
  return legacyPublicKey || null;
};

export const rewriteNcpmsDevProxyPath = (path: string, apiKey: string | null): string => {
  const [pathname, rawQuery = ""] = path.split("?");
  const upstreamPathname = pathname.replace(new RegExp(`^${NCPMS_PROXY_PATH}`), NCPMS_UPSTREAM_PATH);
  const params = new URLSearchParams(rawQuery);

  if (!params.has("serviceType")) params.set("serviceType", "AA001");
  if (apiKey) params.set("apiKey", apiKey);

  const query = params.toString();
  return query ? `${upstreamPathname}?${query}` : upstreamPathname;
};
