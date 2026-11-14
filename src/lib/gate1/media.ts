import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { Gate1Error } from "./service";
const run = promisify(execFile);
/** Inspect the actual uploaded bytes; never trust HTML video metadata. */
export async function inspectVideo(bytes: Buffer) {
  const dir = await mkdtemp(join(tmpdir(), "menta-gate1-"));
  try {
    const path = join(dir, "upload"); await writeFile(path, bytes);
    const { stdout } = await run(process.env.FFPROBE_PATH || "ffprobe", ["-v", "error", "-protocol_whitelist", "file,pipe", "-format_whitelist", "mov,matroska,webm",
      "-show_entries", "format=duration:stream=codec_type", "-of", "json", path], { timeout: 15000, maxBuffer: 256 * 1024 });
    const result = JSON.parse(stdout); const durationSec = Number(result.format?.duration);
    if (!result.streams?.some((s: { codec_type: string }) => s.codec_type === "video") || !Number.isFinite(durationSec) || durationSec <= 0) {
      throw new Gate1Error(422, "INVALID_VIDEO");
    }
    return { durationSec, sha256: createHash("sha256").update(bytes).digest("hex") };
  } catch (error) {
    if (error instanceof Gate1Error) throw error;
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Gate1Error(503, "VIDEO_INSPECTION_UNAVAILABLE");
    throw new Gate1Error(422, "INVALID_VIDEO");
  } finally { await rm(dir, { recursive: true, force: true }); }
}
