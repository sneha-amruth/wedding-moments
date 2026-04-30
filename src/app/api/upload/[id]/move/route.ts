import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * PATCH /api/upload/[id]/move
 * Body: { event_id: string }
 * Move an upload to a different event (admin-only — used to fix
 * misuploads where a guest tagged a photo with the wrong event).
 *
 * Note: this only updates the DB row. The file in Google Drive stays
 * in its original {Event}/{Guest}/ folder; the couple can re-organize
 * Drive manually after the wedding using event_id as the source of truth.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { event_id } = await request.json();

    if (!event_id || typeof event_id !== "string") {
      return NextResponse.json(
        { error: "event_id (string) required" },
        { status: 400 }
      );
    }

    // Verify the event exists (and belongs to the same wedding)
    const { data: event, error: evErr } = await supabaseAdmin
      .from("events")
      .select("id, wedding_id")
      .eq("id", event_id)
      .single();
    if (evErr || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from("uploads")
      .update({ event_id })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Move upload error:", err);
    return NextResponse.json({ error: "Move failed" }, { status: 500 });
  }
}
