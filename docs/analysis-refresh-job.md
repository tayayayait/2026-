# Scheduled Analysis Refresh

## Status

The refresh worker is implemented but not scheduled in any deployed environment. The configured Supabase project is not accessible to the current CLI account, and `SUPABASE_SERVICE_ROLE_KEY` is not configured locally.

## Command

```powershell
pnpm run analysis:refresh
```

The command exits before any network request when required Supabase server credentials are missing.

## Required Server Environment

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
PUBLIC_DATA_SERVICE_KEY=<server-only-key>
NCPMS_API_KEY=<server-only-key>
RDA_PEST_OCCURRENCE_API_KEY=<server-only-key>
MAFRA_API_KEY=<server-only-key>
```

Optional controls:

```text
ANALYSIS_REFRESH_STALE_HOURS=6
ANALYSIS_REFRESH_BATCH_SIZE=20
```

- `ANALYSIS_REFRESH_STALE_HOURS` accepts `1-168` hours.
- `ANALYSIS_REFRESH_BATCH_SIZE` accepts `1-100` farms per run.
- Invalid values use the defaults above.
- The service role key must never use a `VITE_` prefix or be exposed to browser code.

## Workflow

1. Load farms with an authenticated owner.
2. Load the latest snapshot time for each farm.
3. Select never-analyzed farms first, then the oldest farms beyond the stale threshold.
4. Process farms sequentially to limit upstream API traffic.
5. Reuse the same KMA, MAFRA, NCPMS, and RDA analysis service used by interactive analysis.
6. Upsert a deterministic snapshot ID for the current refresh time slot.
7. Insert derived alert events without overwriting existing read state.
8. Continue processing when one farm fails and return aggregate success/failure counts.

The deterministic time-slot ID makes repeated invocations idempotent for snapshot and alert identities. A scheduler must not overlap runs because external API work can still be duplicated.

## Scheduling

Run the command hourly in a trusted server environment. The stale threshold controls whether a farm is selected, so hourly triggering does not imply hourly API calls for every farm.

Do not schedule the worker until:

1. All Supabase migrations are applied in timestamp order.
2. Generated Supabase types are refreshed from the deployed schema.
3. Anonymous farmer authentication is enabled.
4. The service role key and provider API keys are stored in server-only secrets.
5. One manual run returns a successful JSON summary.

## Output

Successful runs print one JSON object:

```json
{
  "processed": 3,
  "succeeded": 2,
  "failed": 1,
  "failures": [{ "farmId": "...", "reason": "provider timeout" }],
  "selected": 3,
  "startedAt": "2026-06-21T00:00:00.000Z"
}
```

The output does not include API keys, addresses, or farm names.
