import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/uploads?guestId=xxx&eventId=yyy
 *   "My Photos" feed: photos uploaded by the guest UNION photos the guest
 *   is face-matched in UNION featured photos. Optionally filtered by event.
 *
 * GET /api/uploads?weddingId=xxx&all=true (or ?eventId=&all=true)
 *   Admin/global: every upload (used by admin dashboard).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get("guestId");
    const eventId = searchParams.get("eventId");
    const weddingId = searchParams.get("weddingId");
    const all = searchParams.get("all") === "true";

    if (all) {
      let query = supabaseAdmin
        .from("uploads")
        .select("*, events(name), guests(name)")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false });

      if (eventId) query = query.eq("event_id", eventId);
      else if (weddingId) query = query.eq("wedding_id", weddingId);
      else
        return NextResponse.json(
          { error: "eventId or weddingId required for all=true" },
          { status: 400 }
        );

      const { data: uploads, error } = await query;
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ uploads });
    }

    // Per-guest feed: own + face-matched + featured
    if (!guestId)
      return NextResponse.json(
        { error: "guestId is required" },
        { status: 400 }
      );

    // Fetch ids of photos the guest is matched in
    const { data: matches } = await supabaseAdmin
      .from("photo_matches")
      .select("upload_id")
      .eq("guest_id", guestId);
    const matchedIds = (matches ?? []).map((m) => m.upload_id);

    // Build the union: guest_id = me OR id IN matchedIds OR is_featured = true
    let query = supabaseAdmin
      .from("uploads")
      .select("*, events(name), guests(name)")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false });

    const orFilters = [`guest_id.eq.${guestId}`, `is_featured.eq.true`];
    if (matchedIds.length > 0) {
      orFilters.push(`id.in.(${matchedIds.join(",")})`);
    }
    query = query.or(orFilters.join(","));

    if (eventId) query = query.eq("event_id", eventId);

    const { data: uploads, error } = await query;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ uploads });
  } catch (err) {
    console.error("Fetch uploads error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
