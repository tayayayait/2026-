export interface WeatherData {
  region: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  rainfallForecast: number;
  wind: number;
  updatedAt: string;
}

export type KmaEndpoint = "VILAGE_FCST" | "ULTRA_SRT_NCST" | "ULTRA_SRT_FCST";

export type KmaCategory =
  | "TMP"
  | "TMN"
  | "TMX"
  | "T1H"
  | "REH"
  | "PCP"
  | "RN1"
  | "POP"
  | "WSD"
  | "PTY"
  | "SKY"
  | "VEC"
  | "UUU"
  | "VVV"
  | "SNO"
  | "LGT"
  | "WAV";

export type KmaPrecipitationType =
  | "NONE"
  | "RAIN"
  | "RAIN_SNOW"
  | "SNOW"
  | "SHOWER"
  | "DRIZZLE"
  | "DRIZZLE_SNOW"
  | "SNOW_FLURRY"
  | "UNKNOWN";

export type KmaSkyCondition = "CLEAR" | "MOSTLY_CLOUDY" | "CLOUDY" | "UNKNOWN";

export interface KmaBaseDateTime {
  baseDate: string;
  baseTime: string;
}

export interface KmaForecastItem {
  baseDate: string;
  baseTime: string;
  category: KmaCategory | string;
  fcstDate?: string;
  fcstTime?: string;
  fcstValue?: string;
  obsrValue?: string;
  nx: number;
  ny: number;
}

export interface KmaEndpointResult extends KmaBaseDateTime {
  endpoint: KmaEndpoint;
  nx: number;
  ny: number;
  items: KmaForecastItem[];
}

export interface KmaWeatherSnapshot extends KmaBaseDateTime {
  source: "KMA";
  nx: number;
  ny: number;
  temperature: number | null;
  humidity: number | null;
  precipitationMm: number | null;
  precipitationProbability: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  precipitationType: KmaPrecipitationType;
  sky: KmaSkyCondition;
  updatedAt: string;
}

export interface LegacyKmaForecast {
  temp: number;
  hum: number;
  rain: number;
  pop: number;
  wind: number;
  pty: KmaPrecipitationType;
  sky: KmaSkyCondition;
  vec: number | null;
  nx: number;
  ny: number;
  baseDate: string;
  baseTime: string;
}
