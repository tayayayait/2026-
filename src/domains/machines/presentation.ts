import type { MachineAvailabilityBasis, MachineStatus, RentalDataSource } from "./types";

const machineStatusLabel: Record<MachineStatus, string> = {
  AVAILABLE: "대여 가능",
  LIMITED: "임대 중·예약 확인",
  REQUEST_ONLY: "문의 필요",
  UNKNOWN: "상태 확인 필요",
  UNAVAILABLE: "임대 불가",
};

const rentalSourceLabel: Record<RentalDataSource, string> = {
  PUBLIC_DATA_ODCLOUD: "공공데이터·ODCloud",
  PUBLIC_DATA: "전국 표준 보유현황",
  ODCLOUD: "ODCloud 임대상태",
  SAMPLE_FALLBACK: "샘플 데이터",
};

export const getMachineStatusLabel = (status: MachineStatus, basis?: MachineAvailabilityBasis) => {
  if (basis === "HOLDING_COUNT" || basis === "HOLDING_INFO") return "임대 여부 문의";
  if (basis === "DEMO") return "샘플·문의 필요";
  return machineStatusLabel[status];
};

export const getMachineCountLabel = (count: number, basis?: MachineAvailabilityBasis) => {
  if (basis === "HOLDING_COUNT") return `보유 ${count}대`;
  if (basis === "HOLDING_INFO") return "보유정보 확인";
  if (basis === "DEMO") return `예시 ${count}대`;
  return `${count}대`;
};

export const getRentalSourceLabel = (source: RentalDataSource) => rentalSourceLabel[source];
