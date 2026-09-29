import { useEffect, useState } from "react";
import { buildCaratPrices } from "../lib/price";

export type PublicDashboard = {
  site_name?: string;
  logo_path?: string | null;
  address?: string;
  show_address?: boolean;
  palette?: string;
  title_font?: string;
  title_size?: number;
  title_weight?: number;
  title_color?: string;
  subtitle_size?: number;
  subtitle_weight?: number;
  subtitle_color?: string;
  xau_usd?: number | string | null;
  final_24_sar?: number | string | null;
  final_21_sar?: number | string | null;
  final_18_sar?: number | string | null;
  fetched_at?: string | null;
};

export type Freshness = "fresh" | "stale" | "unavailable";
export type ChartRange = "day" | "week" | "month";
export type HistoryPoint = { bucket: string; price_sar: number | string };
type ApiReply = { data: PublicDashboard | null; freshness: Freshness; history: HistoryPoint[]; status: "ok" | "unconfigured" | "unavailable" };

type LiveQuote = { price?: number | string; sourceUpdatedAt?: number | string; fetchedAt?: number | string; status?: string };

const LIVE_QUOTE_ENDPOINT = "/api/live-quote";

function asIso(value: number | string | undefined): string | null {
  const date = new Date(typeof value === "number" ? value : Number(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function dashboardFromLiveQuote(quote: LiveQuote, now = Date.now()): ApiReply | null {
  const xauUsd = toNumber(quote.price);
  const fetchedAt = asIso(quote.fetchedAt) ?? new Date(now).toISOString();
  const sourceUpdatedAt = asIso(quote.sourceUpdatedAt) ?? fetchedAt;
  if (xauUsd === null || xauUsd <= 0) return null;
  const prices = buildCaratPrices({ xauUsd });
  const age = now - new Date(fetchedAt).getTime();
  return {
    data: { xau_usd: xauUsd, final_24_sar: prices[0].finalSar, final_21_sar: prices[1].finalSar, final_18_sar: prices[2].finalSar, fetched_at: sourceUpdatedAt },
    freshness: age <= 5 * 60 * 1000 ? "fresh" : "stale",
    history: [],
    status: "ok"
  };
}

export function toNumber(value: number | string | null | undefined): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function useDashboard(range: ChartRange) {
  const [state, setState] = useState<{ loading: boolean; reply: ApiReply | null }>({ loading: true, reply: null });
  useEffect(() => {
    const controller = new AbortController();
    setState(current => ({ loading: current.reply === null, reply: current.reply }));
    fetch(`/api/public/dashboard?range=${range}`, { signal: controller.signal })
      .then(async response => {
        const body = await response.json() as ApiReply;
        if (response.ok && body.data) return body;
        throw new Error("dashboard_unavailable");
      })
      .catch(async error => {
        if (controller.signal.aborted) return;
        try {
          const response = await fetch(LIVE_QUOTE_ENDPOINT, { signal: controller.signal, cache: "no-store" });
          if (!response.ok) throw new Error("quote_unavailable");
          const fallback = dashboardFromLiveQuote(await response.json() as LiveQuote);
          if (!fallback) throw new Error("quote_invalid");
          setState({ loading: false, reply: fallback });
        } catch {
          if (!controller.signal.aborted && error) setState({ loading: false, reply: { data: null, freshness: "unavailable", history: [], status: "unavailable" } });
        }
      });
    return () => controller.abort();
  }, [range]);
  return state;
}
