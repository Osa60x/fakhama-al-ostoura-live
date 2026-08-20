export interface Env {
  ASSETS: Fetcher;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GOLD_API_URL?: string;
}

export type RuntimeHealth = "ok" | "error" | "unavailable";
