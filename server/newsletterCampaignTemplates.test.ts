import { describe, expect, it } from "vitest";
import { buildNewsletterCampaignEmail } from "./newsletterCampaign";

describe("newsletter campaign product templates", () => {
  it("renders only supplied real-product details with product links and no review claims", () => {
    const email = buildNewsletterCampaignEmail({
      body: "A short seasonal note.",
      canonicalOrigin: "https://www.ehode.com",
      templateType: "seasonal",
      seasonLabel: "Back-to-school",
      unsubscribeUrl: "https://www.ehode.com/newsletter/unsubscribe/token",
      products: [{ listingId: 7, handle: "teacher-planner", title: "Teacher Planner", priceAmount: "12.00", currencyCode: "USD", coverImageUrl: "/api/cover/7", sortOrder: 0 }],
    });

    expect(email.html).toContain("Fresh ideas for Back-to-school");
    expect(email.html).toContain("Teacher Planner");
    expect(email.html).toContain("https://www.ehode.com/products/teacher-planner");
    expect(email.html).toContain("https://www.ehode.com/api/cover/7");
    expect(email.html).not.toMatch(/review|rating|stars/i);
    expect(email.html).not.toContain("USD 12.00");
    expect(email.text).not.toContain("USD 12.00");
    expect(email.text).toContain("Explore all resources");
  });

  it("uses a product-showcase hero and a single Explore All call to action for latest resources", () => {
    const email = buildNewsletterCampaignEmail({
      body: "A short update.",
      canonicalOrigin: "https://www.ehode.com",
      templateType: "latest",
      unsubscribeUrl: "https://www.ehode.com/newsletter/unsubscribe/token",
      products: [{ listingId: 9, handle: "calm-week", title: "The Calm Week Planner", priceAmount: "12.00", currencyCode: "USD", coverImageUrl: "/api/cover/9", sortOrder: 0 }],
    });

    expect(email.html).toContain("Fresh ideas,<br/>sent your way.");
    expect(email.html).toContain("Our Latest Picks for You");
    expect(email.html).toContain("The Calm Week Planner");
    expect(email.html).toContain("Explore All");
    expect(email.html).not.toMatch(/review|rating|stars/i);
    expect(email.html).not.toContain("USD 12.00");
    expect(email.text).not.toContain("USD 12.00");
  });
});
