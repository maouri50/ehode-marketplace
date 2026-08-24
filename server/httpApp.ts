import "dotenv/config";
import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { registerCoverImageRoutes } from "./coverImages";
import { registerFreeDownloadRoutes } from "./freeDownloads";
import { registerPaidDownloadRoutes } from "./paidDownloads";
import { registerDirectUploadRoutes } from "./directUploads";
import { registerInboundForwardingRoutes } from "./inboundForwarding";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { buildRobotsTxt, buildSitemapXml } from "./seo";

/**
 * Public API and application routes shared by the local Express server and
 * Vercel's /api catch-all function. Frontend static serving stays separate.
 */
export function createEhodeHttpApp(): Express {
  const app = express();

  registerInboundForwardingRoutes(app);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerCoverImageRoutes(app);
  registerFreeDownloadRoutes(app);
  registerPaidDownloadRoutes(app);
  registerDirectUploadRoutes(app);
  registerOAuthRoutes(app);
  app.get("/robots.txt", (_req, res) => res.type("text/plain").send(buildRobotsTxt()));
  app.get("/sitemap.xml", async (_req, res, next) => {
    try {
      res.type("application/xml").send(await buildSitemapXml());
    } catch (error) {
      next(error);
    }
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  return app;
}
