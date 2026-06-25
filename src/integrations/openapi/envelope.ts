import type { KoreanOpenApiEnvelope } from "./types";

type EnvelopeLikeObject = {
  response?: {
    header?: {
      resultCode?: unknown;
      resultMsg?: unknown;
    };
  };
  resultCode?: unknown;
  resultMsg?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
};

const readEnvelopeFromObject = (input: EnvelopeLikeObject): KoreanOpenApiEnvelope | null => {
  const header = input.response?.header;
  const resultCode = readString(header?.resultCode) || readString(input.resultCode);
  const resultMsg = readString(header?.resultMsg) || readString(input.resultMsg);

  if (!resultCode) return null;

  return {
    resultCode,
    resultMsg: resultMsg || "",
  };
};

const extractXmlTag = (xml: string, tagName: string): string | null => {
  const tagPattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = xml.match(tagPattern);
  return match?.[1]?.trim() || null;
};

const readEnvelopeFromXml = (xml: string): KoreanOpenApiEnvelope | null => {
  const resultCode = extractXmlTag(xml, "resultCode");
  if (!resultCode) return null;

  return {
    resultCode,
    resultMsg: extractXmlTag(xml, "resultMsg") || "",
  };
};

export const parseKoreanOpenApiEnvelope = (input: unknown): KoreanOpenApiEnvelope => {
  if (typeof input === "string") {
    const xmlEnvelope = readEnvelopeFromXml(input);
    if (xmlEnvelope) return xmlEnvelope;
  }

  if (isRecord(input)) {
    const objectEnvelope = readEnvelopeFromObject(input as EnvelopeLikeObject);
    if (objectEnvelope) return objectEnvelope;
  }

  throw new Error("OpenAPI 결과코드 envelope를 찾을 수 없습니다.");
};
