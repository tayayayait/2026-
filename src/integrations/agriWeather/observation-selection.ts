import type { AgriWeatherObservation, MafraAgriWeatherRow } from "./types";

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const calculateDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDate = (value: string) =>
  `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;

export const selectNearestLatestAgriWeatherObservation = (
  rows: MafraAgriWeatherRow[],
  latitude: number,
  longitude: number,
): AgriWeatherObservation | null => {
  const latestByStation = new Map<string, MafraAgriWeatherRow>();
  for (const row of rows) {
    const stationKey = `${row.stationLatitude.toFixed(5)}:${row.stationLongitude.toFixed(5)}`;
    const current = latestByStation.get(stationKey);
    if (!current || row.observedDate > current.observedDate) latestByStation.set(stationKey, row);
  }

  const nearest = Array.from(latestByStation.values())
    .map((row) => ({
      row,
      distanceKm: calculateDistanceKm(
        latitude,
        longitude,
        row.stationLatitude,
        row.stationLongitude,
      ),
    }))
    .sort((left, right) => left.distanceKm - right.distanceKm)[0];

  if (!nearest) return null;
  const { row, distanceKm } = nearest;
  return {
    source: "MAFRA_AGRI_WEATHER",
    observedDate: formatDate(row.observedDate),
    stationName: row.stationName || row.kmaStationName || "농업기상 관측지점",
    stationLatitude: row.stationLatitude,
    stationLongitude: row.stationLongitude,
    distanceKm: row.observationDistance ?? distanceKm,
    rainfall: row.rainfall,
    maxTemperature: row.maxTemperature,
    minTemperature: row.minTemperature,
    averageTemperature: row.averageTemperature,
    solarRadiation: row.solarRadiation,
    humidity: row.humidity,
    windDirection: row.windDirection,
    windSpeed: row.windSpeed,
    sunshineDuration: row.sunshineDuration,
    kmaStationName: row.kmaStationName,
    kmaStationLatitude: row.kmaStationLatitude,
    kmaStationLongitude: row.kmaStationLongitude,
    kmaRainfall: row.kmaRainfall,
    kmaMaxTemperature: row.kmaMaxTemperature,
    kmaMinTemperature: row.kmaMinTemperature,
    kmaMaxWindSpeed: row.kmaMaxWindSpeed,
    kmaMaxInstantWindSpeed: row.kmaMaxInstantWindSpeed,
    kmaSnowDepth: row.kmaSnowDepth,
  };
};
