interface FarmIdRandomSource {
  randomUUID?: () => string;
  getRandomValues?: (values: Uint8Array) => Uint8Array;
}

const fillRandomBytes = (source: FarmIdRandomSource | undefined, values: Uint8Array) => {
  if (source?.getRandomValues) return source.getRandomValues(values);

  for (let index = 0; index < values.length; index += 1) {
    values[index] = Math.floor(Math.random() * 256);
  }
  return values;
};

export const createFarmId = (
  source: FarmIdRandomSource | undefined = globalThis.crypto,
): string => {
  if (typeof source?.randomUUID === "function") return source.randomUUID();

  const bytes = fillRandomBytes(source, new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
};
