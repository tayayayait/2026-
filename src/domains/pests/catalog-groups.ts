import type { NcpmsPest } from "../../integrations/ncpms/disease";

export type PestCatalogFilterType = NcpmsPest["type"] | "ALL";

export interface PestCatalogGroup {
  key: string;
  name: string;
  type: NcpmsPest["type"];
  crop: string;
  aliases: string[];
  recordCount: number;
  imageUrl?: string;
}

export interface PestCatalogSummary {
  rawCount: number;
  totalCount: number;
  diseaseCount: number;
  insectCount: number;
  weedCount: number;
}

interface PestCatalogFilter {
  query: string;
  type: PestCatalogFilterType;
}

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

const createGroupKey = (pest: NcpmsPest) =>
  `${normalizeText(pest.crop)}::${pest.type}::${normalizeText(pest.name)}`;

export const groupPestCatalog = (pests: readonly NcpmsPest[]): PestCatalogGroup[] => {
  const groups = new Map<string, PestCatalogGroup>();

  pests.forEach((pest) => {
    const key = createGroupKey(pest);
    const alias = normalizeText(pest.scientificName ?? "");
    const existing = groups.get(key);

    if (existing) {
      existing.recordCount += 1;
      if (alias && !existing.aliases.includes(alias)) existing.aliases.push(alias);
      if (!existing.imageUrl && pest.imageUrl) existing.imageUrl = pest.imageUrl;
      return;
    }

    groups.set(key, {
      key,
      name: normalizeText(pest.name),
      type: pest.type,
      crop: normalizeText(pest.crop),
      aliases: alias ? [alias] : [],
      recordCount: 1,
      imageUrl: pest.imageUrl,
    });
  });

  return [...groups.values()];
};

export const summarizePestCatalog = (
  groups: readonly PestCatalogGroup[],
  rawCount: number,
): PestCatalogSummary => ({
  rawCount,
  totalCount: groups.length,
  diseaseCount: groups.filter((group) => group.type === "DISEASE").length,
  insectCount: groups.filter((group) => group.type === "INSECT").length,
  weedCount: groups.filter((group) => group.type === "WEED").length,
});

export const filterPestCatalogGroups = (
  groups: readonly PestCatalogGroup[],
  filter: PestCatalogFilter,
): PestCatalogGroup[] => {
  const query = normalizeText(filter.query).toLocaleLowerCase("ko-KR");

  return groups.filter((group) => {
    if (filter.type !== "ALL" && group.type !== filter.type) return false;
    if (!query) return true;

    return [group.name, group.crop, ...group.aliases]
      .join(" ")
      .toLocaleLowerCase("ko-KR")
      .includes(query);
  });
};
