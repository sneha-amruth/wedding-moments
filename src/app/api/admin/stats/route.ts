import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/admin/stats
 * Return dashboard statistics
 */
export async function GET() {
  try {
    const weddingId = process.env.NEXT_PUBLIC_WEDDING_ID;

    // Fetch all data in parallel
    const [guestsRes, uploadsRes, eventsRes] = await Promise.all([
      supabaseAdmin.from("guests").select("id, name, phone, created_at").eq("wedding_id", weddingId!),
      supabaseAdmin.from("uploads").select("id, event_id, guest_id, file_name, file_type, file_size, drive_view_url, thumbnail_url, created_at").eq("wedding_id", weddingId!).order("created_at", { ascending: false }),
      supabaseAdmin.from("events").select("id, name, sort_order").eq("wedding_id", weddingId!).order("sort_order"),
    ]);

    const guests = guestsRes.data || [];
    const uploads = uploadsRes.data || [];
    const events = eventsRes.data || [];

    // Calculate per-event stats
    const eventStats = events.map((event) => {
      const eventUploads = uploads.filter((u) => u.event_id === event.id);
      const uniqueGuests = new Set(eventUploads.map((u) => u.guest_id));
      return {
        ...event,
        uploadCount: eventUploads.length,
        guestCount: uniqueGuests.size,
      };
    });

    // Total storage used
    const totalSize = uploads.reduce((sum, u) => sum + (u.file_size || 0), 0);

    return NextResponse.json({
      totalGuests: guests.length,
      totalUploads: uploads.length,
      totalSize,
      guests,
      uploads,
      events: eventStats,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
