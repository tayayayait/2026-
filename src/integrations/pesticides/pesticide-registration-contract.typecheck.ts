import {
  buildPesticideRegistrationUrl,
  normalizePesticideRegistrationXml,
} from "./registration";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const listUrl = buildPesticideRegistrationUrl("test-key", {
  cropName: "벼",
  diseaseWeedName: "도열병",
  startPoint: 11,
});
assert(
  listUrl.startsWith("http://psis.rda.go.kr/openApi/service.do?"),
  "PERS endpoint mismatch",
);
assert(listUrl.includes("apiKey=test-key"), "PERS URL must include apiKey");
assert(listUrl.includes("serviceCode=SVC01"), "PERS URL must use SVC01");
assert(listUrl.includes("serviceType=AA001"), "PERS URL must request XML serviceType");
assert(listUrl.includes("displayCount=50"), "PERS URL must not exceed official displayCount max");
assert(listUrl.includes("cropCheck=Y"), "PERS URL must request exact crop matching by default");
assert(listUrl.includes("similarFlag=N"), "PERS URL must disable similar pest matching by default");
assert(
  listUrl.includes("cropName=%EB%B2%BC"),
  "PERS URL must encode cropName",
);
assert(
  listUrl.includes("diseaseWeedName=%EB%8F%84%EC%97%B4%EB%B3%91"),
  "PERS URL must encode diseaseWeedName",
);
assert(listUrl.includes("startPoint=11"), "PERS URL must include startPoint");

const registrations = normalizePesticideRegistrationXml(`
<document>
  <totalCount>1</totalCount>
  <list>
    <item>
      <cropName>벼</cropName>
      <cropCd>01101</cropCd>
      <cropLrclCd>01</cropLrclCd>
      <cropLrclNm>식량작물</cropLrclNm>
      <diseaseWeedName>도열병</diseaseWeedName>
      <useName>살균제</useName>
      <pestiKorName>입제</pestiKorName>
      <pestiBrandName>키타진</pestiBrandName>
      <compName>테스트농약</compName>
      <engName>isoprothiolane 12%</engName>
      <cmpaItmNm>제조</cmpaItmNm>
      <indictSymbl>16.1</indictSymbl>
      <applyFirstRegDate>20200101</applyFirstRegDate>
      <pestiCode>P001</pestiCode>
      <diseaseUseSeq>D001</diseaseUseSeq>
      <pestiUse>수확 전 경엽처리</pestiUse>
      <dilutUnit>1000배</dilutUnit>
      <useSuittime>수확14일전</useSuittime>
      <useNum>3회 이내</useNum>
    </item>
  </list>
</document>
`);

assert(registrations.length === 1, "PERS should normalize one registration");
assert(registrations[0]?.id === "P001-D001", "PERS stable id mismatch");
assert(registrations[0]?.brandName === "키타진", "PERS brand name mismatch");
assert(registrations[0]?.productName === "입제", "PERS product name mismatch");
assert(registrations[0]?.cropName === "벼", "PERS crop name mismatch");
assert(registrations[0]?.diseaseWeedName === "도열병", "PERS disease name mismatch");
assert(registrations[0]?.useName === "살균제", "PERS useName mismatch");
assert(registrations[0]?.useMethod === "수확 전 경엽처리", "PERS use method mismatch");
assert(registrations[0]?.dilutionUnit === "1000배", "PERS dilution mismatch");
assert(registrations[0]?.phiDays === 14, "PERS PHI (useSuittime) must parse to 14");
assert(registrations[0]?.useCount === 3, "PERS use count mismatch");
assert(registrations[0]?.company === "테스트농약", "PERS company mismatch");
assert(registrations[0]?.activeIngredient === "isoprothiolane 12%", "PERS active ingredient mismatch");
assert(registrations[0]?.importType === "제조", "PERS import type mismatch");
assert(registrations[0]?.actionMechanism === "16.1", "PERS action mechanism mismatch");
assert(registrations[0]?.registrationDate === "20200101", "PERS registration date mismatch");
assert(registrations[0]?.pestiCode === "P001", "PERS pestiCode mismatch");
assert(registrations[0]?.diseaseUseSeq === "D001", "PERS diseaseUseSeq mismatch");
assert(registrations[0]?.cropCode === "01101", "PERS crop code mismatch");
assert(registrations[0]?.cropCategoryCode === "01", "PERS crop category code mismatch");
assert(registrations[0]?.cropCategoryName === "식량작물", "PERS crop category name mismatch");

const safeUseTextRegistrations = normalizePesticideRegistrationXml(`
<document>
  <totalCount>1</totalCount>
  <list>
    <item>
      <cropName>감자</cropName>
      <diseaseWeedName>역병</diseaseWeedName>
      <pestiBrandName>테스트약제</pestiBrandName>
      <pestiCode>P002</pestiCode>
      <diseaseUseSeq>D002</diseaseUseSeq>
      <useSuittime>수확7일전</useSuittime>
      <useNum>4회</useNum>
    </item>
  </list>
</document>
`);
assert(safeUseTextRegistrations[0]?.phiDays === 7, "PERS text PHI must parse 수확7일전 to 7");
assert(safeUseTextRegistrations[0]?.useCount === 4, "PERS text useNum must parse 4회 to 4");

const similarUrl = buildPesticideRegistrationUrl("test-key", {
  cropName: "벼",
  diseaseWeedName: "갈색매미충",
  displayCount: 200,
  exactCrop: false,
  similarPest: true,
});
assert(similarUrl.includes("displayCount=50"), "PERS displayCount must be clamped to 50");
assert(!similarUrl.includes("cropCheck=Y"), "PERS exact crop flag must be optional");
assert(similarUrl.includes("similarFlag=Y"), "PERS similar pest flag mismatch");

const emptyRegistrations = normalizePesticideRegistrationXml(`
<document>
  <totalCount>0</totalCount>
  <list></list>
</document>
`);
assert(emptyRegistrations.length === 0, "PERS empty list must normalize to []");

let persErrorThrown = false;
try {
  normalizePesticideRegistrationXml(`
  <document>
    <errorCode>ERR_101</errorCode>
    <errorMsg>인증키를 입력하지 않은 경우 발생</errorMsg>
  </document>
  `);
} catch {
  persErrorThrown = true;
}
assert(persErrorThrown, "PERS ERR_101 must throw an error");

console.log("PERS pesticide registration contract tests passed");
