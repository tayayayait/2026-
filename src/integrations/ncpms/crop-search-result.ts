import { PEST_DB } from "../../data/demo";
import type { NcpmsPest } from "./disease";

export interface NcpmsCropSearchResult {
  items: NcpmsPest[];
  source: "NCPMS" | "DEMO_FALLBACK";
}

const demoPestsByCrop = (crop: string): NcpmsPest[] =>
  PEST_DB.filter((pest) => pest.crop === crop).map((pest) => ({
    id: pest.sickKey,
    name: pest.name,
    type: pest.type === "INSECT" ? "INSECT" : "DISEASE",
    crop: pest.crop,
    symptoms: pest.symptoms,
    imageUrl: pest.image,
  }));

export const selectNcpmsCropSearchResult = (
  crop: string,
  liveItems: NcpmsPest[],
): NcpmsCropSearchResult => {
  if (liveItems.length > 0) return { items: liveItems, source: "NCPMS" };
  return { items: demoPestsByCrop(crop), source: "DEMO_FALLBACK" };
};
