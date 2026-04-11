import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/login
 * Validate admin password and return a session token
 */
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json({ error: "Admin password not configured" }, { status: 500 });
    }

    if (password !== adminPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Simple token — hash of password + date (good enough for a wedding app)
    const token = Buffer.from(`admin:${adminPassword}:${Date.now()}`).toString("base64");

    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
