import { readFileSync, readdirSync } from "node:fs";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const migrationsDirectory = new URL("../../../supabase/migrations/", import.meta.url);
const migrationFile = readdirSync(migrationsDirectory)
  .sort()
  .find((name) => name.includes("create_alert_events"));
assert(migrationFile !== undefined, "alert event migration must exist");
if (!migrationFile) throw new Error("alert event migration is unavailable");

const sql = readFileSync(new URL(migrationFile, migrationsDirectory), "utf8");
assert(sql.includes("create table public.alert_events"), "alert_events table must be created");
assert(sql.includes("read_at timestamptz"), "alert events must persist read state");
assert(sql.includes("primary key (user_id, id)"), "alert event identity must be user scoped");
assert(sql.includes("revoke all on public.alert_events from anon"), "anon access must be revoked");
assert(sql.includes("auth.uid() = user_id"), "event owners must be enforced by RLS");
assert(sql.includes("app_metadata") && sql.includes("ADMIN"), "ADMIN RLS access is required");

console.log("Supabase alert event security behavior tests passed");
