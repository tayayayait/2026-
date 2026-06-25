export const selectReportFarm = <T extends { id: string }>(
  farms: T[],
  reportId: string,
): T | undefined => {
  if (reportId === "latest") return farms[0];
  return farms.find((farm) => farm.id === reportId);
};
