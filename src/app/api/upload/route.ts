import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { v4 as uuidv4 } from "uuid";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const BUCKET = "wedding-uploads";

/**
 * POST /api/upload
 * Upload a file to Supabase Storage and record it in the uploads table
 * FormData: file, weddingId, eventId, guestId, eventName, guestName
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    const weddingId = formData.get("weddingId") as string;
    const eventId = formData.get("eventId") as string;
    const guestId = formData.get("guestId") as string;
    const eventName = formData.get("eventName") as string;
    const guestName = formData.get("guestName") as string;

    if (
      !file ||
      !weddingId ||
      !eventId ||
      !guestId ||
      !eventName ||
      !guestName
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Determine file type
    const isVideo = file.type.startsWith("video/");
    const fileType = isVideo ? "video" : "photo";

    // Build storage path: eventName/guestName/uniqueId-filename
    const uniqueName = `${uuidv4()}-${file.name}`;
    const storagePath = `${eventName}/${guestName}/${uniqueName}`;

    // Convert File to Buffer for Supabase upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error: storageError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      console.error("Storage upload error:", storageError);
      return NextResponse.json(
        { error: storageError.message },
        { status: 500 }
      );
    }

    // Build public URLs
    const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;

    // Record in Supabase uploads table
    const { data: upload, error } = await supabaseAdmin
      .from("uploads")
      .insert({
        wedding_id: weddingId,
        event_id: eventId,
        guest_id: guestId,
        file_name: file.name,
        file_type: fileType,
        mime_type: file.type,
        file_size: file.size,
        drive_file_id: storagePath,
        drive_view_url: fileUrl,
        thumbnail_url: fileUrl,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ upload });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
