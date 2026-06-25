import { readFileSync, readdirSync } from "node:fs";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const migrationsDirectory = new URL("../../../supabase/migrations/", import.meta.url);
const migrationFiles = readdirSync(migrationsDirectory).sort();
const securityMigration = migrationFiles.find((name) => name.includes("secure_farm_ownership"));
assert(securityMigration !== undefined, "secure farm ownership migration must exist");
if (!securityMigration) throw new Error("security migration is unavailable");

const sql = readFileSync(new URL(securityMigration, migrationsDirectory), "utf8");
assert(
  sql.includes("revoke all on public.farms from anon"),
  "anonymous farm access must be revoked",
);
assert(
  sql.includes("revoke all on public.analysis_snapshots from anon"),
  "anonymous snapshot access must be revoked",
);
assert(sql.includes("auth.uid()"), "ownership policies must use the authenticated user id");
assert(
  sql.includes("app_metadata") && sql.includes("ADMIN"),
  "administrator policies must use trusted app metadata",
);
assert(
  sql.includes('drop policy if exists "prototype farms read"'),
  "prototype farm policies must be removed",
);
assert(
  sql.includes('drop policy if exists "prototype snapshots read"'),
  "prototype snapshot policies must be removed",
);

console.log("Supabase ownership security behavior tests passed");
