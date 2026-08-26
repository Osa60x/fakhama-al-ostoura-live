import { ApiError } from "./auth";

export function validateSettings(value: unknown): Record<string, string | number | boolean> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new ApiError(400, "invalid_input", "صيغة الإعدادات غير صالحة.");
  const source = value as Record<string, unknown>;
  const allowed = new Set(["site_name", "address", "show_address", "palette", "theme_mode", "title_font", "title_size", "title_weight", "title_color", "subtitle_size", "subtitle_weight", "subtitle_color", "chart_visible", "chart_default_range", "chart_mode"]);
  const result: Record<string, string | number | boolean> = {};
  for (const [key, item] of Object.entries(source)) {
    if (!allowed.has(key)) throw new ApiError(400, "invalid_input", "يتضمن الطلب حقلاً غير مسموح.");
    if (typeof item !== "string" && typeof item !== "number" && typeof item !== "boolean") throw new ApiError(400, "invalid_input", "تتضمن الإعدادات قيمة غير صالحة.");
    result[key] = item;
  }
  if (typeof result.site_name === "string" && (result.site_name.length < 2 || result.site_name.length > 64)) throw new ApiError(400, "invalid_input", "طول اسم المتجر غير صالح.");
  if (typeof result.address === "string" && (result.address.length < 2 || result.address.length > 160)) throw new ApiError(400, "invalid_input", "طول العنوان غير صالح.");
  for (const key of ["title_color", "subtitle_color"] as const) if (typeof result[key] === "string" && !/^#[0-9a-f]{6}$/i.test(result[key] as string)) throw new ApiError(400, "invalid_input", "لون النص يجب أن يكون بصيغة HEX.");

  const enumValues = {
    palette: ["gold_cream", "black_gold", "emerald_gold", "navy_gold"],
    theme_mode: ["light", "dark", "system"],
    title_font: ["Cairo", "Tajawal", "Noto Kufi Arabic"],
    chart_default_range: ["day", "week", "month"],
    chart_mode: ["line", "area"]
  } as const;
  for (const [key, values] of Object.entries(enumValues)) {
    const value = result[key];
    if (value !== undefined && (typeof value !== "string" || !values.includes(value as never))) throw new ApiError(400, "invalid_input", `قيمة ${key} غير صالحة.`);
  }

  const numericBounds = { title_size: [24, 48], title_weight: [600, 800], subtitle_size: [12, 22], subtitle_weight: [400, 600] } as const;
  for (const [key, [minimum, maximum]] of Object.entries(numericBounds)) {
    const value = result[key];
    if (value !== undefined && (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum)) throw new ApiError(400, "invalid_input", `قيمة ${key} غير صالحة.`);
  }
  if (result.title_weight !== undefined && ![600, 700, 800].includes(result.title_weight as number)) throw new ApiError(400, "invalid_input", "وزن العنوان غير صالح.");
  if (result.subtitle_weight !== undefined && ![400, 500, 600].includes(result.subtitle_weight as number)) throw new ApiError(400, "invalid_input", "وزن العنوان الفرعي غير صالح.");
  for (const key of ["show_address", "chart_visible"] as const) if (result[key] !== undefined && typeof result[key] !== "boolean") throw new ApiError(400, "invalid_input", `قيمة ${key} غير صالحة.`);
  return result;
}

export function validateContacts(value: unknown): Array<{ kind: string; label: string; value: string; sort_order: number; is_active: boolean }> {
  if (!Array.isArray(value) || value.length > 8) throw new ApiError(400, "invalid_input", "عدد روابط التواصل غير صالح.");
  const kinds = new Set(["whatsapp", "phone", "instagram", "snapchat", "telegram", "email"]);
  return value.map((item, index) => {
    if (typeof item !== "object" || item === null) throw new ApiError(400, "invalid_input", "صيغة رابط التواصل غير صالحة.");
    const record = item as Record<string, unknown>;
    const kind = record.kind;
    const label = record.label;
    const contactValue = record.value;
    const sortOrder = Number(record.sort_order ?? index);
    const isActive = record.is_active ?? true;
    if (typeof kind !== "string" || !kinds.has(kind) || typeof label !== "string" || label.length < 2 || label.length > 32 || typeof contactValue !== "string" || contactValue.length < 3 || contactValue.length > 512 || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 20 || typeof isActive !== "boolean") throw new ApiError(400, "invalid_input", "بيانات التواصل غير صالحة.");
    return { kind, label, value: contactValue, sort_order: sortOrder, is_active: isActive };
  });
}

export function validateManagerEmail(value: unknown): string {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "invalid_input", "البريد الإلكتروني للمدير غير صالح.");
  return email;
}
