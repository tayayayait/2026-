type RealtimeChannelLike = {
  topic?: string;
  on: (...args: any[]) => RealtimeChannelLike;
  subscribe: () => unknown;
};

type FarmRealtimeClientLike = {
  channel: (...args: any[]) => RealtimeChannelLike;
  getChannels?: () => Array<{ topic?: string }>;
  removeChannel?: (...args: any[]) => unknown;
};

export const FARMS_REALTIME_CHANNEL = "farms-public-changes";

const matchesFarmRealtimeChannel = (channel: { topic?: string }) =>
  channel.topic === FARMS_REALTIME_CHANNEL ||
  channel.topic === `realtime:${FARMS_REALTIME_CHANNEL}`;

export const subscribeToFarmChanges = (
  client: FarmRealtimeClientLike,
  onChange: () => void,
  options: { enabled?: boolean } = {},
) => {
  if (!options.enabled) return;

  for (const channel of client.getChannels?.() ?? []) {
    if (matchesFarmRealtimeChannel(channel)) client.removeChannel?.(channel);
  }

  client
    .channel(FARMS_REALTIME_CHANNEL)
    .on("postgres_changes", { event: "*", schema: "public", table: "farms" }, onChange)
    .subscribe();
};
