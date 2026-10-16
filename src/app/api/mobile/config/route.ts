import { NextResponse } from "next/server";
import { isOAuthConfigured } from "@/lib/oauth";
export async function GET() {
  return NextResponse.json({ providers: { apple: isOAuthConfigured("apple"), google: isOAuthConfigured("google") } }, {
    headers: { "Cache-Control": "no-store" },
  });
}
