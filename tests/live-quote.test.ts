import { describe, expect, it } from "vitest";
import { dashboardFromLiveQuote } from "../src/hooks/useDashboard";

describe("live quote adapter", () => {
  it("builds real SAR carat prices from the external XAU/USD quote", () => {
    const reply = dashboardFromLiveQuote({ price: 4138.3, sourceUpdatedAt: 1790652307000, fetchedAt: 1790652323375 }, 1790652330000);
    expect(reply?.status).toBe("ok");
    expect(reply?.freshness).toBe("fresh");
    expect(reply?.data?.xau_usd).toBe(4138.3);
    expect(Number(reply?.data?.final_24_sar)).toBeCloseTo(498.94, 1);
    expect(Number(reply?.data?.final_21_sar)).toBeCloseTo(436.57, 1);
    expect(Number(reply?.data?.final_18_sar)).toBeCloseTo(374.20, 1);
  });

  it("rejects an invalid quote rather than showing invented prices", () => {
    expect(dashboardFromLiveQuote({ price: "not-a-price" })).toBeNull();
  });
});
