import { describe, expect, it } from "vitest";
import { CART_DRAWER_EXIT_DURATION_MS, CART_DRAWER_SIDE } from "./cartDrawerMotion";

describe("mobile Basket drawer motion", () => {
  it("uses the right edge and a short exit duration for an interruptible drawer transition", () => {
    expect(CART_DRAWER_SIDE).toBe("right");
    expect(CART_DRAWER_EXIT_DURATION_MS).toBeGreaterThanOrEqual(200);
    expect(CART_DRAWER_EXIT_DURATION_MS).toBeLessThanOrEqual(300);
  });
});
