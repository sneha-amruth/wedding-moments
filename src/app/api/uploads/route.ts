import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/uploads?guestId=xxx&eventId=yyy
 * Fetch uploads for a guest, optionally filtered by event
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get("guestId");
    const eventId = searchParams.get("eventId");

    if (!guestId) {
      return NextResponse.json({ error: "guestId is required" }, { status: 400 });
    }

    let query = supabaseAdmin
      .from("uploads")
      .select("*, events(name)")
      .eq("guest_id", guestId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false });

    if (eventId) {
      query = query.eq("event_id", eventId);
    }

    const { data: uploads, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ uploads });
  } catch (err) {
    console.error("Fetch uploads error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
