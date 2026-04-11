import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/uploads?guestId=xxx&eventId=yyy
 * GET /api/uploads?eventId=yyy&all=true  (all uploads for an event)
 * GET /api/uploads?weddingId=xxx&all=true (all uploads for entire wedding)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get("guestId");
    const eventId = searchParams.get("eventId");
    const weddingId = searchParams.get("weddingId");
    const all = searchParams.get("all") === "true";

    if (all) {
      // Fetch all uploads for an event or entire wedding, with guest info
      let query = supabaseAdmin
        .from("uploads")
        .select("*, events(name), guests(name)")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false });

      if (eventId) {
        query = query.eq("event_id", eventId);
      } else if (weddingId) {
        query = query.eq("wedding_id", weddingId);
      } else {
        return NextResponse.json(
          { error: "eventId or weddingId required for all=true" },
          { status: 400 }
        );
      }

      const { data: uploads, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ uploads });
    }

    // Original: fetch uploads for a specific guest
    if (!guestId) {
      return NextResponse.json(
        { error: "guestId is required" },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
