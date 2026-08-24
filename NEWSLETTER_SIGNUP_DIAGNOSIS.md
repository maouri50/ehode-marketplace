# Newsletter Signup Diagnosis

## Observed behavior

The public phone signup form shows a generic invalid-email message for a syntactically valid address. The current campaign screen can therefore continue to show zero active subscribers even though the address itself is valid.

## Confirmed findings

The project database contains the `newsletterSubscriptions` table with the expected `unsubscribeToken` column, and it currently has one active subscription record. The public `storefront.newsletter.subscribe` mutation writes to this same table and has no queue or automatic email delivery step.

The latest Vercel preview returns HTTP 500 for the subscription mutation. The generic client-side error text is therefore misleading and must be replaced by a specific, safe server response once the Vercel-side persistence error is identified. No campaign was sent while diagnosing this issue.

The same `POST /api/trpc/storefront.newsletter.subscribe` HTTP 500 occurs on both `https://www.ehode.com/` and the release-branch Vercel preview. The Vercel diagnostic log confirms that the query against `newsletterSubscriptions` fails even though the project database has the expected table. The Vercel deployment therefore connects to an older database schema. Commit `3d6933e` adds an idempotent, additive recovery for the subscription table and its required unsubscribe-token column; it runs only after that specific missing-schema error and then retries the public signup.
