import { create } from "zustand";
import type { AuthenticatedUser } from "@/domains/auth/role";
import { supabase } from "@/integrations/supabase/client";
import { ensureSupabaseIdentity } from "@/integrations/supabase/session";
import type { Farm } from "./types";
import type { Database } from "@/integrations/supabase/types";
import { farmFromSupabaseRow, farmToSupabaseInsert } from "./supabase-mapper";
import { shouldLoadFarms } from "./store-cache";
import { subscribeToFarmChanges } from "./store-realtime";

type FarmInsert = Database["public"]["Tables"]["farms"]["Insert"];
type FarmInsertClient = {
  insert: (value: FarmInsert) => Promise<{ error: unknown | null }>;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "알 수 없는 오류";

const parseStoredFarms = (raw: string): Farm[] => {
  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed)
    ? (parsed as Farm[]).filter((farm) => !farm.id.startsWith("demo-farm-"))
    : [];
};

export type FarmDataSource = "SUPABASE" | "LOCAL" | "EMPTY" | "ERROR";

const LEGACY_STORAGE_KEY = "farmsync.farms.v1";
const getStorageKey = (identity: AuthenticatedUser | null) =>
  identity ? `${LEGACY_STORAGE_KEY}.${identity.id}` : `${LEGACY_STORAGE_KEY}.device`;

const readStoredFarms = (identity: AuthenticatedUser | null): Farm[] => {
  if (typeof window === "undefined") return [];
  const storageKey = getStorageKey(identity);
  const scoped = localStorage.getItem(storageKey);
  if (scoped) return parseStoredFarms(scoped);

  if (!identity?.isAnonymous) return [];
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return [];
  const farms = parseStoredFarms(legacy);
  localStorage.setItem(storageKey, JSON.stringify(farms));
  return farms;
};

const writeStoredFarms = (identity: AuthenticatedUser | null, farms: Farm[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(getStorageKey(identity), JSON.stringify(farms));
};

interface FarmsState {
  farms: Farm[];
  loading: boolean;
  error: string | null;
  source: FarmDataSource;
  loadedAt: number | null;
  loadFarms: (options?: { force?: boolean }) => Promise<void>;
  addFarm: (farm: Farm) => Promise<void>;
  removeFarm: (id: string) => Promise<void>;
}

export const useFarmsStore = create<FarmsState>((set, get) => {
  subscribeToFarmChanges(supabase, () => get().loadFarms({ force: true }), {
    enabled: typeof window !== "undefined",
  });

  return {
    farms: [],
    loading: false,
    error: null,
    source: "EMPTY",
    loadedAt: null,

    loadFarms: async (options = {}) => {
      const current = get();
      if (
        !shouldLoadFarms({
          loading: current.loading,
          source: current.source,
          loadedAt: current.loadedAt,
          nowMs: Date.now(),
          force: options.force,
        })
      ) {
        return;
      }
      set({ loading: true, error: null });
      let identity: AuthenticatedUser | null = null;
      try {
        identity = await ensureSupabaseIdentity();
        if (!identity) throw new Error("Supabase identity unavailable");
        const { data, error } = await supabase
          .from("farms")
          .select("*")
          .order("createdAt", { ascending: false });

        if (error) {
          console.error("Supabase load error:", error);
          throw error;
        }

        if (!data || data.length === 0) {
          set({ farms: [], loading: false, source: "EMPTY", loadedAt: Date.now() });
        } else {
          set({
            farms: data.map(farmFromSupabaseRow),
            loading: false,
            source: "SUPABASE",
            loadedAt: Date.now(),
          });
        }
      } catch (e: unknown) {
        // Fallback to local storage or sample data
        console.error("Failed to load from DB, falling back...", e);
        const message = getErrorMessage(e);
        const farms = readStoredFarms(identity);
        if (farms.length > 0) {
          set({ farms, loading: false, error: message, source: "LOCAL", loadedAt: Date.now() });
          return;
        }
        set({ farms: [], loading: false, error: message, source: "ERROR" });
      }
    },

    addFarm: async (farm: Farm) => {
      let identity: AuthenticatedUser | null = null;
      try {
        identity = await ensureSupabaseIdentity();
        if (!identity) throw new Error("Supabase identity unavailable");
        const farmInsertClient = supabase.from("farms") as unknown as FarmInsertClient;
        const { error } = await farmInsertClient.insert(farmToSupabaseInsert(farm, identity.id));
        if (error) throw error;
        const farms = [farm, ...get().farms.filter((item) => item.id !== farm.id)];
        set({ farms, source: "SUPABASE", loadedAt: Date.now() });
        // The realtime subscription will trigger a reload
      } catch (error: unknown) {
        console.error("Supabase insert error:", error);
        // Fallback to local storage
        const farms = readStoredFarms(identity);
        const newFarms = [farm, ...farms.filter((item) => item.id !== farm.id)];
        writeStoredFarms(identity, newFarms);
        set({ farms: newFarms, source: "LOCAL", loadedAt: Date.now() });
      }
    },

    removeFarm: async (id: string) => {
      let identity: AuthenticatedUser | null = null;
      try {
        identity = await ensureSupabaseIdentity();
        if (!identity) throw new Error("Supabase identity unavailable");
        const { error } = await supabase.from("farms").delete().eq("id", id);
        if (error) throw error;
      } catch (error: unknown) {
        console.error("Supabase delete error:", error);
        // Fallback
        const newFarms = get().farms.filter((f) => f.id !== id);
        set({ farms: newFarms });
        writeStoredFarms(identity, newFarms);
      }
    },
  };
});

// Backward compatibility wrappers for UI before Phase 5 rebuild
export async function loadFarms(): Promise<Farm[]> {
  await useFarmsStore.getState().loadFarms();
  return useFarmsStore.getState().farms;
}

export async function addFarm(farm: Farm): Promise<void> {
  await useFarmsStore.getState().addFarm(farm);
}
