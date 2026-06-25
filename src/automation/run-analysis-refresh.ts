import { createClient } from "@supabase/supabase-js";
import {
  createAnalysisSnapshot,
  deriveAnalysisAlerts,
} from "@/domains/analysis/snapshot-operations";
import { executeFarmAnalysis } from "@/domains/analysis/farm-analysis-service";
import {
  executeAnalysisRefreshBatch,
  selectAnalysisRefreshTargets,
} from "@/domains/automation/analysis-refresh";
import type { Farm } from "@/domains/farms/types";

interface ScheduledFarm extends Farm {
  user_id: string;
}

const parsePositiveInteger = (value: string | undefined, fallback: number, maximum: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
};

const createAdminClient = () => {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
};

const toSnapshotRow = (snapshot: ReturnType<typeof createAnalysisSnapshot>) => ({
  id: snapshot.id,
  farm_id: snapshot.farmId,
  farm_name: snapshot.farmName,
  region: snapshot.region,
  crop: snapshot.crop,
  score: snapshot.score,
  level: snapshot.level,
  weather: snapshot.weather,
  source_status: snapshot.sourceStatus,
  pest_count: snapshot.pestCount,
  recommended_works: snapshot.recommendedWorks,
  analyzed_at: snapshot.analyzedAt,
});

export const runAnalysisRefresh = async () => {
  const client = createAdminClient();
  const staleHours = parsePositiveInteger(process.env.ANALYSIS_REFRESH_STALE_HOURS, 6, 168);
  const batchLimit = parsePositiveInteger(process.env.ANALYSIS_REFRESH_BATCH_SIZE, 20, 100);
  const staleAfterMs = staleHours * 60 * 60 * 1000;
  const startedAt = new Date();
  const slotTime = Math.floor(startedAt.getTime() / staleAfterMs) * staleAfterMs;

  const [{ data: farmRows, error: farmError }, { data: snapshotRows, error: snapshotError }] =
    await Promise.all([
      client.from("farms").select("*").not("user_id", "is", null),
      client
        .from("analysis_snapshots")
        .select("farm_id, analyzed_at")
        .order("analyzed_at", { ascending: false })
        .limit(5000),
    ]);
  if (farmError || snapshotError) throw new Error("Failed to load refresh inputs");

  const farms = (farmRows ?? []) as ScheduledFarm[];
  const latest = new Map<string, string>();
  for (const row of snapshotRows ?? []) {
    if (!latest.has(row.farm_id)) latest.set(row.farm_id, row.analyzed_at);
  }
  const targets = selectAnalysisRefreshTargets(farms, latest, {
    now: startedAt.toISOString(),
    staleAfterMs,
    limit: batchLimit,
  });

  const result = await executeAnalysisRefreshBatch(targets, async (farm) => {
    const analysis = await executeFarmAnalysis(farm);
    const snapshot = createAnalysisSnapshot({
      farm,
      analysis: { ...analysis, analyzedAt: startedAt.toISOString() },
    });
    snapshot.id = `scheduled-${farm.id}-${slotTime}`;

    const { error: snapshotWriteError } = await client
      .from("analysis_snapshots")
      .upsert(toSnapshotRow(snapshot), { onConflict: "id" });
    if (snapshotWriteError) throw new Error("Snapshot persistence failed");

    const alerts = deriveAnalysisAlerts([snapshot]);
    if (alerts.length === 0) return;
    const { error: alertWriteError } = await client.from("alert_events").upsert(
      alerts.map((alert) => ({
        user_id: farm.user_id,
        id: alert.id,
        snapshot_id: alert.snapshotId,
        farm_id: alert.farmId,
        farm_name: alert.farmName,
        region: alert.region,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        created_at: alert.createdAt,
        read_at: null,
      })),
      { onConflict: "user_id,id", ignoreDuplicates: true },
    );
    if (!alertWriteError) return;

    await client.from("analysis_snapshots").delete().eq("id", snapshot.id);
    throw new Error("Alert persistence failed");
  });

  return { ...result, selected: targets.length, startedAt: startedAt.toISOString() };
};

runAnalysisRefresh()
  .then((result) => console.log(JSON.stringify(result)))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Analysis refresh failed");
    process.exitCode = 1;
  });
