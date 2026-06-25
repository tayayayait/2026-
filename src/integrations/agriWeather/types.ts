export interface MafraAgriWeatherRow {
  rowNumber: number;
  observedDate: string;
  stationName?: string;
  stationLatitude: number;
  stationLongitude: number;
  rainfall?: number;
  maxTemperature?: number;
  minTemperature?: number;
  averageTemperature?: number;
  solarRadiation?: number;
  humidity?: number;
  windDirection?: string;
  windSpeed?: number;
  sunshineDuration?: number;
  observationDistance?: number; // API 제공 관측지점 거리
  kmaStationName?: string;
  kmaStationLatitude?: number;
  kmaStationLongitude?: number;
  kmaRainfall?: number;
  kmaMaxTemperature?: number;
  kmaMinTemperature?: number;
  kmaMaxWindSpeed?: number;
  kmaMaxInstantWindSpeed?: number;
  kmaSnowDepth?: number;
}

export interface MafraAgriWeatherPage {
  totalCount: number;
  resultCode: string;
  resultMessage: string;
  rows: MafraAgriWeatherRow[];
}

export interface AgriWeatherObservation {
  source: "MAFRA_AGRI_WEATHER";
  observedDate: string;
  stationName: string;
  stationLatitude: number;
  stationLongitude: number;
  distanceKm: number;
  rainfall?: number;
  maxTemperature?: number;
  minTemperature?: number;
  averageTemperature?: number;
  solarRadiation?: number;
  humidity?: number;
  windDirection?: string;
  windSpeed?: number;
  sunshineDuration?: number;
  kmaStationName?: string;
  kmaStationLatitude?: number;
  kmaStationLongitude?: number;
  kmaRainfall?: number;
  kmaMaxTemperature?: number;
  kmaMinTemperature?: number;
  kmaMaxWindSpeed?: number;
  kmaMaxInstantWindSpeed?: number;
  kmaSnowDepth?: number;
}
