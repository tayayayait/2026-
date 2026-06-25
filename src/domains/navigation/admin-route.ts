export const isRetiredRegionalOperationsPath = (pathname: string) =>
  pathname === "/admin" || pathname.startsWith("/admin/");
