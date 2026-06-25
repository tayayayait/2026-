const FARMMAP_WFS_ENDPOINT = "https://agis.epis.or.kr/ASD/farmmapApi/wfs.do";

export interface FarmMapWfsRequest {
  bbox: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  };
}

const formatEpsg4326Bbox = ({ minLng, minLat, maxLng, maxLat }: FarmMapWfsRequest["bbox"]) =>
  `${minLat},${minLng},${maxLat},${maxLng},EPSG:4326`;

export const buildFarmMapWfsUrl = (
  apiKey: string,
  domain: string,
  input: FarmMapWfsRequest,
  endpoint = FARMMAP_WFS_ENDPOINT,
) => {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typename: "farm_map_api",
    srsname: "EPSG:4326",
    outputformat: "json",
    count: "200",
    apiKey,
    domain,
    bbox: formatEpsg4326Bbox(input.bbox),
  }).toString();
  return url.toString();
};
