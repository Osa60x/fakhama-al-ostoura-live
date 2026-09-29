export const STORE_THEMES = {
  gold_cream: { label: "بريق الأسطورة" },
  emerald_gold: { label: "زمرد الصائغ" },
  navy_gold: { label: "ليل الياقوت" }
} as const;

export type StoreTheme = keyof typeof STORE_THEMES;

export function resolveStoreTheme(value: unknown): StoreTheme {
  return typeof value === "string" && value in STORE_THEMES ? value as StoreTheme : "gold_cream";
}
