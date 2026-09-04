import "server-only";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * File storage abstraction — Cloudflare R2 (S3-compatible) when configured,
 * local filesystem otherwise. R2 is selected automatically the moment its
 * four env vars (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/
 * R2_BUCKET_NAME) are all present — same "presence of real config picks
 * the real provider" pattern as AI_PROVIDER/RESEND_API_KEY/STRIPE_SECRET_KEY
 * elsewhere in this codebase, not a separate on/off flag to remember to
 * flip. The bucket is never made public and no presigned URLs are ever
 * generated — every read still goes through this app's own authenticated
 * API routes (films/[id]/video, documents/[id]/file, users/[id]/avatar),
 * exactly as it did with local disk; this file only changes *where the
 * bytes live*, never who's allowed to ask for them.
 *
 * Local disk remains for developer convenience only, and is refused
 * outright in production when R2 isn't configured — see
 * isUploadStorageConfigured() below and its callers in the three upload
 * routes. A production deploy without R2 configured must show an honest
 * "storage not configured" error, never silently accept an upload onto a
 * serverless filesystem that won't still have it on the next request.
 */

const STORAGE_ROOT = path.join(process.cwd(), "storage");

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/x-m4v",
] as const;

export const MAX_UPLOAD_BYTES = (Number(process.env.MAX_UPLOAD_MB) || 300) * 1024 * 1024;

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const MAX_DOCUMENT_UPLOAD_BYTES = (Number(process.env.MAX_DOCUMENT_UPLOAD_MB) || 20) * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;

export const MAX_AVATAR_UPLOAD_BYTES = (Number(process.env.MAX_AVATAR_UPLOAD_MB) || 8) * 1024 * 1024;

type R2Handle = { client: S3Client; bucket: string };

// Cached across invocations within one server process — re-reading env vars
// and constructing a new S3Client on every call would work but is wasteful;
// `undefined` means "not checked yet", `null` means "checked, not configured".
let cachedR2: R2Handle | null | undefined;

function r2Client(): R2Handle | null {
  if (cachedR2 !== undefined) return cachedR2;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    cachedR2 = null;
    return null;
  }

  cachedR2 = {
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
    bucket,
  };
  return cachedR2;
}

/** True once R2 is actually configured — never true just because we're in dev. */
export function isObjectStorageConfigured(): boolean {
  return r2Client() !== null;
}

/**
 * True when it's safe to accept an upload right now: real object storage
 * (R2) is configured, or we're outside production, where the local-disk
 * fallback below is fine for a developer's own machine. Every upload route
 * (films, documents, avatar) must check this before calling saveFile() —
 * see the "storage not configured" 503s in each POST handler.
 */
export function isUploadStorageConfigured(): boolean {
  return isObjectStorageConfigured() || process.env.NODE_ENV !== "production";
}

/** @deprecated Use isUploadStorageConfigured() — kept as an alias so any existing reference keeps working. */
export const isVideoStorageConfigured = isUploadStorageConfigured;

function resolveKeyPath(key: string): string {
  const resolved = path.resolve(STORAGE_ROOT, key);
  if (resolved !== STORAGE_ROOT && !resolved.startsWith(STORAGE_ROOT + path.sep)) {
    throw new Error("Invalid storage key.");
  }
  return resolved;
}

export async function saveFile(key: string, data: Buffer, contentType?: string): Promise<void> {
  const r2 = r2Client();
  if (r2) {
    await r2.client.send(
      new PutObjectCommand({ Bucket: r2.bucket, Key: key, Body: data, ContentType: contentType })
    );
    return;
  }
  const filePath = resolveKeyPath(key);
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, data);
}

export async function deleteFile(key: string): Promise<void> {
  const r2 = r2Client();
  if (r2) {
    await r2.client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: key }));
    return;
  }
  const filePath = resolveKeyPath(key);
  await fsp.rm(filePath, { force: true });
}

/** Reads a whole file into memory — for small files (avatars, documents) where range/seek support isn't needed. */
export async function readFile(key: string): Promise<Buffer> {
  const r2 = r2Client();
  if (r2) {
    const res = await r2.client.send(new GetObjectCommand({ Bucket: r2.bucket, Key: key }));
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }
  const filePath = resolveKeyPath(key);
  return fsp.readFile(filePath);
}

export type ByteRange = { start: number; end: number };

/**
 * Opens a read stream for the file, optionally for a byte range (HTTP Range
 * requests / video seeking). Async under R2 (a real network request), where
 * it was synchronous under local disk alone — both call sites already
 * `await` this the same way they await every other storage function.
 */
export async function readFileRange(
  key: string,
  totalSize: number,
  range?: ByteRange
): Promise<{ stream: Readable; start: number; end: number }> {
  const start = range?.start ?? 0;
  const end = range?.end ?? totalSize - 1;

  const r2 = r2Client();
  if (r2) {
    const res = await r2.client.send(
      new GetObjectCommand({ Bucket: r2.bucket, Key: key, Range: `bytes=${start}-${end}` })
    );
    return { stream: res.Body as Readable, start, end };
  }

  const filePath = resolveKeyPath(key);
  return { stream: fs.createReadStream(filePath, { start, end }), start, end };
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/x-matroska": "mkv",
  "video/x-m4v": "m4v",
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export function extensionForMimeType(mimeType: string): string {
  return EXTENSION_BY_MIME[mimeType] ?? "bin";
}
