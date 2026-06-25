import {
  buildFarmMapRadiusUrl,
  normalizeFarmMapRadiusPayload,
  parseFarmMapJsonp,
} from "./farmmap-contract";
import * as farmMapContract from "./farmmap-contract";
import type { FarmMapParcelSearchResult } from "../../domains/farms/types";

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const input = {
  lat: 35.8421,
  lng: 126.8123,
  radiusMeters: 500,
  representativeAddress: "전북특별자치도 김제시 만경읍",
};

const url = new URL(buildFarmMapRadiusUrl("test-key", "registered.example", input));
assert(
  url.origin + url.pathname ===
    "https://agis.epis.or.kr/ASD/farmmapApi/getFarmmapDataSeachRadius.do",
  "FarmMap radius endpoint mismatch",
);
assert(url.searchParams.get("apiKey") === "test-key", "FarmMap API key mismatch");
assert(url.searchParams.get("domain") === "registered.example", "FarmMap domain mismatch");
assert(url.searchParams.get("x") === "126.8123", "FarmMap x must use longitude");
assert(url.searchParams.get("y") === "35.8421", "FarmMap y must use latitude");
assert(url.searchParams.get("radius") === "500", "FarmMap radius mismatch");
assert(url.searchParams.get("mapType") === "farmmap", "FarmMap mapType mismatch");
assert(url.searchParams.get("apiVersion") === "v2", "FarmMap API version mismatch");
assert(url.searchParams.get("epsg") === "EPSG:4326", "FarmMap EPSG mismatch");
assert(url.searchParams.get("columnType") === "ENG", "FarmMap column type mismatch");
assert(url.searchParams.get("callback") === "farmMapCallback", "FarmMap callback mismatch");

const buildFarmMapPointUrl = (
  farmMapContract as unknown as {
    buildFarmMapPointUrl?: typeof buildFarmMapRadiusUrl;
  }
).buildFarmMapPointUrl;
assert(typeof buildFarmMapPointUrl === "function", "FarmMap point URL builder must be implemented");
if (!buildFarmMapPointUrl) throw new Error("FarmMap point URL builder is unavailable");

const pointUrl = new URL(buildFarmMapPointUrl("test-key", "registered.example", input));
assert(
  pointUrl.pathname.endsWith("/farmmapApi/getFarmmapDataSeachXY.do"),
  "FarmMap point endpoint mismatch",
);
assert(pointUrl.searchParams.get("x") === "126.8123", "FarmMap point x must use longitude");
assert(pointUrl.searchParams.get("y") === "35.8421", "FarmMap point y must use latitude");
assert(pointUrl.searchParams.get("epsg") === "EPSG:4326", "FarmMap point EPSG mismatch");
assert(pointUrl.searchParams.get("mapType") === "farmmap", "FarmMap point map type mismatch");
assert(pointUrl.searchParams.get("apiVersion") === "v2", "FarmMap point API version mismatch");

const payload = parseFarmMapJsonp(
  `farmMapCallback(${JSON.stringify({
    status: { result: "S" },
    output: {
      farmmapData: {
        count: 1,
        data: [
          {
            id: "451301230000001",
            uid: "12345",
            clsf_nm: "논",
            pnu: "4513012300100010000",
            ldcg_cd: "답",
            stdg_addr: "전북특별자치도 김제시 만경읍",
            area: "1234.5",
            cad_con_ra: "98.7",
            flight_ymd: "20230401",
            updt_ymd: "20240507",
            geometry: [
              {
                type: "MultiPolygon",
                xy: [
                  { x: 937877.9193, y: 1760774.1791 },
                  { x: 937950.4153, y: 1760774.1791 },
                  { x: 937950.4153, y: 1760830.6971 },
                  { x: 937877.9193, y: 1760830.6971 },
                  { x: 937877.9193, y: 1760774.1791 },
                ],
              },
            ],
          },
        ],
      },
    },
  })})`,
);

const result: FarmMapParcelSearchResult = normalizeFarmMapRadiusPayload(payload, input);
assert(result.status === "SUCCESS", "FarmMap success payload status mismatch");
assert(result.parcels.length === 1, "FarmMap parcel count mismatch");
const parcel = result.parcels[0];
assert(parcel?.farmMapId === "451301230000001", "FarmMap id mapping mismatch");
assert(parcel.pnu === "4513012300100010000", "FarmMap PNU mapping mismatch");
assert(parcel.cropLandType === "논", "FarmMap crop-land mapping mismatch");
assert(parcel.landCategory === "답", "FarmMap land-category mapping mismatch");
assert(parcel.areaSquareMeter === 1234.5, "FarmMap area mapping mismatch");
assert(parcel.cadastralMatchRate === 98.7, "FarmMap cadastral rate mapping mismatch");
assert(parcel.updatedYear === "2024", "FarmMap update year mapping mismatch");
assert(parcel.geometry?.coordinates[0]?.length === 5, "FarmMap polygon mapping mismatch");
assert(
  parcel.centroid.lat > 35.83 && parcel.centroid.lat < 35.85,
  "FarmMap EPSG:5179 centroid latitude mismatch",
);
assert(
  parcel.centroid.lng > 126.8 && parcel.centroid.lng < 126.82,
  "FarmMap EPSG:5179 centroid longitude mismatch",
);

let failureMessage = "";
try {
  normalizeFarmMapRadiusPayload(
    { status: { result: "F", errorMsg: "요청서버의 도메인과 등록하신 도메인 정보가 다릅니다." } },
    input,
  );
} catch (error) {
  failureMessage = error instanceof Error ? error.message : "";
}
assert(failureMessage.includes("도메인"), "FarmMap failure response must expose its cause");

console.log("FarmMap integration contract tests passed");
