// Vercel executes this source file as native Node ESM. Import the bundled
// handler with its explicit extension so it does not need to resolve TypeScript
// server modules from outside the function bundle at runtime.
import app from "./handler.mjs";

export default app;
