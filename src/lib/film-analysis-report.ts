import { z } from "zod";

const unit = z.number().min(0).max(1);
const timeMs = z.number().int().min(0).max(86_400_000);
const key = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);

const box = z.strictObject({
  segment: z.enum(["BODY", "HEAD", "TORSO", "LEFT_ARM", "RIGHT_ARM", "LEFT_LEG", "RIGHT_LEG"]),
  x: unit,
  y: unit,
  width: unit.positive(),
  height: unit.positive(),
  confidence: unit,
}).refine(({ x, y, width, height }) => x + width <= 1 && y + height <= 1, {
  message: "Box must fit within the normalized source frame",
});

export const filmAnalysisReportSchema = z.strictObject({
  schemaVersion: z.literal(1),
  modelVersion: z.string().min(1).max(80),
  events: z.array(z.strictObject({
    startMs: timeMs,
    endMs: timeMs,
    frameMs: timeMs,
    marker: z.enum(["FALSE_STEP", "SHOULDER_SWAY", "PAD_LEVEL", "LEVERAGE"]),
    confidence: unit,
    coachingCueId: key.nullable(),
    boxes: z.array(box).max(7),
  }).refine(({ startMs, endMs, frameMs }) => startMs <= frameMs && frameMs <= endMs, {
    message: "Evidence frame must be inside the event window",
  })).max(100),
});

export type FilmAnalysisReport = z.infer<typeof filmAnalysisReportSchema>;
