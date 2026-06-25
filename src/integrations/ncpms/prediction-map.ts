import { buildOpenApiUrl, extractXmlRows, extractXmlTag, readOptionalServerEnv } from "../openapi";

const NCPMS_SERVICE_URL = "http://ncpms.rda.go.kr/npmsAPI/service";

export interface NcpmsPredictionCrop {
  code: string;
  name: string;
}

export interface NcpmsPredictionRiskLevel {
  name: string;
  description: string;
  color: string;
}

export interface NcpmsPredictionModel {
  cropCode: string;
  cropName: string;
  code: string;
  name: string;
  fieldCode: string;
  driveCycle: string;
  lastRunAt: string;
  beginMonth: number;
  beginDay: number;
  endMonth: number;
  endDay: number;
  riskLevels: NcpmsPredictionRiskLevel[];
}

export interface NcpmsPredictionMetadata {
  crops: NcpmsPredictionCrop[];
  models: NcpmsPredictionModel[];
}

const decodeNcpmsValue = (value: string | undefined) => {
  if (!value) return "";

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizeText = (value: string | undefined) =>
  decodeNcpmsValue(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeColor = (value: string | undefined) => {
  const color = (value || "").trim().replace(/^#/, "");
  return /^[0-9a-f]{6}$/i.test(color) ? `#${color.toUpperCase()}` : "#6B7280";
};

const parseRiskLevels = (value: string | undefined): NcpmsPredictionRiskLevel[] =>
  decodeNcpmsValue(value)
    .split("|")
    .map((entry) => {
      const [name, description, color] = entry.split("!+@+!");
      return {
        name: normalizeText(name),
        description: normalizeText(description),
        color: normalizeColor(color),
      };
    })
    .filter((level) => Boolean(level.name));

const parseNumber = (value: string | undefined) => {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const ensureNcpmsPredictionSuccess = (xml: string) => {
  const errorCode = extractXmlTag(xml, "errorCode");
  if (!errorCode) return;

  const errorMessage = extractXmlTag(xml, "errorMsg") || "NCPMS prediction API error";
  throw new Error(`[NCPMS] ${errorCode}: ${errorMessage}`);
};

export const buildNcpmsPredictionMetadataUrl = (apiKey: string) =>
  buildOpenApiUrl(NCPMS_SERVICE_URL, {
    apiKey,
    serviceCode: "SVC31",
    serviceType: "AA001",
  });

export const normalizeNcpmsPredictionMetadataXml = (xml: string): NcpmsPredictionMetadata => {
  ensureNcpmsPredictionSuccess(xml);

  const cropRows = extractXmlRows(extractXmlTag(xml, "kncrListData") || "");
  const modelRows = extractXmlRows(extractXmlTag(xml, "pestModelByKncrList") || "");

  const crops = cropRows
    .map((row) => ({ code: row.kncrCode?.trim() || "", name: normalizeText(row.kncrNm) }))
    .filter((crop) => Boolean(crop.code && crop.name));

  const models = modelRows
    .map((row) => ({
      cropCode: row.kncrCode?.trim() || "",
      cropName: normalizeText(row.kncrNm),
      code: row.dbyhsMdlCode?.trim() || "",
      name: normalizeText(row.dbyhsMdlNm),
      fieldCode: row.fieldCode?.trim() || "",
      driveCycle: row.drveCycle?.trim() || "1",
      lastRunAt: row.nowDrveDatetm?.trim() || "",
      beginMonth: parseNumber(row.drveBeginMon),
      beginDay: parseNumber(row.drveBeginDe),
      endMonth: parseNumber(row.drveEndMon),
      endDay: parseNumber(row.drveEndDe),
      riskLevels: parseRiskLevels(row.pestConfigStr),
    }))
    .filter((model) => Boolean(model.cropCode && model.code && model.name && model.fieldCode));

  return { crops, models };
};

export const fetchNcpmsPredictionMetadata = async (): Promise<NcpmsPredictionMetadata> => {
  const apiKey = readOptionalServerEnv({ source: "NCPMS", names: ["NCPMS_API_KEY"] });
  if (!apiKey) return { crops: [], models: [] };

  const response = await fetch(buildNcpmsPredictionMetadataUrl(apiKey));
  if (!response.ok) throw new Error(`NCPMS prediction API Error: ${response.status}`);

  return normalizeNcpmsPredictionMetadataXml(await response.text());
};
