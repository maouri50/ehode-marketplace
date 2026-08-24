import { createEhodeHttpApp } from "../server/httpApp";

// This source is bundled into api/handler.mjs during build. Keeping it separate
// prevents esbuild from trying to overwrite the module imported by api/entry.ts.
export default createEhodeHttpApp();
