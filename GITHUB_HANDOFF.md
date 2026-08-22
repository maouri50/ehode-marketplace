# Ehode GitHub Handoff

## Contents of this package

This archive contains the Ehode source code, database schema and migrations, client and server code, tests, and project documentation. It deliberately excludes local dependencies, build output, development logs, user-uploaded local files, and all secrets.

> Never commit a real `.env` file, PayPal secret, admin password, database URL, or any access token to GitHub. Use the host's encrypted environment-variable settings instead.

## Upload to GitHub

Create a **private** repository on GitHub. Extract the ZIP archive, open the extracted folder, and upload its contents to the new repository. If you use Git on your computer, the equivalent commands are:

```bash
git init
git add .
git commit -m "Initial Ehode storefront"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

The project uses pnpm. In a Node 22 environment, install dependencies with `pnpm install`, validate with `pnpm test`, and make a production build with `pnpm build`.

## Required production environment variables

Create the following names in the encrypted environment-variable settings of the host. Supply your own production values; do not place values in GitHub.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Production MySQL/TiDB-compatible database used by listings, orders, assets, and download grants. |
| `JWT_SECRET` | Server session signing secret. |
| `ADMIN_PASSWORD` | Password for the standalone `/admin` workspace. |
| `PAYPAL_CLIENT_ID` | PayPal **Live** client ID. |
| `PAYPAL_SECRET` | PayPal **Live** secret. |
| `PAYPAL_MODE` | Set to `live` for real payments. |
| `CANONICAL_ORIGIN` | Public HTTPS URL, for example `https://ehode.com`. |
| `SITE_NAME` | Public store name, currently `Ehode`. |

## Important hosting note

The current project uses managed database and file-storage helpers. GitHub stores the **code** only; it does not include the live database, uploaded product files, payment secrets, or managed storage configuration. The quickest path to a live site is to publish this current project using the **Publish** button in the project interface, which preserves those managed services.

If you deploy the repository to an external host such as Vercel, you must separately provision a compatible database and object storage, configure all variables above, and replace or configure the managed storage integration for that host. Test the full flow—including one completed payment and protected download—before directing real customers to the external deployment.

## After publication

Use `/admin` to create or edit a listing, attach its final product file, upload a cover image, and publish it. For paid products, verify the first PayPal Live sale produces a protected receipt and download link. For free products, attach a file and set its price to `0` so the public page offers a direct download.

Submit `https://ehode.com/sitemap.xml` to Google Search Console after the public domain points to the published site. The `SEO.md` file contains the exact steps.
