import type { Farm, Crop } from "../domains/farms/types";
import type { PestCandidate } from "../domains/pests/types";
import type { Rental } from "../domains/machines/types";
import type { WorkType } from "../domains/shared/types";
import type { WeatherData } from "../integrations/kma/types";

export const REGIONS = [
  { name: "전주시 완산구", lat: 35.8013, lng: 127.1086 },
  { name: "전주시 덕진구", lat: 35.8467, lng: 127.1356 },
  { name: "익산시 함열읍", lat: 36.0734, lng: 126.9818 },
  { name: "군산시 옥산면", lat: 35.9678, lng: 126.7368 },
  { name: "정읍시 신태인읍", lat: 35.6293, lng: 126.8801 },
  { name: "남원시 대강면", lat: 35.4156, lng: 127.5234 },
  { name: "김제시 만경읍", lat: 35.8421, lng: 126.8123 },
  { name: "완주군 봉동읍", lat: 35.9356, lng: 127.1656 },
  { name: "고창군 무장면", lat: 35.4334, lng: 126.6789 },
  { name: "부안군 변산면", lat: 35.7298, lng: 126.7456 },
];

export const SAMPLE_FARMS: Farm[] = [
  {
    id: "demo-farm-1",
    name: "만경 벼 농장",
    address: "전북특별자치도 김제시 만경읍 만경리 234-5",
    region: "김제시 만경읍",
    lat: 35.8421,
    lng: 126.8123,
    crop: "벼",
    area: 12000,
    growthStageCode: "18603",
    interestedWork: ["방제", "관수", "배수"],
    createdAt: "2026-06-10T09:00:00Z",
  },
  {
    id: "demo-farm-2",
    name: "신태인 고추밭",
    address: "전북특별자치도 정읍시 신태인읍 화호리 102",
    region: "정읍시 신태인읍",
    lat: 35.6293,
    lng: 126.8801,
    crop: "고추",
    area: 4500,
    growthStageCode: "18604",
    interestedWork: ["방제", "관수"],
    createdAt: "2026-06-12T08:00:00Z",
  },
  {
    id: "demo-farm-3",
    name: "완주 사과 과원",
    address: "전북특별자치도 완주군 봉동읍 구미리 88",
    region: "완주군 봉동읍",
    lat: 35.9356,
    lng: 127.1656,
    crop: "사과",
    area: 8200,
    growthStageCode: "18605",
    interestedWork: ["방제", "제초"],
    createdAt: "2026-06-14T08:00:00Z",
  },
];

export const SAMPLE_WEATHER: Record<string, WeatherData> = {
  "김제시 만경읍": {
    region: "김제시 만경읍",
    temperature: 28.4,
    humidity: 86,
    rainfall: 32,
    rainfallForecast: 45,
    wind: 2.1,
    updatedAt: "2026-06-17T09:00:00+09:00",
  },
  "정읍시 신태인읍": {
    region: "정읍시 신태인읍",
    temperature: 29.1,
    humidity: 78,
    rainfall: 8,
    rainfallForecast: 12,
    wind: 1.5,
    updatedAt: "2026-06-17T09:00:00+09:00",
  },
  "완주군 봉동읍": {
    region: "완주군 봉동읍",
    temperature: 26.8,
    humidity: 72,
    rainfall: 4,
    rainfallForecast: 6,
    wind: 1.8,
    updatedAt: "2026-06-17T09:00:00+09:00",
  },
};

export const PEST_DB: PestCandidate[] = [
  {
    sickKey: "pest-rice-blast",
    name: "벼 도열병",
    type: "DISEASE",
    crop: "벼",
    probability: 90,
    symptoms: "고온다습 조건에서 잎에 갈색 병반이 발생할 수 있습니다.",
    image: "rice leaf with brown lesions",
  },
  {
    sickKey: "pest-rice-planthopper",
    name: "벼멸구",
    type: "INSECT",
    crop: "벼",
    probability: 60,
    symptoms: "장마 직후 포장 밀도가 높을 때 흡즙 피해가 증가합니다.",
    image: "small brown plant hoppers on rice stem",
  },
  {
    sickKey: "pest-pepper-anthracnose",
    name: "고추 탄저병",
    type: "DISEASE",
    crop: "고추",
    probability: 95,
    symptoms: "착과기 이후 강우가 지속되면 과실에 움푹 팬 병반이 생깁니다.",
    image: "pepper fruit with dark sunken lesions",
  },
  {
    sickKey: "pest-pepper-aphid",
    name: "진딧물",
    type: "INSECT",
    crop: "고추",
    probability: 55,
    symptoms: "고온 건조한 시기에 새순 주변에서 군집 피해가 발생합니다.",
    image: "aphids on pepper leaves",
  },
  {
    sickKey: "pest-apple-bitter-rot",
    name: "사과 탄저병",
    type: "DISEASE",
    crop: "사과",
    probability: 70,
    symptoms: "강우 후 고온다습 조건에서 과실 병반이 확대될 수 있습니다.",
    image: "apple fruit rot lesions",
  },
];

export const SAMPLE_RENTALS: Rental[] = [
  {
    id: "rental-gimje-1",
    name: "김제시 농기계임대사업소 만경분소",
    region: "김제시 만경읍",
    lat: 35.839,
    lng: 126.816,
    phone: "063-540-4560",
    machines: [
      { id: "m1", type: "OTHER", name: "SS기", status: "AVAILABLE", count: 3 },
      { id: "m2", type: "DRONE", name: "방제 드론", status: "LIMITED", count: 1 },
      { id: "m3", type: "OTHER", name: "관수 펌프", status: "AVAILABLE", count: 4 },
      { id: "m4", type: "OTHER", name: "배수 펌프", status: "AVAILABLE", count: 2 },
      { id: "m5", type: "COMBINE", name: "콤바인", status: "REQUEST_ONLY", count: 1 },
      { id: "m6", type: "PLANTER", name: "파종기", status: "AVAILABLE", count: 2 },
      { id: "m7", type: "TRACTOR", name: "트랙터", status: "AVAILABLE", count: 5 },
    ],
  },
  {
    id: "rental-jeongeup-1",
    name: "정읍시 농기계임대사업소 신태인분소",
    region: "정읍시 신태인읍",
    lat: 35.632,
    lng: 126.884,
    phone: "063-539-6260",
    machines: [
      { id: "m8", type: "DRONE", name: "방제 드론", status: "AVAILABLE", count: 2 },
      { id: "m9", type: "CULTIVATOR", name: "관리기", status: "AVAILABLE", count: 4 },
      { id: "m10", type: "TRACTOR", name: "트랙터", status: "LIMITED", count: 1 },
    ],
  },
];

export const CROPS: Crop[] = ["감귤", "감자", "고추", "벼", "배", "사과", "파", "포도"];
export const WORKS: WorkType[] = ["방제", "관수", "배수", "수확", "파종", "정식", "제초"];
