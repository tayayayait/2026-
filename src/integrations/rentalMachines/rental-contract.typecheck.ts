import {
  buildOdcloudRentalMachineUrl,
  buildPublicRentalInfoUrl,
  mergeRentalData,
  normalizeOdcloudRentalItem,
  normalizePublicRentalItem,
  parsePublicRentalPayload,
} from "./rental-machines";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const publicUrl = buildPublicRentalInfoUrl("test-key", { pageNo: 2, numOfRows: 500 });
assert(
  publicUrl.includes("tn_pubr_public_frcn_rent_info_api"),
  "public rental URL endpoint mismatch",
);
assert(publicUrl.includes("serviceKey=test-key"), "public rental URL must include service key");
assert(publicUrl.includes("pageNo=2"), "public rental URL must include page number");
assert(publicUrl.includes("numOfRows=500"), "public rental URL must include row count");
assert(publicUrl.includes("type=json"), "public rental URL must request JSON");

const fullPublicUrl = new URL(
  buildPublicRentalInfoUrl("test-key", {
    pageNo: 1,
    numOfRows: 100,
    type: "xml",
    officeNm: "만경분소",
    officePhoneNumber: "063-540-4560",
    rdnmadr: "전북특별자치도 김제시",
    lnmadr: "전북특별자치도 김제시 만경읍",
    latitude: "35.839",
    longitude: "126.816",
    trctorHoldCo: "4+93",
    cultvtHoldCo: "4",
    manageHoldCo: "3",
    harvestHoldCo: "2",
    thresherHoldCo: "1",
    planterHoldCo: "2",
    transplantHoldCo: "5",
    rcepntHoldCo: "1",
    etcRentHoldCo: "굴착기 2대",
    phoneNumber: "063-540-4500",
    institutionNm: "김제시",
    referenceDate: "2026-05-31",
    instt_code: "4710000",
  }),
);
const expectedPublicParams = {
  pageNo: "1",
  numOfRows: "100",
  type: "xml",
  officeNm: "만경분소",
  officePhoneNumber: "063-540-4560",
  rdnmadr: "전북특별자치도 김제시",
  lnmadr: "전북특별자치도 김제시 만경읍",
  latitude: "35.839",
  longitude: "126.816",
  trctorHoldCo: "4+93",
  cultvtHoldCo: "4",
  manageHoldCo: "3",
  harvestHoldCo: "2",
  thresherHoldCo: "1",
  planterHoldCo: "2",
  transplantHoldCo: "5",
  rcepntHoldCo: "1",
  etcRentHoldCo: "굴착기 2대",
  phoneNumber: "063-540-4500",
  institutionNm: "김제시",
  referenceDate: "2026-05-31",
  instt_code: "4710000",
};
for (const [key, value] of Object.entries(expectedPublicParams)) {
  assert(fullPublicUrl.searchParams.get(key) === value, `public rental URL must include ${key}`);
}

const xmlRows = parsePublicRentalPayload(`
  <response>
    <header><resultCode>00</resultCode><resultMsg>NORMAL_CODE</resultMsg></header>
    <body><items><item>
      <officeNm>김제시 농기계임대사업소</officeNm>
      <latitude>35.839</latitude>
      <longitude>126.816</longitude>
      <trctorHoldCo>12</trctorHoldCo>
    </item></items></body>
  </response>
`);
assert(xmlRows.length === 1, "public rental XML should expose item rows");
assert(xmlRows[0]?.officeNm === "김제시 농기계임대사업소", "public rental XML office mismatch");
assert(xmlRows[0]?.trctorHoldCo === "12", "public rental XML holding count mismatch");

const publicRental = normalizePublicRentalItem({
  officeNm: "김제시 농기계임대사업소 만경분소",
  officePhoneNumber: "063-540-4560",
  rdnmadr: "전북특별자치도 김제시 만경읍 만경리 234-5",
  latitude: "35.839",
  longitude: "126.816",
  trctorHoldCo: "4+93",
  cultvtHoldCo: "4",
  planterHoldCo: "2",
  rcepntHoldCo: "1",
  etcRentHoldCo: "굴착기 2대(모델 4243)",
  institutionNm: "김제시",
  referenceDate: "2026-05-31",
  instt_code: "4710000",
});

assert(publicRental !== null, "public rental item should normalize");
assert(publicRental?.name === "김제시 농기계임대사업소 만경분소", "public rental name mismatch");
assert(publicRental?.lat === 35.839, "public rental latitude mismatch");
assert(publicRental?.lng === 126.816, "public rental longitude mismatch");
assert(publicRental?.institutionName === "김제시", "public rental institution name mismatch");
assert(publicRental?.referenceDate === "2026-05-31", "public rental reference date mismatch");
assert(publicRental?.institutionCode === "4710000", "public rental institution code mismatch");
assert(
  Boolean(
    publicRental?.machines.some((machine) => machine.type === "TRACTOR" && machine.count === 97),
  ),
  "public rental tractor count should parse additive count text",
);
assert(
  publicRental?.machines.every((machine) => machine.status === "REQUEST_ONLY") ?? false,
  "public holding counts must not be converted into live rental availability",
);
assert(
  publicRental?.machines
    .filter((machine) => machine.category !== "OTHER_RENTAL_INFO")
    .every((machine) => machine.availabilityBasis === "HOLDING_COUNT") ?? false,
  "public count fields must identify holding-count semantics",
);
assert(
  Boolean(
    publicRental?.machines.some((machine) => machine.type === "COMBINE" && machine.count === 1),
  ),
  "public rental rice harvest machine should map to combine",
);
const otherRentalInfo = publicRental?.machines.find(
  (machine) => machine.category === "OTHER_RENTAL_INFO",
);
assert(otherRentalInfo?.count === 0, "other rental information must not be parsed as a count");
assert(
  otherRentalInfo?.availabilityBasis === "HOLDING_INFO",
  "other rental information must identify information semantics",
);
assert(
  otherRentalInfo?.holdingText === "굴착기 2대(모델 4243)",
  "other rental information must preserve the provider text",
);

const odcloudUrl = buildOdcloudRentalMachineUrl("test-key", { page: 3, perPage: 100 });
assert(
  odcloudUrl.includes("/15111689/v1/uddi:42e3e3ab-7818-421f-b919-ffefde2d019d"),
  "ODCloud URL endpoint mismatch",
);
assert(odcloudUrl.includes("serviceKey=test-key"), "ODCloud URL must include service key");
assert(odcloudUrl.includes("page=3"), "ODCloud URL must include page");
assert(odcloudUrl.includes("perPage=100"), "ODCloud URL must include perPage");
assert(odcloudUrl.includes("returnType=JSON"), "ODCloud URL must request JSON");

const odcloudRental = normalizeOdcloudRentalItem(
  {
    임대사업소코드: 123,
    임대사업소명: "전주시 농기계임대사업소",
    동력기: "트랙터",
    작업기: "로터리",
    형식명: "45HP",
    "농기계 임대상태": "임대가능",
  },
  {
    lat: 35.8013,
    lng: 127.1086,
    phone: "063-000-0000",
    region: "전북특별자치도 전주시",
  },
);

assert(odcloudRental.name === "전주시 농기계임대사업소", "ODCloud rental name mismatch");
assert(odcloudRental.machines[0]?.type === "TRACTOR", "ODCloud machine type should infer tractor");
assert(odcloudRental.machines[0]?.status === "AVAILABLE", "ODCloud rental status mismatch");

const unavailableOdcloudRental = normalizeOdcloudRentalItem({
  임대사업소명: "전주시 농기계임대사업소",
  동력기: "트랙터",
  "농기계 임대상태": "임대불가능",
});
assert(
  unavailableOdcloudRental.machines[0]?.status === "UNAVAILABLE",
  "ODCloud unavailable text must not be classified as available",
);

const mergedRentals = mergeRentalData(
  [
    {
      id: "public-rental-gimje-mangyeong",
      name: "김제시 농기계임대사업소 만경분소",
      region: "전북특별자치도 김제시",
      lat: 35.839,
      lng: 126.816,
      phone: "063-540-4560",
      machines: [
        {
          id: "aggregate-tractor",
          type: "TRACTOR",
          name: "트랙터 및 작업기",
          status: "AVAILABLE",
          count: 97,
        },
      ],
    },
  ],
  [
    {
      id: "odcloud-rental-4710000-gimje-mangyeong",
      name: "김제시 농기계임대사업소 만경분소",
      region: "지역 확인 필요",
      lat: 0,
      lng: 0,
      machines: [
        {
          id: "odcloud-machine-1",
          type: "TRACTOR",
          name: "트랙터 로터리 45HP",
          status: "AVAILABLE",
          count: 1,
        },
      ],
    },
  ],
);

assert(mergedRentals.length === 1, "matching ODCloud rows must merge into public center");
assert(
  mergedRentals[0]?.id === "public-rental-gimje-mangyeong",
  "merged rental must preserve public-data center identity",
);
assert(
  mergedRentals[0]?.machines.some((machine) => machine.id === "odcloud-machine-1"),
  "merged rental must include ODCloud machine detail rows",
);
assert(
  mergedRentals[0]?.lat === 35.839 && mergedRentals[0]?.lng === 126.816,
  "merged rental must keep public-data coordinates",
);

console.log("rental machine integration contract tests passed");
