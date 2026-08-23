import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { marketplaceListings } from "../drizzle/schema";
import { getDb } from "./db";
import { storageRead } from "./storage";

export function registerCoverImageRoutes(app: Express) {
  app.get("/api/cover/:listingId", async (req: Request, res: Response) => {
    const listingId = Number(req.params.listingId);
    if (!Number.isInteger(listingId) || listingId <= 0) return res.status(404).send("Image not found.");

    try {
      const db = await getDb();
      if (!db) return res.status(503).send("Images are temporarily unavailable.");
      const rows = await db.select({ coverImageUrl: marketplaceListings.coverImageUrl })
        .from(marketplaceListings)
        .where(eq(marketplaceListings.id, listingId))
        .limit(1);
      const storageKey = rows[0]?.coverImageUrl;
      if (!storageKey || !storageKey.startsWith("product-covers/")) return res.status(404).send("Image not found.");

      const stored = await storageRead(storageKey);
      res.setHeader("Content-Type", stored.contentType || "image/jpeg");
      res.setHeader("Content-Length", String(stored.bytes.length));
      res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.status(200).send(stored.bytes);
    } catch (error) {
      console.error("[Cover image] Failed to serve private cover", error);
      return res.status(500).send("The image could not be prepared.");
    }
  });
}
