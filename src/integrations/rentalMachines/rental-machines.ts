import {
  buildOpenApiUrl,
  ensureOpenApiSuccess,
  extractXmlRows,
  parseKoreanOpenApiEnvelope,
  readServerEnv,
} from "../openapi";
import type { Rental } from "../../domains/machines/types";
import {
  normalizeOdcloudRentalItem,
  normalizePublicRentalItem,
  readRentalString,
  type RentalRow,
} from "./rental-normalizers";
import { normalizeRentalMatchText, type OdcloudContext } from "./rental-data-merge";

export { createOdcloudRentalContexts, mergeRentalData } from "./rental-data-merge";
export { normalizeOdcloudRentalItem, normalizePublicRentalItem } from "./rental-normalizers";

const PUBLIC_RENTAL_INFO_URL = "https://api.data.go.kr/openapi/tn_pubr_public_frcn_rent_info_api";
const ODCLOUD_RENTAL_MACHINE_URL =
  "https://api.odcloud.kr/api/15111689/v1/uddi:42e3e3ab-7818-421f-b919-ffefde2d019d";

export interface PublicRentalUrlOptions {
  pageNo?: number;
  numOfRows?: number;
  type?: "xml" | "json";
  officeNm?: string;
  officePhoneNumber?: string;
  rdnmadr?: string;
  lnmadr?: string;
  latitude?: string | number;
  longitude?: string | number;
  trctorHoldCo?: string | number;
  cultvtHoldCo?: string | number;
  manageHoldCo?: string | number;
  harvestHoldCo?: string | number;
  thresherHoldCo?: string | number;
  planterHoldCo?: string | number;
  transplantHoldCo?: string | number;
  rcepntHoldCo?: string | number;
  etcRentHoldCo?: string;
  phoneNumber?: string;
  institutionNm?: string;
  referenceDate?: string;
  instt_code?: string;
}

interface OdcloudRentalUrlOptions {
  page?: number;
  perPage?: number;
}

const toArray = (value: unknown): RentalRow[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is RentalRow => typeof item === "object" && item !== null);
  }
  if (typeof value === "object" && value !== null) return [value as RentalRow];
  return [];
};

const extractPublicItems = (payload: unknown): RentalRow[] => {
  const root = payload as {
    response?: { body?: { items?: { item?: unknown } | unknown; item?: unknown } };
    items?: unknown;
  };
  const body = root.response?.body;
  if (body?.items && typeof body.items === "object" && "item" in body.items) {
    return toArray((body.items as { item?: unknown }).item);
  }
  return toArray(body?.items ?? body?.item ?? root.items);
};

export const parsePublicRentalPayload = (payload: unknown): RentalRow[] =>
  typeof payload === "string" ? extractXmlRows(payload) : extractPublicItems(payload);

const extractOdcloudItems = (payload: unknown): RentalRow[] => {
  const root = payload as { data?: unknown };
  return toArray(root.data);
};

export const buildPublicRentalInfoUrl = (
  serviceKey: string,
  options: PublicRentalUrlOptions = {},
) =>
  buildOpenApiUrl(PUBLIC_RENTAL_INFO_URL, {
    serviceKey,
    pageNo: options.pageNo ?? 1,
    numOfRows: options.numOfRows ?? 1000,
    type: options.type ?? "json",
    officeNm: options.officeNm,
    officePhoneNumber: options.officePhoneNumber,
    rdnmadr: options.rdnmadr,
    lnmadr: options.lnmadr,
    latitude: options.latitude,
    longitude: options.longitude,
    trctorHoldCo: options.trctorHoldCo,
    cultvtHoldCo: options.cultvtHoldCo,
    manageHoldCo: options.manageHoldCo,
    harvestHoldCo: options.harvestHoldCo,
    thresherHoldCo: options.thresherHoldCo,
    planterHoldCo: options.planterHoldCo,
    transplantHoldCo: options.transplantHoldCo,
    rcepntHoldCo: options.rcepntHoldCo,
    etcRentHoldCo: options.etcRentHoldCo,
    phoneNumber: options.phoneNumber,
    institutionNm: options.institutionNm,
    referenceDate: options.referenceDate,
    instt_code: options.instt_code,
  });

export const buildOdcloudRentalMachineUrl = (
  serviceKey: string,
  options: OdcloudRentalUrlOptions = {},
) =>
  buildOpenApiUrl(ODCLOUD_RENTAL_MACHINE_URL, {
    serviceKey,
    page: options.page ?? 1,
    perPage: options.perPage ?? 100,
    returnType: "JSON",
  });

export const fetchPublicRentalCenters = async (
  options: PublicRentalUrlOptions = {},
): Promise<Rental[]> => {
  const serviceKey = readServerEnv({ source: "PUBLIC_DATA", names: ["PUBLIC_DATA_SERVICE_KEY"] });
  const response = await fetch(buildPublicRentalInfoUrl(serviceKey, options));
  if (!response.ok) throw new Error(`Public rental API Error: ${response.status}`);

  const payload = options.type === "xml" ? await response.text() : await response.json();
  ensureOpenApiSuccess("PUBLIC_DATA", parseKoreanOpenApiEnvelope(payload));

  return parsePublicRentalPayload(payload)
    .map(normalizePublicRentalItem)
    .filter((rental): rental is Rental => rental !== null);
};

export const fetchOdcloudRentalMachines = async (
  options: OdcloudRentalUrlOptions = {},
  contexts: Record<string, OdcloudContext> = {},
): Promise<Rental[]> => {
  const serviceKey = readServerEnv({
    source: "ODCLOUD",
    names: ["ODCLOUD_SERVICE_KEY", "PUBLIC_DATA_SERVICE_KEY"],
  });
  const response = await fetch(buildOdcloudRentalMachineUrl(serviceKey, options));
  if (!response.ok) throw new Error(`ODCloud rental API Error: ${response.status}`);

  const payload = await response.json();
  const rentals = new Map<string, Rental>();
  for (const row of extractOdcloudItems(payload)) {
    const officeName = readRentalString(row, ["임대사업소명"]) || "";
    const context = contexts[officeName] ?? contexts[normalizeRentalMatchText(officeName)];
    const rental = normalizeOdcloudRentalItem(row, context);
    const current = rentals.get(rental.id);
    if (current) current.machines.push(...rental.machines);
    else rentals.set(rental.id, rental);
  }
  return Array.from(rentals.values());
};
