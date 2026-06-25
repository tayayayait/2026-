import type { KmaWeatherSnapshot, LegacyKmaForecast } from "./types";

export const toLegacyKmaForecast = (snapshot: KmaWeatherSnapshot): LegacyKmaForecast => {
  if (
    snapshot.temperature === null ||
    snapshot.humidity === null ||
    snapshot.precipitationMm === null ||
    snapshot.windSpeed === null
  ) {
    throw new Error(
      "KMA response is missing required temperature, humidity, precipitation, or wind values",
    );
  }

  return {
    temp: snapshot.temperature,
    hum: snapshot.humidity,
    rain: snapshot.precipitationMm,
    pop: snapshot.precipitationProbability ?? 0,
    wind: snapshot.windSpeed,
    pty: snapshot.precipitationType,
    sky: snapshot.sky,
    vec: snapshot.windDirection,
    nx: snapshot.nx,
    ny: snapshot.ny,
    baseDate: snapshot.baseDate,
    baseTime: snapshot.baseTime,
  };
};
