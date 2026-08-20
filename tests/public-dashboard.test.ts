import { describe, expect, it } from "vitest";
import { deriveFreshness, formatPublicDashboard } from "../worker/public-dashboard";

describe("public dashboard freshness", () => {
  it("يعيد unavailable عند غياب لقطة موثقة", () => {
    expect(formatPublicDashboard([])).toEqual({ data: null, freshness: "unavailable" });
  });

  it("يبقي آخر لقطة متاحة ويعلن stale عندما تفشل آخر عملية مصدر", () => {
    const row = { fetched_at: "2026-08-20T23:20:00.000Z", last_successful_at: "2026-08-20T23:20:00.000Z", last_status: "error" as const, final_24_sar: 500 };
    expect(formatPublicDashboard([row], new Date("2026-08-20T23:21:00.000Z").getTime())).toEqual({ data: row, freshness: "stale" });
  });

  it("يعيد fresh فقط للقطات الحديثة التي لم يفشل مصدرها", () => {
    expect(deriveFreshness({ fetched_at: "2026-08-20T23:20:00.000Z", last_successful_at: "2026-08-20T23:20:00.000Z", last_status: "ok" }, new Date("2026-08-20T23:23:00.000Z").getTime())).toBe("fresh");
  });

  it("يعيد stale للقطات الأقدم من نافذة freshness", () => {
    expect(deriveFreshness({ fetched_at: "2026-08-20T23:20:00.000Z", last_successful_at: "2026-08-20T23:20:00.000Z", last_status: "ok" }, new Date("2026-08-20T23:26:00.000Z").getTime())).toBe("stale");
  });

  it("لا يدعي freshness عندما لا يغطي آخر نجاح وقت اللقطة", () => {
    expect(deriveFreshness({ fetched_at: "2026-08-20T23:20:00.000Z", last_successful_at: "2026-08-20T23:19:00.000Z", last_status: "ok" }, new Date("2026-08-20T23:21:00.000Z").getTime())).toBe("stale");
  });
});
