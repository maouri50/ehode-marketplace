# Resend Sender Verification Status

The Resend sending subdomain has been registered as `mail.ehode.com` and is awaiting DNS verification. The Cloudflare DKIM TXT record at `resend._domainkey.mail` has been added with DNS-only status. The Cloudflare MX record at `send.mail` pointing to `feedback-smtp.eu-west-1.amazonses.com` with priority 10 has also been added with DNS-only status. The Cloudflare SPF TXT record at `send.mail` with `v=spf1 include:amazonses.com ~all` has also been added with DNS-only status.

The Ehode DNS zone is managed in Cloudflare, not Vercel. Add the records shown in Resend's domain-verification page with **DNS only** proxy status:

- DKIM: TXT at `resend._domainkey.mail` with the Resend-provided public-key content.
- SPF mail route: MX at `send.mail` pointing to the Resend-provided Amazon SES host, priority 10.
- SPF policy: TXT at `send.mail` with the Resend-provided SPF content.
- Optional: DMARC TXT at `_dmarc.mail` with `v=DMARC1; p=none;`.

On 2026-08-23, Resend verification was triggered after the DKIM, MX, and SPF records were added. The provider reports the domain as pending while DNS records propagate; sending must not be enabled until Resend reports the domain as verified.

The remaining public Resend records shown in the Resend dashboard are:

| Type | Name | Content | Priority |
| --- | --- | --- | --- |
| MX | `send.mail` | `feedback-smtp.eu-west-1.amazonses.com` | 10 |
| TXT | `send.mail` | `v=spf1 include:amazonses.com ~all` | N/A |

After Resend reports the domain as verified, configure Vercel:

- `RESEND_API_KEY` (sensitive)
- `RESEND_FROM_EMAIL` as `Ehode <downloads@mail.ehode.com>`

Never commit or place the API key in source files.
