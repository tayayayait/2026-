import {
  buildRdaPestOccurrenceListUrl,
  buildRdaPestOccurrenceYearsUrl,
  normalizeRdaOccurrenceListXml,
  normalizeRdaOccurrenceYearsXml,
} from "./pest-occurrence";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const yearsUrl = buildRdaPestOccurrenceYearsUrl("test-key");
assert(
  yearsUrl ===
    "http://api.nongsaro.go.kr/service/dbyhsCccrrncInfo/dbyhsCccrrncInfoYear?apiKey=test-key",
  "RDA occurrence years URL mismatch",
);

const listUrl = buildRdaPestOccurrenceListUrl("test-key", {
  sYear: "2026",
  sType: "sCntntsSj",
  sText: "도열병",
  pageNo: 2,
});
assert(listUrl.includes("/dbyhsCccrrncInfoList?"), "RDA occurrence list endpoint mismatch");
assert(listUrl.includes("apiKey=test-key"), "RDA occurrence list URL must include apiKey");
assert(listUrl.includes("sYear=2026"), "RDA occurrence list URL must include sYear");
assert(listUrl.includes("sType=sCntntsSj"), "RDA occurrence list URL must include sType");
assert(
  listUrl.includes("sText=%EB%8F%84%EC%97%B4%EB%B3%91"),
  "RDA occurrence list URL must encode search text",
);
assert(listUrl.includes("pageNo=2"), "RDA occurrence list URL must include pageNo");

const years = normalizeRdaOccurrenceYearsXml(`
<response>
  <body>
    <items>
      <item><yearCode>2026</yearCode><yearCnt>12</yearCnt></item>
    </items>
  </body>
</response>
`);
assert(years[0]?.yearCode === "2026", "RDA occurrence year code mismatch");
assert(years[0]?.yearCount === 12, "RDA occurrence year count mismatch");

const occurrences = normalizeRdaOccurrenceListXml(`
<response>
  <body>
    <items>
      <item>
        <cntntsSj>벼 도열병 발생정보</cntntsSj>
        <updusrEsntlNm>농촌진흥청</updusrEsntlNm>
        <registDt>2026-06-18</registDt>
        <cntntsRdcnt>5</cntntsRdcnt>
        <downFile>https://example.test/file.pdf</downFile>
        <rtnOrginlFileNm>notice.pdf</rtnOrginlFileNm>
        <cntntsNo>100</cntntsNo>
      </item>
      <numOfRows>10</numOfRows>
      <totalCount>1</totalCount>
      <pageNo>1</pageNo>
    </items>
  </body>
</response>
`);

assert(occurrences.items.length === 1, "RDA occurrence list should produce one item");
assert(occurrences.items[0]?.title === "벼 도열병 발생정보", "RDA occurrence title mismatch");
assert(
  occurrences.items[0]?.fileUrl === "https://example.test/file.pdf",
  "RDA occurrence file URL mismatch",
);
assert(occurrences.pageNo === 1, "RDA occurrence pageNo mismatch");
assert(occurrences.totalCount === 1, "RDA occurrence totalCount mismatch");

console.log("RDA pest occurrence contract tests passed");
