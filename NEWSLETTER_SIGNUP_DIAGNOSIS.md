# Newsletter Signup Diagnosis

## Observed behavior

The public phone signup form shows a generic invalid-email message for a syntactically valid address. The current campaign screen can therefore continue to show zero active subscribers even though the address itself is valid.

## Confirmed findings

The project database contains the `newsletterSubscriptions` table with the expected `unsubscribeToken` column, and it currently has one active subscription record. The public `storefront.newsletter.subscribe` mutation writes to this same table and has no queue or automatic email delivery step.

The latest Vercel preview returns HTTP 500 for the subscription mutation. The generic client-side error text is therefore misleading and must be replaced by a specific, safe server response once the Vercel-side persistence error is identified. No campaign was sent while diagnosing this issue.
