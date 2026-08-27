import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getSessionUser } from "@/lib/session";
import {
  buildClassroomAuthorizeUrl,
  isGoogleClassroomConfigured,
  CLASSROOM_STATE_COOKIE,
} from "@/lib/integrations/google-classroom";

function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", appUrl()));

  if (!isGoogleClassroomConfigured()) {
    return NextResponse.redirect(new URL("/school?classroom=not_configured", appUrl()));
  }

  const state = crypto.randomBytes(24).toString("hex");
  const store = await cookies();
  store.set(CLASSROOM_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(buildClassroomAuthorizeUrl(state));
}
