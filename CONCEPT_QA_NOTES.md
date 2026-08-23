# Homepage Concept QA Notes

## Initial visual check

Concept 01 was available at 2560 × 1440 and showed the intended quiet, premium editorial-stationery direction. Its navigation, hero, category row, and product cards were visually coherent, with no visible browser chrome, black scribbles, or third-party marketplace branding. Concepts 16–20 were still rendering at this check, so they have not been reviewed or delivered yet.

## Selected Optimistic Orange implementation check

The implemented homepage was checked at desktop (1440 × 1000) and phone (390 × 844) viewports. Both show the selected bright orange, pink, cream, and sky-blue direction with a bold modular hero, category controls, real product cards, catalog search, and the existing mobile basket navigation. No visual clipping or unusable control was observed in the checked layouts.

## Interactive storefront verification

On the desktop homepage, catalog search narrowed the collection from ten products to the single Sailboat result; the SVG category filter narrowed it to six matching items. A ready paid listing remained addable to the basket, and the basket opened with its line item, quantity controls, subtotal, and required receipt-email field. The available free resource also triggered a browser attachment download from the preview rather than opening inline. Mobile visual presentation was checked separately; the corresponding mobile basket action remains to be exercised before final verification is marked complete.

The mobile navigation basket control was then invoked directly in the browser and opened the same basket drawer with the existing item, quantity controls, subtotal, and receipt-email input. This confirms that the restyle preserved both the visible phone layout and the mobile cart-action handler; no checkout approval or payment was initiated.

The basket was reset to zero items and the ready Baby Stroller product was added again; after the handler completed, the basket exposed `Open basket with 1 item`. A new free-resource PDF entry also appeared at the top of browser download history immediately after a separate free-download action, confirming a fresh attachment download. Finally, the actual 390 × 844 phone viewport was captured with the fixed Home, Browse, Search, and Basket navigation visible and unobstructed.

An isolated Chromium session then applied an actual 390 × 844 mobile viewport and used the visible `.mobile-bottom-nav` Basket control. It was visible at that viewport, changed from `Open basket with 0 items`, and opened the cart drawer with a `Close basket` control. In the same phone-viewport run, the Free download control emitted a browser download event for `/api/download/free/30001/30001` with the suggested attachment filename `StudentDailyWeeklyAgendaCalendarEDITABLEGoogleSlidesTemplates20262027-1.pdf`. No payment approval or capture was initiated.

## Restored-identity listing-grid check

The Optimistic Orange treatment was removed from the rendered homepage. Desktop now uses the original Ehode neutral, serif-led visual identity with four larger image-led listing cards across the catalog. The 390 × 844 phone rendering keeps the same original colors and presents the listing cards in two columns with image-first hierarchy, product title, price, and action still visible.

The restored-color catalog filter was also exercised after the layout change. Selecting SVG Design Bundles reduced the result count from ten to six matching listing cards without affecting the larger image-first card treatment or the surrounding page structure.

Final interaction checks ran against the restored-identity version itself. Desktop search returned the single Sailboat result, and a ready listing updated the basket to `Open basket with 1 item`. At an actual 390 × 844 phone viewport, the final grid computed as two 168px columns with ten cards, the SVG filter reduced it to six cards, the visible mobile basket control opened the drawer, and the final free-download card emitted the expected `/api/download/free/30001/30001` attachment route.

## Portrait preview-frame check

The final catalog frame is now 8.5:11 portrait. Desktop and 390 × 844 phone screenshots confirm that the existing preview images are contained within that full portrait frame rather than cropped; future uploaded 8.5×11 preview sheets will fill the frames exactly.
