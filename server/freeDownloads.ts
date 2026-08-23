import type { Express, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { marketplaceListings, productAssets } from "../drizzle/schema";
import { getDb } from "./db";
import { storageGetSignedUrl } from "./storage";

function safeAttachmentName(filename: string) {
  return filename.replace(/[\r\n"\\]/g, "_").slice(0, 180) || "ehode-download";
}

export function registerFreeDownloadRoutes(app: Express) {
  app.get("/api/download/free/:listingId/:assetId", async (req: Request, res: Response) => {
    const listingId = Number(req.params.listingId);
    const assetId = Number(req.params.assetId);
    if (!Number.isInteger(listingId) || listingId <= 0 || !Number.isInteger(assetId) || assetId <= 0) {
      return res.status(404).send("File not found.");
    }

    try {
      const db = await getDb();
      if (!db) return res.status(503).send("Downloads are temporarily unavailable.");
      const rows = await db.select({
        listingId: marketplaceListings.id,
        priceAmount: marketplaceListings.priceAmount,
        listingStatus: marketplaceListings.status,
        storageKey: productAssets.storageKey,
        originalFilename: productAssets.originalFilename,
        mimeType: productAssets.mimeType,
      }).from(productAssets)
        .innerJoin(marketplaceListings, eq(productAssets.listingId, marketplaceListings.id))
        .where(and(eq(marketplaceListings.id, listingId), eq(productAssets.id, assetId)))
        .limit(1);

      const file = rows[0];
      if (!file || file.listingStatus !== "published" || Number(file.priceAmount) !== 0) {
        return res.status(404).send("File not found.");
      }

      const signedUrl = await storageGetSignedUrl(file.storageKey);
      const upstream = await fetch(signedUrl);
      if (!upstream.ok) return res.status(502).send("The download file is temporarily unavailable.");
      const bytes = Buffer.from(await upstream.arrayBuffer());
      const filename = safeAttachmentName(file.originalFilename);
      res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
      res.setHeader("Content-Length", String(bytes.length));
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.status(200).send(bytes);
    } catch (error) {
      console.error("[Free download] Failed to serve attachment", error);
      return res.status(500).send("The download could not be prepared.");
    }
  });
}
