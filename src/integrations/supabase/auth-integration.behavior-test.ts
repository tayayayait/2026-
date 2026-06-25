import { existsSync, readFileSync } from "node:fs";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const authStore = readFileSync(new URL("../../hooks/use-auth.ts", import.meta.url), "utf8");
const rootRoute = readFileSync(new URL("../../routes/__root.tsx", import.meta.url), "utf8");
const farmStore = readFileSync(new URL("../../domains/farms/store.ts", import.meta.url), "utf8");
const farmMapper = readFileSync(
  new URL("../../domains/farms/supabase-mapper.ts", import.meta.url),
  "utf8",
);
const adminRoute = readFileSync(new URL("../../routes/admin.tsx", import.meta.url), "utf8");
const sessionPath = new URL("./session.ts", import.meta.url);
const loginPath = new URL("../../routes/login.tsx", import.meta.url);

assert(!authStore.includes("mock-farmer"), "mock authentication must be removed");
assert(authStore.includes("signInWithPassword"), "real password sign-in must be implemented");
assert(authStore.includes("onAuthStateChange"), "auth state changes must update the app session");
assert(rootRoute.includes("useAuthInit"), "the root route must initialize Supabase auth");
assert(existsSync(sessionPath), "Supabase session bootstrap must exist");
assert(
  readFileSync(sessionPath, "utf8").includes("signInAnonymously"),
  "farm users must receive an anonymous Supabase identity",
);
assert(farmStore.includes("ensureSupabaseIdentity"), "farm persistence must wait for an identity");
assert(
  farmMapper.includes("user_id: userId"),
  "farm inserts must preserve the authenticated owner id",
);
assert(
  !adminRoute.includes("canAccessAdmin"),
  "retired regional operations route must not require the ADMIN role",
);
assert(
  adminRoute.includes("redirect") && /to:\s*["']\/["']/.test(adminRoute),
  "retired regional operations route must redirect to the unified dashboard",
);
assert(existsSync(loginPath), "an administrator login route must exist");

console.log("Supabase auth integration behavior tests passed");
