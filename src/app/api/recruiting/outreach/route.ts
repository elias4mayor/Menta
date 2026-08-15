import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { recruitingOutreachSchema } from "@/lib/validation";
import { draftRecruitingOutreach, isAiConfigured } from "@/lib/ai";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const limited = rateLimit(clientKey(request, `recruiting-outreach:${user.id}`), {
    limit: 15,
    windowMs: 5 * 60 * 1000,
  });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Slow down a little — try again in a few minutes." }, { status: 429 });
  }

  const parsed = recruitingOutreachSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const school = await prisma.recruitingSchool.findFirst({
    where: { id: parsed.data.schoolId, userId: user.id },
  });
  if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

  let contact = null;
  if (parsed.data.contactId) {
    contact = await prisma.recruitingContact.findFirst({
      where: { id: parsed.data.contactId, userId: user.id, schoolId: school.id },
    });
    if (!contact) return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }

  if (!isAiConfigured()) {
    return NextResponse.json({
      configured: false,
      draft: null,
      error:
        "MENTA AI isn't connected yet — an administrator needs to set ANTHROPIC_API_KEY on the server. No draft was generated.",
    });
  }

  try {
    const draft = await draftRecruitingOutreach(user, {
      purpose: parsed.data.purpose,
      school: { name: school.name, division: school.division, location: school.location },
      contact: contact ? { name: contact.name, title: contact.title } : null,
    });

    const activity = await prisma.recruitingActivity.create({
      data: {
        userId: user.id,
        schoolId: school.id,
        contactId: contact?.id,
        type: "EMAIL_DRAFT",
        subject: `Draft outreach: ${school.name}${contact ? ` — ${contact.name}` : ""}`,
        body: draft,
        isDraft: true,
      },
      include: { school: true, contact: true },
    });

    await logAudit({
      actorId: user.id,
      action: "recruiting.outreach_drafted",
      targetType: "RecruitingActivity",
      targetId: activity.id,
    });

    return NextResponse.json({ configured: true, draft, activity });
  } catch (err) {
    console.error("[recruiting-outreach] request failed", err);
    return NextResponse.json(
      { error: "MENTA AI couldn't draft this right now. Try again shortly." },
      { status: 502 }
    );
  }
}
