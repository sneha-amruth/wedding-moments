import { NextRequest, NextResponse } from "next/server";
import { scanPhotosForGuest } from "@/lib/scan-photos";
import { verifyAdminToken } from "@/lib/admin-auth";

export const maxDuration = 60;

/**
 * POST /api/guest/[id]/scan
 * Manually scan up to 30 unmatched photos against this guest's selfie.
 * Used for retroactive matching when a guest registers after photos have
 * already been uploaded (see also /api/guest/register, which triggers
 * this automatically).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "guest id required" }, { status: 400 });
  }

  try {
    const result = await scanPhotosForGuest(id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Guest scan error:", err);
    const message = err instanceof Error ? err.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
