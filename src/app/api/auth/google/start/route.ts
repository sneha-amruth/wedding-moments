import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient, DRIVE_SCOPES } from "@/lib/google-drive";

/**
 * GET /api/auth/google/start
 * Kicks off the one-time OAuth consent flow to obtain a refresh token
 * for the couple's Google account. The callback will display the token
 * once for copying into Vercel env vars.
 */
export async function GET(request: NextRequest) {
  try {
    const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`;
    const oauth2 = getOAuthClient(redirectUri);

    const url = oauth2.generateAuthUrl({
      access_type: "offline",
      prompt: "consent", // forces refresh_token even on re-consent
      scope: DRIVE_SCOPES,
    });

    return NextResponse.redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth start failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
