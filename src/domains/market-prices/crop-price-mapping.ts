export interface MarketPriceCropMapping {
  cropName: string;
  categoryCode: string;
  categoryName: string;
  itemCode: string;
  itemName: string;
  note?: string;
}

type MarketPriceItemMapping = Omit<MarketPriceCropMapping, "cropName" | "note">;

const normalizeCropName = (value: string) => value.replace(/\s+/g, "").trim();

const item = (
  categoryCode: string,
  categoryName: string,
  itemCode: string,
  itemName: string,
): MarketPriceItemMapping => ({
  categoryCode,
  categoryName,
  itemCode,
  itemName,
});

const KAMIS_AGRICULTURAL_PRICE_ITEMS: MarketPriceItemMapping[] = [
  item("100", "식량작물", "111", "쌀"),
  item("100", "식량작물", "112", "찹쌀"),
  item("100", "식량작물", "113", "혼합곡"),
  item("100", "식량작물", "114", "기장"),
  item("100", "식량작물", "121", "보리쌀"),
  item("100", "식량작물", "141", "콩"),
  item("100", "식량작물", "142", "팥"),
  item("100", "식량작물", "143", "녹두"),
  item("100", "식량작물", "144", "메밀"),
  item("100", "식량작물", "151", "고구마"),
  item("100", "식량작물", "152", "감자"),
  item("100", "식량작물", "161", "귀리"),
  item("100", "식량작물", "162", "보리"),
  item("100", "식량작물", "163", "수수"),
  item("100", "식량작물", "164", "율무"),
  item("200", "채소류", "211", "배추"),
  item("200", "채소류", "212", "양배추"),
  item("200", "채소류", "213", "시금치"),
  item("200", "채소류", "214", "상추"),
  item("200", "채소류", "215", "얼갈이배추"),
  item("200", "채소류", "216", "갓"),
  item("200", "채소류", "217", "연근"),
  item("200", "채소류", "218", "우엉"),
  item("200", "채소류", "221", "수박"),
  item("200", "채소류", "222", "참외"),
  item("200", "채소류", "223", "오이"),
  item("200", "채소류", "224", "호박"),
  item("200", "채소류", "225", "토마토"),
  item("200", "채소류", "226", "딸기"),
  item("200", "채소류", "231", "무"),
  item("200", "채소류", "232", "당근"),
  item("200", "채소류", "233", "열무"),
  item("200", "채소류", "241", "건고추"),
  item("200", "채소류", "242", "풋고추"),
  item("200", "채소류", "243", "붉은고추"),
  item("200", "채소류", "244", "피마늘"),
  item("200", "채소류", "245", "양파"),
  item("200", "채소류", "246", "파"),
  item("200", "채소류", "247", "생강"),
  item("200", "채소류", "248", "고춧가루"),
  item("200", "채소류", "251", "가지"),
  item("200", "채소류", "252", "미나리"),
  item("200", "채소류", "253", "깻잎"),
  item("200", "채소류", "254", "부추"),
  item("200", "채소류", "255", "피망"),
  item("200", "채소류", "256", "파프리카"),
  item("200", "채소류", "257", "멜론"),
  item("200", "채소류", "258", "깐마늘(국산)"),
  item("200", "채소류", "259", "깐마늘(수입)"),
  item("200", "채소류", "262", "양상추"),
  item("200", "채소류", "263", "청경채"),
  item("200", "채소류", "264", "케일"),
  item("200", "채소류", "265", "콩나물"),
  item("200", "채소류", "266", "절임배추"),
  item("200", "채소류", "279", "알배기배추"),
  item("200", "채소류", "280", "브로콜리"),
  item("200", "채소류", "422", "방울토마토"),
  item("300", "특용작물", "312", "참깨"),
  item("300", "특용작물", "313", "들깨"),
  item("300", "특용작물", "314", "땅콩"),
  item("300", "특용작물", "315", "느타리버섯"),
  item("300", "특용작물", "316", "팽이버섯"),
  item("300", "특용작물", "317", "새송이버섯"),
  item("300", "특용작물", "318", "호두"),
  item("300", "특용작물", "319", "아몬드"),
  item("300", "특용작물", "321", "양송이버섯"),
  item("300", "특용작물", "322", "표고버섯"),
  item("300", "특용작물", "351", "국화"),
  item("300", "특용작물", "352", "카네이션"),
  item("300", "특용작물", "353", "장미"),
  item("300", "특용작물", "354", "백합"),
  item("300", "특용작물", "355", "글라디올러스"),
  item("300", "특용작물", "356", "튜울립"),
  item("300", "특용작물", "357", "거베라"),
  item("300", "특용작물", "358", "안개꽃"),
  item("400", "과일류", "411", "사과"),
  item("400", "과일류", "412", "배"),
  item("400", "과일류", "413", "복숭아"),
  item("400", "과일류", "414", "포도"),
  item("400", "과일류", "415", "감귤"),
  item("400", "과일류", "416", "단감"),
  item("400", "과일류", "418", "바나나"),
  item("400", "과일류", "419", "참다래"),
  item("400", "과일류", "420", "파인애플"),
  item("400", "과일류", "421", "오렌지"),
  item("400", "과일류", "423", "자몽"),
  item("400", "과일류", "424", "레몬"),
  item("400", "과일류", "425", "체리"),
  item("400", "과일류", "426", "건포도"),
  item("400", "과일류", "427", "건블루베리"),
  item("400", "과일류", "428", "망고"),
  item("400", "과일류", "429", "블루베리"),
  item("400", "과일류", "430", "아보카도"),
];

const findKamisItem = (itemName: string, itemCode?: string): MarketPriceItemMapping => {
  const mapping = KAMIS_AGRICULTURAL_PRICE_ITEMS.find(
    (candidate) =>
      candidate.itemName === itemName && (itemCode === undefined || candidate.itemCode === itemCode),
  );
  if (!mapping) throw new Error(`KAMIS item mapping missing: ${itemName}`);
  return mapping;
};

const cropAlias = (
  cropName: string,
  itemName: string,
  note?: string,
  itemCode?: string,
): MarketPriceCropMapping => ({
  cropName,
  ...findKamisItem(itemName, itemCode),
  ...(note ? { note } : {}),
});

const MARKET_PRICE_CROP_MAPPINGS: MarketPriceCropMapping[] = [
  ...KAMIS_AGRICULTURAL_PRICE_ITEMS.map((mapping) => ({
    cropName: mapping.itemName,
    ...mapping,
  })),
  cropAlias("벼", "쌀", "KAMIS 일별 가격 품목에는 벼가 없어 쌀 가격으로 대체합니다."),
  cropAlias("고추", "풋고추", "등록 작물명이 고추인 경우 기본 가격 품목은 풋고추입니다."),
  cropAlias("마늘", "피마늘", "등록 작물명이 마늘인 경우 KAMIS 피마늘 가격으로 대체합니다."),
  cropAlias("대파", "파"),
  cropAlias("쪽파", "파"),
  cropAlias("꽈리고추", "풋고추"),
  cropAlias("청양고추", "풋고추"),
  cropAlias("오이맛고추", "풋고추"),
  cropAlias("애호박", "호박"),
  cropAlias("단호박", "호박"),
  cropAlias("쥬키니", "호박"),
  cropAlias("대추방울토마토", "방울토마토"),
  cropAlias("깐마늘", "깐마늘(국산)"),
  cropAlias("애느타리버섯", "느타리버섯"),
  cropAlias("표고", "표고버섯"),
  cropAlias("키위", "참다래"),
  cropAlias("캠벨얼리", "포도"),
  cropAlias("거봉", "포도"),
  cropAlias("델라웨어", "포도"),
  cropAlias("MBA", "포도"),
  cropAlias("샤인머스켓", "포도"),
];

const MAPPING_BY_CROP = new Map(
  MARKET_PRICE_CROP_MAPPINGS.map((mapping) => [normalizeCropName(mapping.cropName), mapping]),
);

export const resolveMarketPriceCropMapping = (
  cropName: string,
): MarketPriceCropMapping | null => MAPPING_BY_CROP.get(normalizeCropName(cropName)) ?? null;

export const listMarketPriceCropMappings = (): MarketPriceCropMapping[] => [
  ...MARKET_PRICE_CROP_MAPPINGS,
];
