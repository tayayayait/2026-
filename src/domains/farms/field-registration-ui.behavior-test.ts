import assert from "node:assert/strict";
import type { FarmParcelCandidate } from "./types";

const ui = await import("./field-registration-ui").catch(() => ({}));

const landCodesForClassification = Reflect.get(ui, "landCodesForClassification") as
  | ((classification: string) => string[])
  | undefined;
const filterParcelCandidates = Reflect.get(ui, "filterParcelCandidates") as
  | ((candidates: FarmParcelCandidate[], classification: string) => FarmParcelCandidate[])
  | undefined;
const formatParcelCandidateAddress = Reflect.get(ui, "formatParcelCandidateAddress") as
  | ((candidate: FarmParcelCandidate) => string)
  | undefined;
const dedupeParcelCandidates = Reflect.get(ui, "dedupeParcelCandidates") as
  | ((candidates: FarmParcelCandidate[]) => FarmParcelCandidate[])
  | undefined;
const candidateToMapParcel = Reflect.get(ui, "candidateToMapParcel") as
  | ((candidate: FarmParcelCandidate) => unknown)
  | undefined;
const regionSearchTargets = Reflect.get(ui, "regionSearchTargets") as
  | ((input: {
      selectedRegion: { regionCode: string } | null;
      selectedRiCode: string;
      selectedEupCode: string;
      riOptions: Array<{ regionCode: string }>;
    }) => Array<{ regionCode: string }>)
  | undefined;
const requiresRiForLotSearch = Reflect.get(ui, "requiresRiForLotSearch") as
  | ((input: {
      mainLot: string;
      selectedRiCode: string;
      selectedEupCode: string;
      riOptions: Array<{ regionCode: string }>;
    }) => boolean)
  | undefined;

assert.equal(
  typeof landCodesForClassification,
  "function",
  "classification land-code mapper must exist",
);
assert.equal(typeof filterParcelCandidates, "function", "parcel candidate classifier must exist");
assert.equal(
  typeof formatParcelCandidateAddress,
  "function",
  "candidate address formatter must exist",
);
assert.equal(typeof dedupeParcelCandidates, "function", "parcel candidate deduper must exist");
assert.equal(typeof candidateToMapParcel, "function", "candidate-to-map parcel adapter must exist");
assert.equal(typeof regionSearchTargets, "function", "region search target resolver must exist");
assert.equal(
  typeof requiresRiForLotSearch,
  "function",
  "lot search must detect when a ri selection is required",
);

const baseCandidate: FarmParcelCandidate = {
  farmMapId: "farmmap-5221025024101230005",
  pnu: "5221025024101230005",
  representativeAddress: "전북특별자치도 김제시 만경읍 송상리",
  legalDongAddress: "전북특별자치도 김제시 만경읍 송상리",
  landCategory: "답",
  cropLandType: "논",
  areaSquareMeter: 1520,
  cultivatedAreaSquareMeter: null,
  cultivationRatio: null,
  cadastralMatchRate: null,
  aerialPhotoYear: null,
  updatedYear: "2024",
  geometry: null,
  centroid: { lat: 35.855, lng: 126.82 },
  source: "FARMMAP",
  raw: null,
};

assert.deepEqual(landCodesForClassification!("all"), ["01", "02", "03", "04"]);
assert.deepEqual(landCodesForClassification!("밭"), ["02"]);

assert.equal(filterParcelCandidates!([baseCandidate], "논").length, 1);
assert.equal(filterParcelCandidates!([baseCandidate], "밭").length, 0);

assert.equal(
  formatParcelCandidateAddress!(baseCandidate),
  "전북특별자치도 김제시 만경읍 송상리 123-5",
);

const mapParcel = candidateToMapParcel!(baseCandidate) as {
  centroid?: { lat: number; lng: number };
};
assert.deepEqual(mapParcel.centroid, { lat: 35.855, lng: 126.82 });
assert.equal(candidateToMapParcel!({ ...baseCandidate, centroid: null }), null);

const manyUniqueCandidates = Array.from({ length: 31 }, (_, index) => ({
  ...baseCandidate,
  farmMapId: `farmmap-522102502410${String(index + 1).padStart(4, "0")}0000`,
  pnu: `522102502410${String(index + 1).padStart(4, "0")}0000`,
}));
assert.equal(
  dedupeParcelCandidates!(manyUniqueCandidates).length,
  31,
  "unique parcel candidates must not be capped at 30",
);

const eupRegion = { regionCode: "5221025000" };
const childRegions = [{ regionCode: "5221025021" }, { regionCode: "5221025024" }];
assert.deepEqual(
  regionSearchTargets!({
    selectedRegion: eupRegion,
    selectedRiCode: "",
    selectedEupCode: eupRegion.regionCode,
    riOptions: childRegions,
  }).map((region) => region.regionCode),
  ["5221025021", "5221025024"],
);
assert.deepEqual(
  regionSearchTargets!({
    selectedRegion: childRegions[1]!,
    selectedRiCode: childRegions[1]!.regionCode,
    selectedEupCode: eupRegion.regionCode,
    riOptions: childRegions,
  }).map((region) => region.regionCode),
  ["5221025024"],
);
assert.equal(
  requiresRiForLotSearch!({
    mainLot: "6",
    selectedRiCode: "",
    selectedEupCode: eupRegion.regionCode,
    riOptions: childRegions,
  }),
  true,
);

console.log("farm registration phase3 UI behavior tests passed");
