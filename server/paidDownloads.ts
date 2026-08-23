import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { downloadGrants, productAssets } from "../drizzle/schema";
import { getDb } from "./db";
import { storageRead } from "./storage";

function safeAttachmentName(filename: string) {
  return filename.replace(/[\r\n"\\]/g, "_").slice(0, 180) || "ehode-download";
}

export function registerPaidDownloadRoutes(app: Express) {
  app.get("/api/download/paid/:token", async (req: Request, res: Response) => {
    const token = String(req.params.token ?? "");
    if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) return res.status(404).send("File not found.");

    try {
      const db = await getDb();
      if (!db) return res.status(503).send("Downloads are temporarily unavailable.");
      const rows = await db.select({ grant: downloadGrants, asset: productAssets })
        .from(downloadGrants)
        .innerJoin(productAssets, eq(downloadGrants.assetId, productAssets.id))
        .where(eq(downloadGrants.accessToken, token))
        .limit(1);
      const row = rows[0];
      if (!row || (row.grant.expiresAt && row.grant.expiresAt < new Date())) {
        return res.status(404).send("File not found.");
      }

      const stored = await storageRead(row.asset.storageKey);
      await db.update(downloadGrants)
        .set({ downloadCount: row.grant.downloadCount + 1 })
        .where(eq(downloadGrants.id, row.grant.id));

      const filename = safeAttachmentName(row.asset.originalFilename);
      res.set({
        "Content-Type": row.asset.mimeType || stored.contentType || "application/octet-stream",
        "Content-Length": String(stored.bytes.length),
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      });
      return res.status(200).send(stored.bytes);
    } catch (error) {
      console.error("[Paid download] Failed to serve attachment", error);
      return res.status(500).send("The download could not be prepared.");
    }
  });
}
