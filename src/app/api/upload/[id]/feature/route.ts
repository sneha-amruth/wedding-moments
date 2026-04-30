import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * PATCH /api/upload/[id]/feature
 * Body: { is_featured: boolean }
 * Toggle whether an upload is shown to all guests in their My Photos feed.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { is_featured } = await request.json();

    if (typeof is_featured !== "boolean") {
      return NextResponse.json(
        { error: "is_featured (boolean) required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("uploads")
      .update({ is_featured })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Feature toggle error:", err);
    return NextResponse.json({ error: "Toggle failed" }, { status: 500 });
  }
}
