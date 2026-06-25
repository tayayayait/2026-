import { readFileSync, readdirSync } from "node:fs";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const migrationsDirectory = new URL("../../../supabase/migrations/", import.meta.url);
const migrationFile = readdirSync(migrationsDirectory)
  .sort()
  .find((name) => name.includes("create_notification_delivery"));
assert(migrationFile !== undefined, "notification delivery migration must exist");
if (!migrationFile) throw new Error("notification delivery migration is unavailable");

const sql = readFileSync(new URL(migrationFile, migrationsDirectory), "utf8");
assert(
  sql.includes("create table public.notification_preferences"),
  "notification preferences table must exist",
);
assert(
  sql.includes("create table public.notification_delivery_logs"),
  "notification delivery audit table must exist",
);
assert(sql.includes("browser_enabled boolean"), "browser consent state must be persisted");
assert(sql.includes("minimum_severity text"), "minimum severity must be persisted");
assert(sql.includes("next_retry_at timestamptz"), "retry timing must be auditable");
assert(
  sql.includes("foreign key (user_id, event_id)"),
  "delivery logs must reference the user's alert event",
);
assert(
  sql.includes("revoke all on public.notification_preferences from anon"),
  "anonymous preference table access must be revoked",
);
assert(
  sql.includes("revoke all on public.notification_delivery_logs from anon"),
  "anonymous delivery log access must be revoked",
);
assert(sql.includes("auth.uid() = user_id"), "notification ownership must use auth.uid");
assert(sql.includes("app_metadata") && sql.includes("ADMIN"), "ADMIN RLS access is required");

console.log("Supabase notification security behavior tests passed");
