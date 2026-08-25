import { describe, expect, it } from "vitest";
import { BASKET_DRAWER_CLOSE_LABEL, BASKET_DRAWER_HEADING } from "./cartDrawerHeader";

describe("basket drawer header copy", () => {
  it("keeps the compact buyer-facing basket heading and close label", () => {
    expect(BASKET_DRAWER_HEADING).toBe("Basket");
    expect(BASKET_DRAWER_CLOSE_LABEL).toBe("Close basket");
  });
});
