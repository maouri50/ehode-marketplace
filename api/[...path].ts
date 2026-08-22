import { createEhodeHttpApp } from "../server/httpApp";

// Vercel maps every /api/* request to this Express handler.
export default createEhodeHttpApp();
