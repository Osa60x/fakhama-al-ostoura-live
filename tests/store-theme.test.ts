import { describe, expect, it } from "vitest";
import { STORE_THEMES, resolveStoreTheme } from "../src/lib/store-theme";

describe("ثيمات فخامة الأسطورة", () => {
  it("يعرّف ثلاث ثيمات فاخرة مسماة فقط", () => {
    expect(Object.keys(STORE_THEMES)).toEqual(["gold_cream", "emerald_gold", "navy_gold"]);
    expect(STORE_THEMES.gold_cream.label).toBe("ذهب الديوان");
    expect(STORE_THEMES.emerald_gold.label).toBe("زمرد الصائغ");
    expect(STORE_THEMES.navy_gold.label).toBe("ليل الياقوت");
  });

  it("يستعيد ثيمة ذهب الديوان بأمان عند قيمة لوحة غير معروفة", () => {
    expect(resolveStoreTheme("emerald_gold")).toBe("emerald_gold");
    expect(resolveStoreTheme("unknown")).toBe("gold_cream");
    expect(resolveStoreTheme(undefined)).toBe("gold_cream");
  });
});
