import type { KmaWeatherSnapshot, LegacyKmaForecast } from "./types";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

type LegacyMapper = (snapshot: KmaWeatherSnapshot) => LegacyKmaForecast;
const modulePath = "./legacy-forecast.ts";
const forecastModule = await import(modulePath).catch(() => null);
const toLegacyKmaForecast = (forecastModule as { toLegacyKmaForecast?: LegacyMapper } | null)
  ?.toLegacyKmaForecast;

assert(typeof toLegacyKmaForecast === "function", "KMA legacy mapper must be implemented");
if (!toLegacyKmaForecast) throw new Error("KMA legacy mapper is unavailable");

const snapshot: KmaWeatherSnapshot = {
  source: "KMA",
  nx: 56,
  ny: 92,
  baseDate: "20260620",
  baseTime: "0800",
  temperature: 28,
  humidity: 82,
  precipitationMm: 0,
  precipitationProbability: null,
  windSpeed: 2,
  windDirection: null,
  precipitationType: "NONE",
  sky: "CLEAR",
  updatedAt: "2026-06-20T09:00:00+09:00",
};

const mapped = toLegacyKmaForecast(snapshot);
assert(mapped.temp === 28 && mapped.hum === 82 && mapped.wind === 2, "live values mismatch");
assert(
  mapped.baseDate === snapshot.baseDate &&
    mapped.baseTime === snapshot.baseTime &&
    mapped.nx === snapshot.nx &&
    mapped.ny === snapshot.ny,
  "KMA base time and grid metadata must be preserved",
);

let missingRequiredValuesRejected = false;
try {
  toLegacyKmaForecast({ ...snapshot, temperature: null });
} catch {
  missingRequiredValuesRejected = true;
}
assert(
  missingRequiredValuesRejected,
  "missing KMA temperature must be rejected instead of converted to zero",
);

console.log("KMA required-value behavior tests passed");
