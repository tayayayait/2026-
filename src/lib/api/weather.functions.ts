import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchKmaForecast } from "@/integrations/kma/forecast";

export const getFarmWeather = createServerFn({ method: "GET" })
  .validator((data: { lat: number; lng: number }) =>
    z.object({ lat: z.number(), lng: z.number() }).parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const forecast = await fetchKmaForecast(data.lat, data.lng);
      return {
        ok: true,
        data: {
          temperature: forecast.temp,
          humidity: forecast.hum,
          rainfall: forecast.rain,
          rainfallProbability: forecast.pop,
        },
      };
    } catch (error) {
      console.error("KMA fetch failed:", error);
      return { ok: false, error: "기상 정보를 가져오지 못했습니다." };
    }
  });
