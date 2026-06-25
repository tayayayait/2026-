export const resolveDashboardFarmId = <T extends { id: string }>(
  farms: T[],
  selectedFarmId: string | null,
): string | null => {
  if (farms.length === 0) return null;
  if (selectedFarmId && farms.some((farm) => farm.id === selectedFarmId)) {
    return selectedFarmId;
  }
  return farms[0]?.id ?? null;
};
