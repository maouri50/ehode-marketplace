import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
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
    try {
      const response = await handleUploadPresigned({
        body: req.body as HandleUploadPresignedBody,
        request: req,
        getSignedToken: async (pathname, clientPayload) => {
          const payload = parseUploadPayload(clientPayload);
          const prefix = payload.kind === "cover" ? `product-covers/${payload.listingId}/` : `product-files/${payload.listingId}/`;
          if (!pathname.startsWith(prefix) || pathname.slice(prefix.length).includes("/") || pathname.includes("..")) throw new Error("Invalid upload destination.");

          const maximumSizeInBytes = payload.kind === "cover" ? MAX_COVER_BYTES : MAX_RESOURCE_BYTES;
          if (payload.size > maximumSizeInBytes) throw new Error(payload.kind === "cover" ? "Cover images must be under 12 MB." : "Resource files exceed the storage provider's 5 TB per-file limit.");
          const allowedContentTypes = payload.kind === "cover" ? ["image/png", "image/jpeg", "image/webp", "image/gif"] : ["*/*"];
          if (payload.kind === "cover" && !/^image\/(png|jpeg|webp|gif)$/.test(payload.mimeType)) throw new Error("Use a PNG, JPG, WEBP, or GIF cover image.");

          const token = await issueSignedToken({
            pathname,
            operations: ["put"],
            allowedContentTypes,
            maximumSizeInBytes,
            validUntil: Date.now() + 15 * 60 * 1000,
          });
          return {
            token,
            urlOptions: {
              allowedContentTypes,
              maximumSizeInBytes,
              validUntil: Date.now() + 15 * 60 * 1000,
              addRandomSuffix: false,
              allowOverwrite: false,
            },
          };
        },
      });
      return res.status(200).json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not prepare secure file upload.";
      console.error("[Direct upload] Failed to issue presigned URL", error);
      return res.status(message.includes("Admin sign-in") ? 401 : 400).json({ error: message });
    }
  });
}

function parseUploadPayload(value: string | null) {
  let parsed: unknown;
  try { parsed = JSON.parse(value ?? ""); } catch { throw new Error("Invalid upload request."); }
  const payload = parsed as { listingId?: unknown; kind?: unknown; mimeType?: unknown; size?: unknown };
  if (!Number.isInteger(payload.listingId) || (payload.listingId as number) <= 0 || (payload.kind !== "file" && payload.kind !== "cover") || typeof payload.mimeType !== "string" || !Number.isFinite(payload.size) || (payload.size as number) <= 0) throw new Error("Invalid upload request.");
  return { listingId: payload.listingId as number, kind: payload.kind, mimeType: payload.mimeType, size: payload.size as number } as { listingId: number; kind: "file" | "cover"; mimeType: string; size: number };
}
