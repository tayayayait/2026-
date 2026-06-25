import { fetchMafraAgriWeatherRows } from "./mafra-client";
import { selectNearestLatestAgriWeatherObservation } from "./observation-selection";
import type { AgriWeatherObservation } from "./types";

export type { AgriWeatherObservation } from "./types";

export async function fetchAgriWeatherObservation(
  lat: number,
  lng: number,
): Promise<AgriWeatherObservation> {
  const rows = await fetchMafraAgriWeatherRows();
  const observation = selectNearestLatestAgriWeatherObservation(rows, lat, lng);
  if (!observation) throw new Error("MAFRA agricultural weather observation not found");
  return observation;
}
