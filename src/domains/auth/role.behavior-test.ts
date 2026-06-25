export {};

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

interface AuthRoleModule {
  resolveUserRole: (appMetadata: unknown) => "FARMER" | "ADMIN";
  toAuthenticatedUser: (user: {
    id: string;
    email?: string;
    app_metadata?: unknown;
    is_anonymous?: boolean;
  }) => {
    id: string;
    email?: string;
    role: "FARMER" | "ADMIN";
    isAnonymous: boolean;
  };
  canAccessAdmin: (user: { role: "FARMER" | "ADMIN" } | null) => boolean;
}

const modulePath = "./role.ts";
const roleModule = (await import(modulePath).catch(() => null)) as AuthRoleModule | null;
assert(roleModule !== null, "auth role module must be implemented");
if (!roleModule) throw new Error("auth role module is unavailable");

assert(roleModule.resolveUserRole({ role: "ADMIN" }) === "ADMIN", "ADMIN app role mismatch");
assert(roleModule.resolveUserRole({ role: "admin" }) === "FARMER", "role matching must be strict");
assert(roleModule.resolveUserRole(null) === "FARMER", "missing role must default to FARMER");

const admin = roleModule.toAuthenticatedUser({
  id: "admin-1",
  email: "admin@example.com",
  app_metadata: { role: "ADMIN" },
});
assert(admin.role === "ADMIN", "authenticated admin mapping mismatch");
assert(admin.email === "admin@example.com", "authenticated email mapping mismatch");

const farmer = roleModule.toAuthenticatedUser({ id: "farmer-1", app_metadata: {} });
assert(farmer.role === "FARMER", "anonymous users must map to FARMER");
assert(!farmer.isAnonymous, "regular users must not be marked anonymous");
const anonymousFarmer = roleModule.toAuthenticatedUser({
  id: "anonymous-1",
  app_metadata: {},
  is_anonymous: true,
});
assert(anonymousFarmer.isAnonymous, "anonymous Supabase users must be identified");
assert(roleModule.canAccessAdmin(admin), "ADMIN users must access administrator routes");
assert(!roleModule.canAccessAdmin(farmer), "FARMER users must not access administrator routes");
assert(!roleModule.canAccessAdmin(null), "signed-out users must not access administrator routes");

console.log("auth role behavior tests passed");
