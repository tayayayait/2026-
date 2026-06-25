import assert from "node:assert/strict";

const farmMapModule = await import("./farmmap-contract");
const normalizeFarmMapPayload = Reflect.get(farmMapModule, "normalizeFarmMapPayload");

assert.equal(
  typeof normalizeFarmMapPayload,
  "function",
  "Phase 1 must expose one normalizer for Korean and English FarmMap payloads",
);

const context = {
  lat: 35.8421,
  lng: 126.8123,
  representativeAddress: "전북특별자치도 김제시 만경읍",
};

const englishResult = normalizeFarmMapPayload(
  {
    status: { result: "S" },
    output: {
      farmmapData: {
        data: [
          {
            id: "451301230000001",
            pnu: "4513012300100010000",
            stdg_addr: "전북특별자치도 김제시 만경읍 만경리",
            clsf_nm: "논",
            ldcg_cd: "답",
            area: "1234.5",
            cad_con_ra: "98.7",
            flight_ymd: "20230401",
            updt_ymd: "20240507",
          },
        ],
      },
    },
  },
  context,
);

assert.equal(englishResult.parcels[0]?.farmMapId, "451301230000001");
assert.equal(englishResult.parcels[0]?.legalDongAddress, "전북특별자치도 김제시 만경읍 만경리");
assert.equal(englishResult.parcels[0]?.landCategory, "답");
assert.equal(englishResult.parcels[0]?.aerialPhotoYear, "2023");
assert.equal(englishResult.parcels[0]?.updatedYear, "2024");

const koreanRaw = {
  대표PNU: "4513012300100020000",
  법정동주소: "전북특별자치도 김제시 만경읍 장산리",
  분류명: "밭",
  대표지목: "전",
  면적: 3965.048,
  지적일치율: 87.3,
};
const koreanResult = normalizeFarmMapPayload(
  {
    output: {
      farmmapData: {
        data: [koreanRaw],
      },
    },
  },
  context,
);

assert.equal(koreanResult.status, "SUCCESS");
assert.equal(koreanResult.parcels[0]?.pnu, "4513012300100020000");
assert.equal(koreanResult.parcels[0]?.cropLandType, "밭");
assert.equal(koreanResult.parcels[0]?.areaSquareMeter, 3965.048);
assert.equal(koreanResult.parcels[0]?.cadastralMatchRate, 87.3);
assert.deepEqual(koreanResult.parcels[0]?.raw, koreanRaw);

console.log("FarmMap unified payload normalizer tests passed");
