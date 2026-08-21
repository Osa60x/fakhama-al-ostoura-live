import { useEffect, useState } from "react";

export type PublicDashboard = {
  site_name?: string;
  logo_path?: string | null;
  address?: string;
  show_address?: boolean;
  title_font?: string;
  title_weight?: number;
  title_color?: string;
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
      .then(async response => await response.json() as ApiReply)
      .then(body => setState({ loading: false, reply: body }))
      .catch(() => { if (!controller.signal.aborted) setState({ loading: false, reply: { data: null, freshness: "unavailable", history: [], status: "unavailable" } }); });
    return () => controller.abort();
  }, [range]);
  return state;
}
