import type {
  MachineCategory,
  MachineInventory,
  MachineStatus,
  MachineType,
  Rental,
} from "../../domains/machines/types";
import { getRentalMachineCategoryDefinition } from "../../domains/machines/rental-machine-categories";
import type { OdcloudContext } from "./rental-data-merge";

export type RentalRow = Record<string, unknown>;

const PUBLIC_MACHINE_FIELDS: Array<{
  key: string;
  category: MachineCategory;
}> = [
  {
    key: "trctorHoldCo",
    category: "TRACTOR_EQUIPMENT",
  },
  {
    key: "cultvtHoldCo",
    category: "CULTIVATOR_EQUIPMENT",
  },
  {
    key: "manageHoldCo",
    category: "MANAGER_EQUIPMENT",
  },
  {
    key: "harvestHoldCo",
    category: "ROOT_CROP_HARVESTER",
  },
  {
    key: "thresherHoldCo",
    category: "THRESHER_SORTER",
  },
  {
    key: "planterHoldCo",
    category: "SELF_PROPELLED_PLANTER",
  },
  {
    key: "transplantHoldCo",
    category: "TRANSPLANTER_EQUIPMENT",
  },
  {
    key: "rcepntHoldCo",
    category: "RICE_HARVEST_TRANSPORT",
  },
  {
    key: "etcRentHoldCo",
    category: "OTHER_RENTAL_INFO",
  },
];

export const readRentalString = (row: RentalRow, keys: string[]): string | null => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
};

const readNumber = (row: RentalRow, keys: string[]): number | null => {
  const value = readRentalString(row, keys);
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const createId = (prefix: string, ...parts: Array<string | number | null | undefined>) =>
  `${prefix}-${parts
    .filter((part) => part !== null && part !== undefined && String(part).trim().length > 0)
    .map((part) =>
      String(part)
        .trim()
        .replace(/[^\dA-Za-z가-힣]+/g, "-"),
    )
    .join("-")}`;

const parseInventoryCount = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value !== "string") return 0;

  return [...value.matchAll(/\d+/g)]
    .map((match) => Number.parseInt(match[0], 10))
    .filter(Number.isFinite)
    .reduce((sum, count) => sum + count, 0);
};

const statusFromText = (value: string | null): MachineStatus => {
  if (!value) return "UNKNOWN";
  if (value.includes("불가") || value.includes("수리") || value.includes("폐기")) {
    return "UNAVAILABLE";
  }
  if (value.includes("가능")) return "AVAILABLE";
  if (value.includes("임대중") || value.includes("대여중") || value.includes("예약")) {
    return "LIMITED";
  }
  return "UNKNOWN";
};

const inferMachineType = (text: string): MachineType => {
  if (/트랙터|tractor/i.test(text)) return "TRACTOR";
  if (/콤바인|combine|벼\s*수확/i.test(text)) return "COMBINE";
  if (/드론|무인/i.test(text)) return "DRONE";
  if (/파종|이앙|정식|planter/i.test(text)) return "PLANTER";
  if (/관리기|경운|제초|로터리|rotary|cultivator/i.test(text)) return "CULTIVATOR";
  return "OTHER";
};

const createPublicMachines = (rentalId: string, row: RentalRow): MachineInventory[] =>
  PUBLIC_MACHINE_FIELDS.flatMap<MachineInventory>((field) => {
    const holdingText = readRentalString(row, [field.key]);
    if (!holdingText) return [];
    const definition = getRentalMachineCategoryDefinition(field.category);

    if (field.category === "OTHER_RENTAL_INFO") {
      return [
        {
          id: `${rentalId}-${field.key}`,
          type: definition.type,
          category: field.category,
          name: definition.label,
          status: "REQUEST_ONLY",
          count: 0,
          holdingText,
          availabilityBasis: "HOLDING_INFO",
        },
      ];
    }

    const count = parseInventoryCount(holdingText);
    if (count <= 0) return [];
    return [
      {
        id: `${rentalId}-${field.key}`,
        type: definition.type,
        category: field.category,
        name: definition.label,
        status: "REQUEST_ONLY",
        count,
        availabilityBasis: "HOLDING_COUNT",
      },
    ];
  });

export const normalizePublicRentalItem = (row: RentalRow): Rental | null => {
  const name =
    readRentalString(row, ["officeNm", "사업소명"]) ||
    readRentalString(row, ["institutionNm", "관리기관명"]);
  const address =
    readRentalString(row, ["rdnmadr", "소재지도로명주소"]) ||
    readRentalString(row, ["lnmadr", "소재지지번주소"]);
  const lat = readNumber(row, ["latitude", "위도"]);
  const lng = readNumber(row, ["longitude", "경도"]);
  if (!name || lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }

  const id = createId(
    "public-rental",
    readRentalString(row, ["instt_code", "제공기관코드"]),
    name,
    address,
  );
  return {
    id,
    name,
    address: address ?? undefined,
    institutionName: readRentalString(row, ["institutionNm", "관리기관명"]) ?? undefined,
    institutionCode: readRentalString(row, ["instt_code", "제공기관코드"]) ?? undefined,
    referenceDate: readRentalString(row, ["referenceDate", "데이터기준일자"]) ?? undefined,
    region:
      address?.split(/\s+/).slice(0, 2).join(" ") ||
      readRentalString(row, ["institutionNm", "관리기관명"]) ||
      "지역 확인 필요",
    lat,
    lng,
    phone:
      readRentalString(row, ["officePhoneNumber", "사업소전화번호"]) ||
      readRentalString(row, ["phoneNumber", "관리기관전화번호"]) ||
      undefined,
    machines: createPublicMachines(id, row),
  };
};

export const normalizeOdcloudRentalItem = (
  row: RentalRow,
  context: OdcloudContext = {},
): Rental => {
  const officeCode = readRentalString(row, ["임대사업소코드"]);
  const officeName = readRentalString(row, ["임대사업소명"]) || "임대사업소명 미확인";
  const machineText = [
    readRentalString(row, ["동력기"]),
    readRentalString(row, ["작업기"]),
    readRentalString(row, ["형식명"]),
    readRentalString(row, ["규격명"]),
  ]
    .filter(Boolean)
    .join(" ");
  const rentalId = createId("odcloud-rental", officeCode, officeName);
  const machineName = machineText || readRentalString(row, ["승인번호"]) || "농기계 정보";

  return {
    id: rentalId,
    name: officeName,
    address: context.address,
    region: context.region || "지역 확인 필요",
    lat: context.lat ?? 0,
    lng: context.lng ?? 0,
    phone: context.phone,
    machines: [
      {
        id: createId(rentalId, readRentalString(row, ["일련번호", "승인번호"]), machineName),
        type: inferMachineType(machineText),
        name: machineName,
        status: statusFromText(readRentalString(row, ["농기계 임대상태"])),
        count: 1,
        availabilityBasis: "RENTAL_STATUS",
      },
    ],
  };
};
