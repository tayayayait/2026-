import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchAgriWeatherObservation } from "@/integrations/agriWeather/observation";

export const getAgriWeather = createServerFn({ method: "GET" })
  .validator((data: { lat: number; lng: number }) =>
    z.object({ lat: z.number(), lng: z.number() }).parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const obs = await fetchAgriWeatherObservation(data.lat, data.lng);
      return {
        ok: true,
        data: obs,
      };
    } catch (error) {
      console.error("AgriWeather fetch failed:", error);
      return { ok: false, error: "농업 기상 정보를 가져오는데 실패했습니다." };
    }
  });
