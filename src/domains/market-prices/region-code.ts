export interface MarketPriceRegionMapping {
  regionCode: string;
  regionName: string;
  aliases: string[];
}

const JEONBUK_MARKET_PRICE_REGIONS: MarketPriceRegionMapping[] = [
  { regionCode: "3511", regionName: "전주", aliases: ["전주", "전주시"] },
  { regionCode: "3512", regionName: "군산", aliases: ["군산", "군산시"] },
];

export const resolveMarketPriceRegion = (region: string): MarketPriceRegionMapping | null => {
  const normalized = region.replace(/\s+/g, "");
  return (
    JEONBUK_MARKET_PRICE_REGIONS.find((mapping) =>
      mapping.aliases.some((alias) => normalized.includes(alias)),
    ) ?? null
  );
};

