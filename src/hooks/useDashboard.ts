import { useEffect, useState } from "react";
import { buildCaratPrices } from "../lib/price";
export type PublicDashboard = { site_name?: string; logo_path?: string | null; address?: string; show_address?: boolean; palette?: string; title_font?: string; title_size?: number; title_weight?: number; title_color?: string; subtitle_size?: number; subtitle_weight?: number; subtitle_color?: string; xau_usd?: number | string | null; final_24_sar?: number | string | null; final_21_sar?: number | string | null; final_18_sar?: number | string | null; fetched_at?: string | null };
export type Freshness = "fresh" | "stale" | "unavailable";
export type ChartRange = "day" | "week" | "month";
export type HistoryPoint = { bucket: string; price_sar: number | string };
type ApiReply = { data: PublicDashboard | null; freshness: Freshness; history: HistoryPoint[]; status: "ok" | "unconfigured" | "unavailable" };
type LiveQuote = { price?: number | string; sourceUpdatedAt?: number | string; fetchedAt?: number | string; status?: string };
type LiveHistory = { points?: Array<{ ts?: number | string; price?: number | string }> };
const LIVE_API_ORIGIN = (import.meta.env.VITE_LIVE_API_ORIGIN ?? "https://sabaaek-gold-api.osa60x.workers.dev").replace(/\/$/, "");
function asIso(value: number | string | undefined): string | null { const date = new Date(typeof value === "number" ? value : Number(value)); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
export function toNumber(value: number | string | null | undefined): number | null { const parsed = typeof value === "number" ? value : Number(value); return Number.isFinite(parsed) ? parsed : null; }
export function dashboardFromLiveQuote(quote: LiveQuote, now = Date.now()): ApiReply | null {
  const xauUsd = toNumber(quote.price); const fetchedAt = asIso(quote.fetchedAt) ?? new Date(now).toISOString(); const sourceUpdatedAt = asIso(quote.sourceUpdatedAt) ?? fetchedAt;
  if (xauUsd === null || xauUsd <= 0) return null;
  const prices = buildCaratPrices({ xauUsd }); const age = now - new Date(fetchedAt).getTime();
  return { data: { xau_usd: xauUsd, final_24_sar: prices[0].finalSar, final_21_sar: prices[1].finalSar, final_18_sar: prices[2].finalSar, fetched_at: sourceUpdatedAt }, freshness: age <= 5 * 60 * 1000 ? "fresh" : "stale", history: [], status: "ok" };
}
async function fetchLiveHistory(range: ChartRange, signal: AbortSignal): Promise<HistoryPoint[]> {
  const sourceRange = range === "week" ? "7d" : range === "month" ? "30d" : "24h";
  const localRange = range === "week" ? "week" : range === "month" ? "month" : "day";
  const candidates = [`/api/live-history?range=${localRange}`, `${LIVE_API_ORIGIN}/history?range=${sourceRange}`];
  for (const endpoint of candidates) {
    try {
      const response = await fetch(endpoint, { signal, cache: "no-store" });
      if (!response.ok) continue;
      const payload = await response.json() as LiveHistory;
      const points = (payload.points ?? []).map(point => { const ounce = toNumber(point.price); const timestamp = asIso(point.ts); if (ounce === null || !timestamp) return null; return { bucket: timestamp, price_sar: buildCaratPrices({ xauUsd: ounce })[0].finalSar } as HistoryPoint; }).filter((point): point is HistoryPoint => point !== null);
      if (points.length >= 2) return points;
    } catch { /* continue to the direct source */ }
  }
  return [];
}
export function useDashboard(range: ChartRange) {
  const [state, setState] = useState<{ loading: boolean; reply: ApiReply | null }>({ loading: true, reply: null });
  useEffect(() => {
    const controller = new AbortController(); setState(current => ({ loading: current.reply === null, reply: current.reply }));
    fetch(`/api/public/dashboard?range=${range}`, { signal: controller.signal }).then(async response => { const body = await response.json() as ApiReply; if (response.ok && body.data) { const history = body.history?.length >= 2 ? body.history : await fetchLiveHistory(range, controller.signal); return { ...body, history }; } throw new Error("dashboard_unavailable"); }).then(body => setState({ loading: false, reply: body })).catch(async error => {
      if (controller.signal.aborted) return;
      try {
        const quoteEndpoints = ["/api/live-quote", `${LIVE_API_ORIGIN}/quote`];
        let quote: LiveQuote | null = null;
        for (const endpoint of quoteEndpoints) {
          try { const response = await fetch(endpoint, { signal: controller.signal, cache: "no-store" }); if (response.ok) { quote = await response.json() as LiveQuote; break; } } catch { /* try the next endpoint */ }
        }
        const fallback = quote ? dashboardFromLiveQuote(quote) : null;
        if (!fallback) throw new Error("quote_unavailable");
        const history = await fetchLiveHistory(range, controller.signal).catch(() => []);
        setState({ loading: false, reply: { ...fallback, history } });
      }
      catch { if (!controller.signal.aborted && error) setState({ loading: false, reply: { data: null, freshness: "unavailable", history: [], status: "unavailable" } }); }
    });
    return () => controller.abort();
  }, [range]);
  return state;
}
