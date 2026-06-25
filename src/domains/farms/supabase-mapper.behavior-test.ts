import { farmFromSupabaseRow, farmToSupabaseInsert } from "./supabase-mapper";
import type { Database } from "@/integrations/supabase/types";
import type { Farm, FarmParcelSelection } from "./types";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

type FarmRow = Database["public"]["Tables"]["farms"]["Row"];

const parcel: FarmParcelSelection = {
  farmMapId: "farmmap-4513012300100010000",
  pnu: "4513012300100010000",
  representativeAddress: "전북특별자치도 김제시 만경읍",
  landCategory: "답",
  cropLandType: "논",
  areaSquareMeter: 1200,
  cadastralMatchRate: 98,
  updatedYear: "2024",
  geometry: null,
  centroid: { lat: 35.842, lng: 126.812 },
  source: "FARMMAP",
};

const farm: Farm = {
  id: "farm-1",
  name: "만경 1농장",
  address: "전북특별자치도 김제시 만경읍",
  region: "전북특별자치도 김제시",
  lat: 35.842,
  lng: 126.812,
  crop: "벼",
  area: 1200,
  growthStageCode: "18602",
  interestedWork: ["방제", "배수"],
  parcel,
  createdAt: "2026-06-21T00:00:00.000Z",
};

const insert = farmToSupabaseInsert(farm, "user-1");
assert(insert.user_id === "user-1", "farm owner must be written");
assert(
  (insert as { growth_stage_code?: string }).growth_stage_code === "18602",
  "official NCPMS growth-stage code must be persisted",
);
assert(insert.stage === "생육초기", "legacy stage column must contain the derived official label");
assert(
  JSON.stringify(insert.parcel) === JSON.stringify(parcel),
  "farm parcel selection must be persisted",
);

const row = { ...insert, user_id: "user-1" } as FarmRow;
const loaded = farmFromSupabaseRow(row);
assert(loaded.parcel?.farmMapId === parcel.farmMapId, "stored parcel must be restored");
assert(loaded.interestedWork.join(",") === "방제,배수", "work types must be restored");
assert(loaded.growthStageCode === "18602", "stored growth-stage code must be restored");

const legacyRow = { ...row, growth_stage_code: null, stage: "생육" } as FarmRow;
assert(
  farmFromSupabaseRow(legacyRow).growthStageCode === null,
  "ambiguous legacy growth stages must require user reselection",
);

const withoutParcel = farmFromSupabaseRow({ ...row, parcel: null });
assert(withoutParcel.parcel === undefined, "null parcel must become an absent selection");

console.log("farm Supabase mapper behavior tests passed");
