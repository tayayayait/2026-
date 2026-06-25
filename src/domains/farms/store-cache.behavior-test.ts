export {};

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

interface StoreCacheModule {
  FARMS_CACHE_TTL_MS: number;
  shouldLoadFarms: (input: {
    loading: boolean;
    source: "SUPABASE" | "LOCAL" | "EMPTY" | "ERROR";
    loadedAt: number | null;
    nowMs: number;
    force?: boolean;
    maxAgeMs?: number;
  }) => boolean;
}

interface StoreRealtimeModule {
  FARMS_REALTIME_CHANNEL: string;
  subscribeToFarmChanges: (
    client: {
      channel: (name: string) => {
        topic?: string;
        on: (event: string, filter: Record<string, unknown>, callback: () => void) => unknown;
        subscribe: () => unknown;
      };
      getChannels?: () => Array<{ topic?: string }>;
      removeChannel?: (channel: { topic?: string }) => unknown;
    },
    onChange: () => void,
    options?: { enabled?: boolean },
  ) => void;
}

const modulePath = "./store-cache.ts";
const cacheModule = (await import(modulePath).catch(() => null)) as StoreCacheModule | null;
assert(cacheModule !== null, "farm store cache policy must be implemented");
if (!cacheModule) throw new Error("farm store cache policy is unavailable");

const { FARMS_CACHE_TTL_MS, shouldLoadFarms } = cacheModule;
assert(FARMS_CACHE_TTL_MS > 0, "farm store cache must define a positive TTL");

const base = {
  loading: false,
  source: "SUPABASE" as const,
  loadedAt: 1_000,
  nowMs: 1_000,
};

assert(
  shouldLoadFarms({ ...base, loadedAt: null }),
  "dashboard must load farms when there is no previous result",
);
assert(!shouldLoadFarms(base), "fresh farm results must be reused on dashboard re-entry");
assert(
  shouldLoadFarms({ ...base, force: true }),
  "explicit refreshes and realtime updates must bypass the farm cache",
);
assert(
  shouldLoadFarms({ ...base, source: "ERROR" }),
  "failed farm loads must be retried on the next dashboard entry",
);
assert(
  shouldLoadFarms({ ...base, nowMs: base.loadedAt + FARMS_CACHE_TTL_MS }),
  "expired farm results must be loaded again",
);
assert(
  !shouldLoadFarms({ ...base, loading: true, force: true }),
  "an in-flight farm load must not be duplicated",
);

const realtimeModule = (await import("./store-realtime.ts").catch(() => null)) as
  | StoreRealtimeModule
  | null;
assert(realtimeModule !== null, "farm realtime subscription policy must be implemented");
if (!realtimeModule) throw new Error("farm realtime subscription policy is unavailable");

let removedTopic = "";
let subscribed = false;
let callbackRegistered = false;
const staleChannel = { topic: `realtime:${realtimeModule.FARMS_REALTIME_CHANNEL}` };
realtimeModule.subscribeToFarmChanges(
  {
    getChannels: () => [staleChannel],
    removeChannel: (channel) => {
      removedTopic = channel.topic ?? "";
    },
    channel: (name) => ({
      topic: `realtime:${name}`,
      on: (event, filter, callback) => {
        callbackRegistered =
          event === "postgres_changes" &&
          filter.event === "*" &&
          filter.schema === "public" &&
          filter.table === "farms" &&
          typeof callback === "function";
        return {
          topic: `realtime:${name}`,
          subscribe: () => {
            subscribed = true;
          },
        };
      },
      subscribe: () => {
        throw new Error("subscribe must be called on the channel returned by on()");
      },
    }),
  },
  () => undefined,
  { enabled: true },
);
assert(
  removedTopic === staleChannel.topic,
  "farm realtime subscription must remove a stale channel before registering callbacks",
);
assert(callbackRegistered, "farm realtime subscription must register the farms change callback");
assert(subscribed, "farm realtime subscription must subscribe after registering callbacks");

console.log("farm store cache behavior tests passed");
