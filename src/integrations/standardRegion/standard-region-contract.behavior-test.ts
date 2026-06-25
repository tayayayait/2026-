import assert from "node:assert/strict";

const contractModule = await import("./standard-region-contract").catch(() => ({}));
const domainModule = await import("../../domains/farms/standard-region").catch(() => ({}));

const buildStandardRegionUrl = Reflect.get(contractModule, "buildStandardRegionUrl");
const normalizeStandardRegionPayload = Reflect.get(contractModule, "normalizeStandardRegionPayload");
const parseStandardRegionResponseText = Reflect.get(contractModule, "parseStandardRegionResponseText");
const getStandardRegionLevel = Reflect.get(domainModule, "getStandardRegionLevel");
const selectStandardRegionChildren = Reflect.get(domainModule, "selectStandardRegionChildren");

assert.equal(typeof buildStandardRegionUrl, "function", "Standard-region URL builder must exist");
const url = new URL(
  buildStandardRegionUrl("test-key", {
    query: "김제시 만경읍",
    pageNo: 2,
    numOfRows: 50,
  }),
);
assert(url.pathname.endsWith("/StanReginCd/getStanReginCdList"), "Standard-region endpoint mismatch");
assert.equal(url.searchParams.get("ServiceKey"), "test-key");
assert.equal(url.searchParams.get("type"), "json");
assert.equal(url.searchParams.get("pageNo"), "2");
assert.equal(url.searchParams.get("numOfRows"), "50");
assert.equal(url.searchParams.get("flag"), "Y");
assert.equal(url.searchParams.get("locatadd_nm"), "김제시 만경읍");

assert.equal(typeof normalizeStandardRegionPayload, "function", "Standard-region parser must exist");
const normalized = normalizeStandardRegionPayload({
  StanReginCd: [
    { head: [{ totalCount: 4 }, { RESULT: { resultCode: "INFO-0", resultMsg: "정상" } }] },
    {
      row: [
        { region_cd: "4500000000", sido_cd: "45", sgg_cd: "000", umd_cd: "000", ri_cd: "00", locatadd_nm: "전북특별자치도", locathigh_cd: "0000000000", locallow_nm: "전북특별자치도" },
        { region_cd: "4513000000", sido_cd: "45", sgg_cd: "130", umd_cd: "000", ri_cd: "00", locatadd_nm: "전북특별자치도 김제시", locathigh_cd: "4500000000", locallow_nm: "김제시" },
        { region_cd: "4513035000", sido_cd: "45", sgg_cd: "130", umd_cd: "350", ri_cd: "00", locatadd_nm: "전북특별자치도 김제시 만경읍", locathigh_cd: "4513000000", locallow_nm: "만경읍" },
        { region_cd: "4513035021", sido_cd: "45", sgg_cd: "130", umd_cd: "350", ri_cd: "21", locatadd_nm: "전북특별자치도 김제시 만경읍 만경리", locathigh_cd: "4513035000", locallow_nm: "만경리" },
      ],
    },
  ],
});
assert.equal(normalized.totalCount, 4);
assert.equal(normalized.rows[3]?.regionCode, "4513035021");
assert.equal(normalized.rows[3]?.addressName, "전북특별자치도 김제시 만경읍 만경리");

assert.equal(typeof parseStandardRegionResponseText, "function", "Standard-region text parser must exist");
const xmlResult = parseStandardRegionResponseText(`
  <response><body><totalCount>1</totalCount><pageNo>1</pageNo><numOfRows>10</numOfRows>
    <row><region_cd>4513035021</region_cd><locatadd_nm>전북특별자치도 김제시 만경읍 만경리</locatadd_nm><sido_cd>45</sido_cd><sgg_cd>130</sgg_cd><umd_cd>350</umd_cd><ri_cd>21</ri_cd><locathigh_cd>4513035000</locathigh_cd><locallow_nm>만경리</locallow_nm></row>
  </body></response>
`);
assert.equal(xmlResult.rows[0]?.regionCode, "4513035021");

assert.equal(typeof getStandardRegionLevel, "function", "Standard-region level resolver must exist");
assert.equal(getStandardRegionLevel(normalized.rows[0]), "SIDO");
assert.equal(getStandardRegionLevel(normalized.rows[1]), "SIGUNGU");
assert.equal(getStandardRegionLevel(normalized.rows[2]), "EUP_MYEON_DONG");
assert.equal(getStandardRegionLevel(normalized.rows[3]), "RI");

assert.equal(typeof selectStandardRegionChildren, "function", "Standard-region child selector must exist");
assert.deepEqual(
  selectStandardRegionChildren(normalized.rows, "4513000000").map((row: { regionCode: string }) => row.regionCode),
  ["4513035000"],
);

console.log("standard-region contract behavior tests passed");
