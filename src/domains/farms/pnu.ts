export interface ParcelLotInput {
  bjdCode: string;
  mainLot: string;
  subLot?: string;
  isMountain: boolean;
}

const normalizeLotNumber = (value: string | undefined, allowZero: boolean) => {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) return allowZero ? "0000" : null;

  const parsed = Number(digits);
  if (!Number.isInteger(parsed) || parsed > 9999) return null;
  if (!allowZero && parsed < 1) return null;
  return String(parsed).padStart(4, "0");
};

export const buildParcelPnu = (input: ParcelLotInput): string | null => {
  if (!/^\d{10}$/.test(input.bjdCode)) return null;

  const mainLot = normalizeLotNumber(input.mainLot, false);
  const subLot = normalizeLotNumber(input.subLot, true);
  if (!mainLot || !subLot) return null;

  return `${input.bjdCode}${input.isMountain ? "2" : "1"}${mainLot}${subLot}`;
};

export const formatParcelLotAddress = (
  legalDongAddress: string,
  mainLot: string,
  subLot = "",
  isMountain = false,
) => {
  const normalizedMain = normalizeLotNumber(mainLot, false);
  const normalizedSub = normalizeLotNumber(subLot, true);
  if (!normalizedMain || !normalizedSub) return legalDongAddress.trim();

  const main = String(Number(normalizedMain));
  const sub = Number(normalizedSub);
  const lot = sub > 0 ? `${main}-${sub}` : main;
  return `${legalDongAddress.trim()} ${isMountain ? "산 " : ""}${lot}`;
};
