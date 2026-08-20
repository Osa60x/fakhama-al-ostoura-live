export type DashboardRow = {
  fetched_at: string | null;
  last_successful_at: string | null;
  last_status: "ok" | "error" | "unavailable" | null;
  [key: string]: unknown;
};

export type DashboardFreshness = "fresh" | "stale" | "unavailable";

const STALE_AFTER_MS = 5 * 60 * 1000;

export function deriveFreshness(row: DashboardRow | null | undefined, now = Date.now()): DashboardFreshness {
  if (!row?.fetched_at) return "unavailable";
  const fetchedAt = new Date(row.fetched_at).getTime();
  const lastSuccessfulAt = row.last_successful_at ? new Date(row.last_successful_at).getTime() : Number.NaN;
  if (Number.isNaN(fetchedAt)) return "unavailable";
  // لا تكون اللقطة fresh إلا إذا دلّ وقت نجاح موثق على أنها لم تتجاوز آخر نجاح حقيقي.
  if (Number.isNaN(lastSuccessfulAt) || lastSuccessfulAt < fetchedAt) return "stale";
  const freshnessReference = Math.min(fetchedAt, lastSuccessfulAt);
  if (row.last_status === "error" || now - freshnessReference > STALE_AFTER_MS) return "stale";
  return "fresh";
}

export function formatPublicDashboard(rows: DashboardRow[] | null | undefined, now = Date.now()) {
  const data = rows?.[0] ?? null;
  return { data, freshness: deriveFreshness(data, now) };
}
