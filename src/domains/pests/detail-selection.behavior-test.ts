import {
  getPestTypeLabel,
  normalizeNcpmsPestDetail,
  selectPestDetailRequests,
} from "./detail-selection";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const requests = selectPestDetailRequests(
  [
    { id: "D1", name: "도열병", type: "DISEASE", crop: "벼" },
    { id: "I1", name: "벼멸구", type: "INSECT", crop: "벼" },
    { id: "W1", name: "피", type: "WEED", crop: "벼" },
  ],
  3,
);

assert(requests.length === 3, "detail requests should include disease, insect, and weed");
assert(requests[0]?.detailType === "DISEASE", "first request should be disease");
assert(requests[0]?.detailServiceCode === "SVC05", "disease request must default to SVC05");
assert(requests[1]?.detailType === "INSECT", "second request should be insect");
assert(requests[1]?.detailServiceCode === "SVC07", "insect request must default to SVC07");
assert(requests[2]?.detailType === "WEED", "third request should be weed");
assert(requests[2]?.detailServiceCode === "SVC10", "weed request must default to SVC10");

const diseaseDetail = normalizeNcpmsPestDetail({
  detailType: "DISEASE",
  detail: {
    id: "D1",
    crop: "벼",
    name: "도열병",
    symptoms: "잎에 병반이 생김",
    developmentCondition: "고온다습",
    preventionMethod: "예찰과 적기 방제",
    imageUrls: ["https://example.test/disease.jpg"],
  },
});

assert(diseaseDetail.title === "도열병", "disease detail title mismatch");
assert(diseaseDetail.primaryLabel === "증상", "disease primary label mismatch");
assert(diseaseDetail.primaryText === "잎에 병반이 생김", "disease primary text mismatch");
assert(diseaseDetail.secondaryLabel === "발생환경", "disease secondary label mismatch");
assert(diseaseDetail.imageUrl === "https://example.test/disease.jpg", "disease image mismatch");

const insectDetail = normalizeNcpmsPestDetail({
  detailType: "INSECT",
  detail: {
    id: "I1",
    crop: "벼",
    name: "벼멸구",
    ecologyInfo: "논에서 증식",
    damageInfo: "흡즙 피해",
    preventMethod: "예찰 후 방제",
    imageUrls: [],
  },
});

assert(insectDetail.primaryLabel === "피해정보", "insect primary label mismatch");
assert(insectDetail.primaryText === "흡즙 피해", "insect primary text mismatch");
assert(insectDetail.secondaryLabel === "생태정보", "insect secondary label mismatch");

const weedDetail = normalizeNcpmsPestDetail({
  detailType: "WEED",
  detail: {
    id: "W1",
    crop: "",
    name: "피",
    scientificName: "Echinochloa crus-galli",
    family: "벼과",
    japaneseName: "イヌビエ",
    englishName: "barnyard grass",
    shape: "잎은 길고 편평하다.",
    ecology: "한해살이풀",
    habitat: "논과 습지",
    literature: "잡초도감",
    imageUrls: ["https://example.test/weed.jpg"],
  },
});

assert(weedDetail.type === "WEED", "weed detail type mismatch");
assert(weedDetail.primaryLabel === "형태", "weed primary label mismatch");
assert(weedDetail.primaryText === "잎은 길고 편평하다.", "weed primary text mismatch");
assert(weedDetail.secondaryLabel === "생태", "weed secondary label mismatch");
assert(weedDetail.secondaryText === "한해살이풀", "weed secondary text mismatch");
assert(weedDetail.additionalDetails[0]?.label === "서식지", "weed habitat label mismatch");
assert(weedDetail.additionalDetails[0]?.text === "논과 습지", "weed habitat text mismatch");
assert(weedDetail.additionalDetails[1]?.label === "학명", "weed scientific name label mismatch");
assert(
  weedDetail.additionalDetails[1]?.text === "Echinochloa crus-galli",
  "weed scientific name mismatch",
);
assert(weedDetail.additionalDetails[2]?.label === "과명", "weed family label mismatch");
assert(weedDetail.additionalDetails[3]?.label === "참고문헌", "weed literature label mismatch");
assert(getPestTypeLabel("DISEASE") === "병", "disease label mismatch");
assert(getPestTypeLabel("INSECT") === "해충", "insect label mismatch");
assert(getPestTypeLabel("WEED") === "잡초", "weed label mismatch");

console.log("pest detail selection behavior tests passed");
