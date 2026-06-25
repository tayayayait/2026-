import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { proxyFarmMapWms } from "./integrations/farmMap/wms-proxy";
import { proxyFarmMapWfs } from "./integrations/farmMap/wfs-proxy";
import { proxyNcpmsOpenApi } from "./integrations/ncpms/proxy";
import { readOptionalServerEnv } from "./integrations/openapi";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      if (new URL(request.url).pathname === "/api/farm-map/wms") {
        const apiKey = readOptionalServerEnv({ source: "FARMMAP", names: ["FARMMAP_API_KEY"] });
        const domain = readOptionalServerEnv({
          source: "FARMMAP",
          names: ["FARMMAP_API_DOMAIN", "FARMMAP_DOMAIN"],
        });
        if (!apiKey || !domain) {
          return new Response("FarmMap WMS is not configured", { status: 503 });
        }
        try {
          return await proxyFarmMapWms(request, { apiKey, domain });
        } catch (error) {
          console.error("FarmMap WMS proxy failed", error);
          return new Response("FarmMap WMS upstream failed", { status: 502 });
        }
      }

      if (new URL(request.url).pathname === "/api/farm-map/wfs") {
        const apiKey = readOptionalServerEnv({ source: "FARMMAP", names: ["FARMMAP_API_KEY"] });
        const domain = readOptionalServerEnv({
          source: "FARMMAP",
          names: ["FARMMAP_API_DOMAIN", "FARMMAP_DOMAIN"],
        });
        if (!apiKey || !domain) {
          return new Response("FarmMap WFS is not configured", { status: 503 });
        }
        try {
          return await proxyFarmMapWfs(request, { apiKey, domain });
        } catch (error) {
          console.error("FarmMap WFS proxy failed", error);
          return new Response("FarmMap WFS upstream failed", { status: 502 });
        }
      }

      if (new URL(request.url).pathname === "/api/ncpms-proxy") {
        try {
          return await proxyNcpmsOpenApi(request);
        } catch (error) {
          console.error("NCPMS proxy failed", error);
          return new Response("NCPMS upstream failed", { status: 502 });
        }
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
