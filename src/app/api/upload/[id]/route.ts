import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "wedding-uploads";

/**
 * DELETE /api/upload/[id]
 * Delete an upload from both Supabase Storage and the uploads table
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the upload record
    const { data: upload, error: fetchError } = await supabaseAdmin
      .from("uploads")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !upload) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    // Delete from Supabase Storage (drive_file_id stores the storage path)
    try {
      await supabaseAdmin.storage.from(BUCKET).remove([upload.drive_file_id]);
    } catch (storageErr) {
      console.error("Storage deletion error (continuing):", storageErr);
    }

    // Delete from uploads table
    const { error: deleteError } = await supabaseAdmin
      .from("uploads")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
