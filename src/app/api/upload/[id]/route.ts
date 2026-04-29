import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { deleteFileFromDrive } from "@/lib/google-drive";

/**
 * DELETE /api/upload/[id]
 * Delete an upload from both Google Drive and the uploads table
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: upload, error: fetchError } = await supabaseAdmin
      .from("uploads")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !upload) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    // Delete from Google Drive (drive_file_id is the Drive file ID).
    // If the file is already gone, continue with DB delete.
    try {
      await deleteFileFromDrive(upload.drive_file_id);
    } catch (driveErr) {
      console.error("Drive deletion error (continuing):", driveErr);
    }

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
