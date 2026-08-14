import { requireUser } from "@/lib/auth-guards";
import { ComingSoon } from "@/components/ComingSoon";

export default async function FilmPage() {
  await requireUser();
  return (
    <ComingSoon
      title="Film"
      phase="2"
      description="Upload film, review it in a player, and get AI-assisted breakdown. Any AI analysis will be labeled AI FILM ANALYSIS — BETA and will never claim to have analyzed footage it hasn't actually processed."
      requires={[
        "Object storage for video (e.g. Cloudflare R2 or S3) — not the database",
        "Upload pipeline with file-type/size validation and virus scanning",
        "A real computer-vision/video-analysis model or API to connect",
        "Film/FilmAnalysis data models with per-clip permissions",
      ]}
    />
  );
}
