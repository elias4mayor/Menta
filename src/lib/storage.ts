import "server-only";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";

/**
 * File storage abstraction. Only a local-filesystem provider is implemented
 * right now — real deployments need an object store (Cloudflare R2, AWS S3,
 * or similar) instead, since large video files don't belong on an app
 * server's disk or in the database. This exists so the rest of the Film
 * feature (upload, streaming, permissions) can be built and actually work
 * today, and swapped to a real object-store provider later behind this same
 * interface — see README for exactly what that swap needs.
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

function resolveKeyPath(key: string): string {
  const resolved = path.resolve(STORAGE_ROOT, key);
  if (resolved !== STORAGE_ROOT && !resolved.startsWith(STORAGE_ROOT + path.sep)) {
    throw new Error("Invalid storage key.");
  }
  return resolved;
}

export async function saveFile(key: string, data: Buffer): Promise<void> {
  const filePath = resolveKeyPath(key);
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, data);
}

export async function deleteFile(key: string): Promise<void> {
  const filePath = resolveKeyPath(key);
  await fsp.rm(filePath, { force: true });
}

/** Reads a whole file into memory — for small files (avatars, documents) where range/seek support isn't needed. */
export async function readFile(key: string): Promise<Buffer> {
  const filePath = resolveKeyPath(key);
  return fsp.readFile(filePath);
}

export type ByteRange = { start: number; end: number };

/** Opens a read stream for the file, optionally for a byte range (HTTP Range requests / video seeking). */
export function readFileRange(
  key: string,
  totalSize: number,
  range?: ByteRange
): { stream: fs.ReadStream; start: number; end: number } {
  const filePath = resolveKeyPath(key);
  const start = range?.start ?? 0;
  const end = range?.end ?? totalSize - 1;
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

export function isVideoStorageConfigured(): boolean {
  // Local filesystem storage always "works" in dev, but isn't durable across
  // redeploys/containers — treat it as configured only outside production
  // unless an object-store integration is added.
  return process.env.NODE_ENV !== "production" || Boolean(process.env.FILM_STORAGE_READY);
}
