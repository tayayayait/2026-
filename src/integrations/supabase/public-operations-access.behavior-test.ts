import { existsSync, readFileSync } from "node:fs";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const adminRoute = readFileSync(new URL("../../routes/admin.tsx", import.meta.url), "utf8");
const migrationPath = new URL(
  "../../../supabase/migrations/20260621120000_public_regional_operations_read.sql",
  import.meta.url,
);

assert(
  adminRoute.includes("redirect") && /to:\s*["']\/["']/.test(adminRoute),
  "retired regional operations route must redirect to the unified dashboard",
);
assert(
  !adminRoute.includes("loadFarms") &&
    !adminRoute.includes("loadAnalysisSnapshots") &&
    !adminRoute.includes("buildRegionalOperations"),
  "retired regional operations route must not load aggregate data",
);
assert(existsSync(migrationPath), "public regional operations read migration must exist");

if (!existsSync(migrationPath)) throw new Error("public regional operations migration unavailable");
const sql = readFileSync(migrationPath, "utf8");

assert(
  sql.includes('drop policy if exists "farm owners and admins read farms"'),
  "the owner-only farm read policy must be replaced",
);
assert(
  sql.includes('drop policy if exists "farm owners and admins read snapshots"'),
  "the owner-only snapshot read policy must be replaced",
);
assert(
  /create policy "authenticated users read farms"[\s\S]*for select to authenticated[\s\S]*using \(true\)/.test(
    sql,
  ),
  "authenticated visitors must be able to read all farms",
);
assert(
  /create policy "authenticated users read snapshots"[\s\S]*for select to authenticated[\s\S]*using \(true\)/.test(
    sql,
  ),
  "authenticated visitors must be able to read all analysis snapshots",
);
assert(!sql.includes("to anon"), "database access must still require an anonymous Supabase identity");
assert(
  !/for (insert|update|delete)/.test(sql),
  "public operations access must not broaden write permissions",
);

console.log("retired public regional operations behavior tests passed");
