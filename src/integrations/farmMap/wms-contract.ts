const FARMMAP_WMS_ENDPOINT = "https://agis.epis.or.kr/ASD/farmmapApi/wms.do";

export interface FarmMapWmsRequest {
  bbox: string;
  width: number;
  height: number;
}

export const buildFarmMapWmsUrl = (
  apiKey: string,
  domain: string,
  input: FarmMapWmsRequest,
  endpoint = FARMMAP_WMS_ENDPOINT,
) => {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    service: "WMS",
    version: "1.1.1",
    request: "GetMap",
    format: "image/png",
    transparent: "true",
    crs: "EPSG:3857",
    srs: "EPSG:3857",
    layers: "farm_map_api",
    styles: "01",
    landcd: "01,02,03,04",
    apiKey,
    domain,
    width: String(input.width),
    height: String(input.height),
    bbox: input.bbox,
  }).toString();
  return url.toString();
};
