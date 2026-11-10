import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { filmAnalysisReportSchema } from "@/lib/film-analysis-report";
import { recordFilmAnalysisResult } from "@/lib/film-analysis-results";

export const runtime = "nodejs";

const MAX_BYTES = 128 * 1024;

function equalSecret(a: string, b: string) {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const secret = process.env.FILM_ANALYSIS_WORKER_SECRET;
  if (!secret || secret.length < 32) return NextResponse.json({ error: "Not available." }, { status: 503 });
  if (!equalSecret(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { jobId } = await params;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(jobId)) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ error: "Report is required." }, { status: 400 });
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";
  let data: unknown;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) {
        await reader.cancel().catch(() => {});
        return NextResponse.json({ error: "Report is too large." }, { status: 413 });
      }
      body += decoder.decode(value, { stream: true });
    }
    data = JSON.parse(body + decoder.decode());
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  } finally {
    reader.releaseLock();
  }

  const report = filmAnalysisReportSchema.safeParse(data);
  if (!report.success) return NextResponse.json({ error: "Invalid report." }, { status: 422 });

  const result = await recordFilmAnalysisResult(jobId, report.data);
  if (result === "not-found") return NextResponse.json({ error: "Job not found." }, { status: 404 });
  if (result === "invalid-report") return NextResponse.json({ error: "Report falls outside the job scope." }, { status: 422 });
  return NextResponse.json({ status: result });
}
