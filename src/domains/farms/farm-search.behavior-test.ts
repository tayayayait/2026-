import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as registration from "./registration";

const searchConfig = registration as typeof registration & {
  JEONBUK_SEARCH_REGIONS?: Array<{
    id: string;
    label: string;
    address: string;
    lat: number;
    lng: number;
  }>;
};

assert(
  Array.isArray(searchConfig.JEONBUK_SEARCH_REGIONS),
  "farm search must expose Jeonbuk regional presets",
);
assert.equal(
  searchConfig.JEONBUK_SEARCH_REGIONS?.length,
  14,
  "farm search must expose all 14 Jeonbuk cities and counties",
);
assert(
  searchConfig.JEONBUK_SEARCH_REGIONS?.every(
    (region) => region.address.startsWith("전북특별자치도") && region.lat > 0 && region.lng > 0,
  ),
  "regional presets must include usable Jeonbuk addresses and coordinates",
);

const panelSource = await readFile(
  new URL("../../components/farm-registration-form-panel.tsx", import.meta.url),
  "utf8",
);
for (const requiredLabel of ["팜맵 검색", "주소", "지역", "지번", "도로명"]) {
  assert(
    panelSource.includes(requiredLabel),
    `farm search panel must render the ${requiredLabel} control`,
  );
}
assert(
  panelSource.includes("JEONBUK_SEARCH_REGIONS"),
  "farm search panel must render regional presets",
);

const addressSearchModule = (await import("../../integrations/farmMap/address-search").catch(
  () => ({}),
)) as {
  searchOfficialFarmMapAddress?: (
    query: string,
    type: "PARCEL" | "ROAD",
    config?: Record<string, unknown>,
  ) => Promise<{
    addresses: Array<{ roadAddress: string; jibunAddress: string; x: string; y: string }>;
  }>;
};
assert.equal(
  typeof addressSearchModule.searchOfficialFarmMapAddress,
  "function",
  "official-style address search integration must be implemented",
);

if (addressSearchModule.searchOfficialFarmMapAddress) {
  const parcelResponse = await addressSearchModule.searchOfficialFarmMapAddress(
    "전주시 덕진구 강흥동 118-2",
    "PARCEL",
    {
      vworldApiKey: "vworld-key",
      fetcher: async (input: string | URL | Request) => {
        const url = new URL(String(input));
        assert.equal(url.hostname, "api.vworld.kr");
        assert.equal(url.searchParams.get("category"), "parcel");
        assert.equal(url.searchParams.get("crs"), "EPSG:4326");
        return new Response(
          JSON.stringify({
            response: {
              status: "OK",
              record: { total: "1" },
              result: {
                items: [
                  {
                    id: "4511312600101180002",
                    address: {
                      road: "",
                      parcel: "전북특별자치도 전주시 덕진구 강흥동 118-2",
                    },
                    point: { x: "127.083", y: "35.916" },
                  },
                ],
              },
            },
          }),
        );
      },
    },
  );
  assert.equal(parcelResponse.addresses[0]?.jibunAddress, "전북특별자치도 전주시 덕진구 강흥동 118-2");
  assert.equal(parcelResponse.addresses[0]?.x, "127.083");

  const roadCalls: string[] = [];
  const roadResponse = await addressSearchModule.searchOfficialFarmMapAddress(
    "전주시 기린대로 213",
    "ROAD",
    {
      jusoRoadApiKey: "road-key",
      jusoCoordApiKey: "coord-key",
      fetcher: async (input: string | URL | Request) => {
        const url = new URL(String(input));
        roadCalls.push(url.pathname);
        if (url.pathname.endsWith("addrLinkApi.do")) {
          return new Response(
            JSON.stringify({
              results: {
                common: { errorCode: "0", totalCount: "1" },
                juso: [
                  {
                    roadAddr: "전북특별자치도 전주시 덕진구 기린대로 213",
                    jibunAddr: "전북특별자치도 전주시 덕진구 서노송동 568-1",
                    admCd: "4511310100",
                    rnMgtSn: "451133266018",
                    udrtYn: "0",
                    buldMnnm: "213",
                    buldSlno: "0",
                  },
                ],
              },
            }),
          );
        }
        return new Response(
          JSON.stringify({
            results: {
              common: { errorCode: "0" },
              juso: [{ entX: "127.141", entY: "35.824" }],
            },
          }),
        );
      },
    },
  );
  assert.equal(roadCalls.length, 2, "road search must resolve both address and coordinates");
  assert.equal(roadResponse.addresses[0]?.roadAddress, "전북특별자치도 전주시 덕진구 기린대로 213");
  assert.equal(roadResponse.addresses[0]?.y, "35.824");
}

console.log("FarmMap search panel behavior tests passed");
