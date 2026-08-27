# Private Download-Origin Alerts

## Scope

When Ehode successfully begins a protected paid or free file response, the application may include the visitor's IP address and its approximate country in the owner's private Telegram alert. This information must never be rendered in the storefront, returned by public APIs, or saved in the Ehode database.

## Data minimisation

Only the public IP supplied by the trusted hosting platform and the two-letter country code supplied by that platform are used. The alert must not include buyer email, name, account information, city, region, postal code, GPS-like coordinates, or the protected download token. Location is approximate and can be inaccurate when a visitor uses a proxy or VPN.

## Hosting source

On Vercel, `x-forwarded-for` supplies the client public IP and `x-vercel-ip-country` supplies the two-letter country associated with that IP. The code must treat both values as optional so local development and other runtimes remain safe.

## Public notice

The privacy page must state that Ehode processes technical download data, including IP address and approximate country, to operate and protect download delivery, and that this information is sent only in a private owner alert rather than persisted by the application.

## References

1. [Vercel request headers](https://vercel.com/docs/headers/request-headers)
2. [Vercel geo-IP headers guide](https://vercel.com/kb/guide/geo-ip-headers-geolocation-vercel-functions)
