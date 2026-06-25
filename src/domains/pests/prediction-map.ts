import type {
  NcpmsPredictionMetadata,
  NcpmsPredictionModel,
} from "../../integrations/ncpms/prediction-map";
import { matchesCropName } from "../farms/crop-name";

export interface PredictionDateRange {
  start: string;
  end: string;
}

export interface PestPredictionMapView {
  cropCode: string;
  cropName: string;
  models: NcpmsPredictionModel[];
}

const padDatePart = (value: number) => String(value).padStart(2, "0");

const formatDate = (year: number, month: number, day: number) =>
  `${year}-${padDatePart(month)}-${padDatePart(day)}`;

export const getPredictionDateRange = (model: NcpmsPredictionModel): PredictionDateRange | null => {
  const runMatch = /^(\d{4})(\d{2})(\d{2})/.exec(model.lastRunAt);
  if (!runMatch) return null;

  const runYear = Number(runMatch[1]);
  const runMonth = Number(runMatch[2]);
  const configuredRangeCrossesYear = model.endMonth < model.beginMonth;
  const startYear =
    configuredRangeCrossesYear && runMonth <= model.endMonth ? runYear - 1 : runYear;
  const endYear = configuredRangeCrossesYear && runMonth > model.endMonth ? runYear + 1 : runYear;
  const start = formatDate(startYear, model.beginMonth, model.beginDay);
  const configuredEnd = formatDate(endYear, model.endMonth, model.endDay);
  const lastRunDate = `${runMatch[1]}-${runMatch[2]}-${runMatch[3]}`;
  const end = configuredEnd < lastRunDate ? configuredEnd : lastRunDate;

  return start <= end ? { start, end } : null;
};

export const clampPredictionDate = (model: NcpmsPredictionModel, date: string) => {
  const range = getPredictionDateRange(model);
  if (!range) return null;
  if (date < range.start) return range.start;
  if (date > range.end) return range.end;
  return date;
};

export const selectPredictionMapForCrop = (
  metadata: NcpmsPredictionMetadata,
  farmCrop: string,
): PestPredictionMapView | null => {
  const crop = metadata.crops.find((item) => matchesCropName(farmCrop, item.name));
  if (!crop) return null;

  const models = metadata.models.filter(
    (model) => model.cropCode === crop.code && getPredictionDateRange(model) !== null,
  );
  if (models.length === 0) return null;

  return { cropCode: crop.code, cropName: crop.name, models };
};
