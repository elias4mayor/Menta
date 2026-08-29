import { NextResponse } from "next/server";
import { partnershipInquiryInputSchema } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

/**
 * The homepage's Team/Organization "Contact us" CTA. Public — no session
 * required, since this is a pre-signup sales inquiry, not an in-app
 * action. Reuses sendEmail's existing honest degraded state: with no
 * RESEND_API_KEY, the inquiry is logged to the server console instead of
 * lost, same as every other transactional email in this app.
 */
export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "partnerships-inquiry"), {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Slow down a little — try again in a few minutes." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = partnershipInquiryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const { name, email, organization, message } = parsed.data;
  const to = process.env.PARTNERSHIPS_EMAIL || "partnerships@menta.app";

  await sendEmail({
    to,
    subject: `MENTA partnership inquiry: ${organization}`,
    text: [
      `Name: ${name}`,
      `Email: ${email}`,
      `Organization: ${organization}`,
      "",
      message || "(no message)",
    ].join("\n"),
  });

  return NextResponse.json({ ok: true });
}
