# Ehode on Vercel: external runtime requirements

The Vercel build can now serve the static Ehode storefront from `dist/public`, and the repository includes a catch-all `/api` entrypoint for the Express routes. This only prepares the application structure. The managed development database, managed file service, and their credentials are intentionally not exported with the GitHub source.

## Do not accept payments yet

Do **not** enable or test a live purchase on an external Vercel deployment until all items in the following table are complete. A static deployment without these services can render the store shell but cannot reliably list products, create paid orders, store buyer emails, issue protected downloads, or manage uploads.

| Required service | What to configure externally | Environment variables or work |
|---|---|---|
| MySQL-compatible database | Create a production MySQL/TiDB database, apply the Drizzle migrations in `drizzle/`, and load the required catalog data. | `DATABASE_URL` |
| Serverless API | The `api/[...path].ts` adapter routes `/api/*` requests into the Express/tRPC application. It still requires the database and the environment below. | Deploy the committed adapter files. |
| File storage | Replace the managed Forge storage helper in `server/storage.ts` with Vercel Blob, Amazon S3, or an equivalent provider. Also migrate public covers and protected product files. | Provider-specific credentials; do not use the managed Forge keys outside the managed environment. |
| PayPal | Add the live client ID, secret, and mode after the database and storage flow are ready. | `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_MODE=live` |
| Admin protection | Use a long unique password and signing secret. | `ADMIN_PASSWORD`, `JWT_SECRET` |
| Public URL and SEO | Point the canonical origin to the live custom domain once it is connected. | `CANONICAL_ORIGIN=https://ehode.com`, `SITE_NAME=Ehode` |

## Safe external deployment sequence

1. Commit `vercel.json`, `api/[...path].ts`, `server/httpApp.ts`, and the updated `server/_core/index.ts`.
2. Confirm Vercel builds with `pnpm build` and serves `dist/public`.
3. Provision a database, apply migrations, and add `DATABASE_URL` only through Vercel's environment-variable interface.
4. Replace managed storage, migrate files, and verify direct free downloads plus protected paid downloads.
5. Add the PayPal and admin secrets in Vercel; never commit them to GitHub.
6. Perform a controlled non-capture checkout preflight, then make a real purchase only after product, order, email, and download verification.

## Current expected behavior

Without the external database and storage work above, Vercel may render the page frame but show an empty catalog, unavailable managed-file URLs, or missing API-backed behavior. This is expected and does not mean the Vite frontend build has failed.
