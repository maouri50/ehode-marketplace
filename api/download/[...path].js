import app from "../handler.mjs";

// Vercel needs this route at the download segment so both /free/:listing/:asset
// and /paid/:grantToken requests reach the shared Express download handlers.
export default app;
