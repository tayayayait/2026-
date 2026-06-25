import { normalizeSupabaseProjectUrl } from "./client";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

assert(
  normalizeSupabaseProjectUrl("https://example.supabase.co/rest/v1/") ===
    "https://example.supabase.co",
  "Supabase REST endpoint must normalize to the project URL",
);
assert(
  normalizeSupabaseProjectUrl("https://example.supabase.co/") === "https://example.supabase.co",
  "Supabase project URL must remove a trailing slash",
);

console.log("Supabase client contract tests passed");
