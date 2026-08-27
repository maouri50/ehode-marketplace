import { afterEach, describe, expect, it, vi } from "vitest";
import { PRODUCT_PAGE_START_POSITION, scrollProductPageToStart } from "./productScroll";

describe("scrollProductPageToStart", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("moves a newly opened product page to its hero without smooth scrolling", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("window", { scrollTo });

    scrollProductPageToStart();

    expect(scrollTo).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenCalledWith(PRODUCT_PAGE_START_POSITION);
  });

  it("is safe while rendering outside a browser", () => {
    vi.stubGlobal("window", undefined);

    expect(() => scrollProductPageToStart()).not.toThrow();
  });
});
