import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { moveDriveFileToEventGuest } from "@/lib/google-drive";

export const maxDuration = 30;

/**
 * PATCH /api/upload/[id]/move
 * Body: { event_id: string }
 * Move an upload to a different event. Updates the DB row and also
 * moves the underlying Drive file into the new {Event}/{Guest}/ folder
 * so the Drive layout stays in sync with what guests see in the app.
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

    // Look up the upload + the new event + the guest in one round-trip
    const [{ data: upload, error: upErr }, { data: event, error: evErr }] =
      await Promise.all([
        supabaseAdmin
          .from("uploads")
          .select("id, drive_file_id, guest_id, event_id, guests(name)")
          .eq("id", id)
          .single(),
        supabaseAdmin
          .from("events")
          .select("id, name, wedding_id")
          .eq("id", event_id)
          .single(),
      ]);

    if (upErr || !upload) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }
    if (evErr || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Skip work if it's already there
    if (upload.event_id === event_id) {
      return NextResponse.json({ success: true, noop: true });
    }

    const guestName =
      (upload.guests as unknown as { name: string } | null)?.name ?? "Unknown";

    // Move the Drive file first; if that fails we don't want a stale DB
    // row pointing somewhere the file isn't.
    try {
      await moveDriveFileToEventGuest(
        upload.drive_file_id,
        event.name,
        guestName
      );
    } catch (driveErr) {
      console.error("Drive move failed:", driveErr);
      const message =
        driveErr instanceof Error ? driveErr.message : "Drive move failed";
      return NextResponse.json(
        { error: `Drive move failed: ${message}` },
        { status: 500 }
      );
    }

    const { error: updateErr } = await supabaseAdmin
      .from("uploads")
      .update({ event_id })
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Move upload error:", err);
    const message = err instanceof Error ? err.message : "Move failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
