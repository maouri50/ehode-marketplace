import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { hasAdminSession } from "./adminAuth";

// Vercel Blob client uploads can support objects up to 5 TB. Resource uploads
// stream directly from the browser to Blob, so they never pass through the
// Vercel Function request-body limit that caused the prior 413 response.
const MAX_RESOURCE_BYTES = 5 * 1024 * 1024 * 1024 * 1024;
const MAX_COVER_BYTES = 12 * 1024 * 1024;

function safeFilename(name: string) {
  const base = name.split(/[\\/]/).pop() || "upload";
  const dotIndex = base.lastIndexOf(".");
  const rawStem = dotIndex > 0 ? base.slice(0, dotIndex) : base;
  const rawExtension = dotIndex > 0 ? base.slice(dotIndex) : "";
  const stem = rawStem.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "upload";
  const extension = rawExtension.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 20);
  return `${stem}${extension}`.slice(0, 180);
}

export function createUploadPath(listingId: number, kind: "file" | "cover", filename: string) {
  const folder = kind === "cover" ? "product-covers" : "product-files";
  return `${folder}/${listingId}/${crypto.randomUUID()}-${safeFilename(filename)}`;
}

export function registerDirectUploadRoutes(app: Express) {
  app.post("/api/blob-upload/token", async (req: Request, res: Response) => {
    if (!hasAdminSession(req as any)) return res.status(401).json({ error: "Admin sign-in is required." });
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return res.status(503).json({ error: "External file storage is not connected." });

    const { listingId, kind, filename, mimeType, size } = req.body ?? {};
    if (!Number.isInteger(listingId) || listingId <= 0 || (kind !== "file" && kind !== "cover") || typeof filename !== "string" || !filename.trim() || typeof mimeType !== "string" || !Number.isFinite(size) || size <= 0) {
      return res.status(400).json({ error: "Invalid upload request." });
    }
    if (kind === "cover" && !/^image\/(png|jpeg|webp|gif)$/.test(mimeType)) return res.status(400).json({ error: "Use a PNG, JPG, WEBP, or GIF cover image." });
    const maximumSizeInBytes = kind === "cover" ? MAX_COVER_BYTES : MAX_RESOURCE_BYTES;
    if (size > maximumSizeInBytes) return res.status(413).json({ error: kind === "cover" ? "Cover images must be under 12 MB." : "Resource files exceed the storage provider's 5 TB per-file limit." });

    try {
      const pathname = createUploadPath(listingId, kind, filename);
      const clientToken = await generateClientTokenFromReadWriteToken({
        token,
        pathname,
        maximumSizeInBytes,
        allowedContentTypes: kind === "cover" ? ["image/png", "image/jpeg", "image/webp", "image/gif"] : ["*/*"],
        validUntil: Date.now() + 15 * 60 * 1000,
        addRandomSuffix: false,
        allowOverwrite: false,
      });
      return res.status(200).json({ token: clientToken, pathname });
    } catch (error) {
      console.error("[Direct upload] Failed to issue client token", error);
      return res.status(500).json({ error: "Could not prepare secure file upload." });
    }
  });
}
