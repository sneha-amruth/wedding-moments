import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/events?weddingId=xxx
 * Fetch all events for a wedding
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weddingId = searchParams.get("weddingId");

    if (!weddingId) {
      return NextResponse.json({ error: "weddingId is required" }, { status: 400 });
    }

    const { data: events, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ events });
  } catch (err) {
    console.error("Fetch events error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
