export type UploadKind = "file" | "cover";
export type UploadStage = "reading" | "uploading" | "success" | "error";

export type AdminUploadProgress = {
  listingId: number;
  kind: UploadKind;
  filename: string;
  stage: UploadStage;
  progress: number;
  detail?: string;
};

export function readingProgress(loaded: number, total: number) {
  if (!total) return 12;
  return Math.max(5, Math.min(60, Math.round((loaded / total) * 60)));
}

export function uploadProgressLabel(upload: AdminUploadProgress) {
  if (upload.stage === "reading") return `Preparing ${upload.kind === "cover" ? "cover" : "file"} · ${upload.progress}%`;
  if (upload.stage === "uploading") return `Uploading securely · ${upload.progress}%`;
  if (upload.stage === "success") return upload.kind === "cover" ? "Cover uploaded · 100%" : "File attached · 100%";
  return upload.detail ?? "Upload failed";
}
