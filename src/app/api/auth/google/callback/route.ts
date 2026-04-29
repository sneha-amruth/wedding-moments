import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/google-drive";

/**
 * GET /api/auth/google/callback
 * Receives the auth code from Google, exchanges it for tokens, and
 * displays the refresh token once so it can be copied into Vercel env vars.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return new NextResponse(htmlPage(`Authorization failed: ${error}`), {
      headers: { "content-type": "text/html; charset=utf-8" },
      status: 400,
    });
  }

  if (!code) {
    return new NextResponse(htmlPage("Missing authorization code."), {
      headers: { "content-type": "text/html; charset=utf-8" },
      status: 400,
    });
  }

  try {
    const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`;
    const oauth2 = getOAuthClient(redirectUri);
    const { tokens } = await oauth2.getToken(code);

    if (!tokens.refresh_token) {
      return new NextResponse(
        htmlPage(
          "No refresh_token returned. Revoke this app's access at https://myaccount.google.com/permissions and try again — Google only issues a refresh token on the first consent."
        ),
        {
          headers: { "content-type": "text/html; charset=utf-8" },
          status: 400,
        }
      );
    }

    return new NextResponse(successPage(tokens.refresh_token), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token exchange failed";
    return new NextResponse(htmlPage(`Error: ${message}`), {
      headers: { "content-type": "text/html; charset=utf-8" },
      status: 500,
    });
  }
}

function htmlPage(body: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Google OAuth</title>
<style>body{font-family:system-ui;max-width:680px;margin:60px auto;padding:0 20px;color:#111}</style>
</head><body><p>${body}</p></body></html>`;
}

function successPage(refreshToken: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Google OAuth — Success</title>
<style>
  body{font-family:system-ui;max-width:680px;margin:60px auto;padding:0 20px;color:#111}
  code{background:#f4f4f4;padding:12px;display:block;word-break:break-all;border-radius:8px;font-size:13px}
  .warn{background:#fff3cd;padding:12px;border-radius:8px;margin:16px 0}
</style>
</head><body>
<h1>Got it.</h1>
<p>Copy this refresh token and set it on Vercel as <strong>GOOGLE_OAUTH_REFRESH_TOKEN</strong>:</p>
<code>${escapeHtml(refreshToken)}</code>
<div class="warn"><strong>Show this only once.</strong> Don't commit it. Don't share it. After you've saved it on Vercel, redeploy and uploads will start going to Google Drive.</div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
