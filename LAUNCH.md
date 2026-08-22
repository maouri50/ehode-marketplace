# Ehode PayPal Launch Guide

## Current launch model

Ehode is now a **single-seller digital-products storefront**. Public customers can browse the imported catalog, search by category, open product pages, use a persistent basket, and pay through PayPal. The public experience does not use Shopify; the earlier Shopify setup remains outside the customer-facing app and is not required for the PayPal launch.

| Area | Current behavior |
|---|---|
| Catalog | The nine existing products from the source repository are in the database with their original title, description, price, category, and cover image. |
| Payments | A server-side PayPal OAuth flow creates and captures orders. Browser code never receives the PayPal secret. |
| Downloads | A successful capture creates an order record, line items, and random download tokens. Each buyer receives a receipt URL with only their purchase-linked download links. |
| Owner controls | The `/owner` page requires the project owner to sign in. It supports draft creation, detail updates, asset upload, and publication changes. |
| Marketplace future | Seller, shop, commission, review, order, and download tables already exist. Seller registration, public shop pages, commissions, reviews, and payouts remain disabled. |

## Before accepting a real payment

The imported product records had no digital files attached in the source catalog. This is intentional: the new shop displays them but prevents purchase until the owner attaches the final file. Sign in to `/owner`, attach the real PDF, ZIP, SVG, or other downloadable file to each product, then publish it. A product is not purchasable until it has at least one protected file.

The PayPal environment currently follows `PAYPAL_MODE`. Use `sandbox` while testing, with the matching sandbox Client ID and Secret. Make one sandbox purchase only after a product file is attached; confirm that the redirect opens `/downloads/<receipt-token>` and that its file link works. When the test succeeds, replace the credentials through the secure project settings with the matching live values and set `PAYPAL_MODE=live`.

> Never put `PAYPAL_SECRET`, `PAYPAL_CLIENT_ID`, or any access token into GitHub, a client-side file, or a public product description. Keep all payment secrets in secure environment settings only.

## Operating the owner workspace

The owner workspace at `/owner` is the operational center for this launch. Create a draft for a new product, enter its price and image URL, attach the exact customer download, and publish it only after reviewing the public product page. Existing catalog entries can also have their metadata edited and files attached.

| Step | Result |
|---|---|
| Create draft | Adds a database-backed listing that is not visible to customers. |
| Attach file | Stores the product file in protected storage and marks the listing ready for delivery. |
| Publish | Makes the listing visible and available for PayPal checkout. |
| Capture PayPal payment | Saves a paid order and produces unique download access grants. |
| Buyer download | Resolves a random access token to a time-limited signed storage URL. |

## Expansion path

The current model is intentionally narrow. Later, add seller onboarding and profile verification, allow a seller to create a shop, associate listings with that shop, enable commission rules, then introduce payouts and buyer reviews. The database relations already support that direction, so this can be introduced in stages without changing the core catalog or order history.
