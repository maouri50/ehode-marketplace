import { createEhodeHttpApp } from "../server/httpApp";

// This entry is bundled during `pnpm build`. The resulting single-file handler
// prevents Vercel from resolving server modules outside the API function bundle.
export default createEhodeHttpApp();
