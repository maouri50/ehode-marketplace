import { readFile } from "node:fs/promises";

const sourcePath = "/home/ubuntu/upload/BabyStroller.pdf";
const forgeUrl = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, "");
const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

if (!forgeUrl || !forgeKey) throw new Error("Project storage configuration is unavailable.");

const key = `product-files/5/BabyStroller-${Date.now()}.pdf`;
const presign = new URL("v1/storage/presign/put", `${forgeUrl}/`);
presign.searchParams.set("path", key);
const presignResponse = await fetch(presign, { headers: { Authorization: `Bearer ${forgeKey}` } });
if (!presignResponse.ok) throw new Error(`Storage presign failed (${presignResponse.status}).`);
const { url } = await presignResponse.json();
const file = await readFile(sourcePath);
const uploadResponse = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: file });
if (!uploadResponse.ok) throw new Error(`Storage upload failed (${uploadResponse.status}).`);
console.log(JSON.stringify({ key, originalFilename: "BabyStroller.pdf", mimeType: "application/pdf" }));
