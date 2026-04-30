import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  uploadFileToDrive,
  getDriveThumbnailUrl,
} from "@/lib/google-drive";
import { findGuestsInPhoto } from "@/lib/rekognition";

/**
 * POST /api/upload
 * Upload a file to Google Drive and record it in the uploads table.
 * For photos, also runs face recognition and writes matches to photo_matches.
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

    const isVideo = file.type.startsWith("video/");
    const fileType = isVideo ? "video" : "photo";

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { fileId, webViewLink, thumbnailLink } = await uploadFileToDrive(
      buffer,
      file.name,
      file.type,
      eventName,
      guestName
    );

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
        drive_file_id: fileId,
        drive_view_url: webViewLink,
        thumbnail_url: thumbnailLink || getDriveThumbnailUrl(fileId),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Face matching (photos only). Failures are non-fatal — the upload
    // still succeeds; the photo just won't be tagged with anyone.
    if (!isVideo) {
      try {
        const matches = await findGuestsInPhoto(buffer);
        if (matches.length > 0) {
          await supabaseAdmin.from("photo_matches").insert(
            matches.map((m) => ({
              upload_id: upload.id,
              guest_id: m.guestId,
              similarity: m.similarity,
            }))
          );
        }
        await supabaseAdmin
          .from("uploads")
          .update({ face_processed_at: new Date().toISOString() })
          .eq("id", upload.id);
      } catch (faceErr) {
        console.error("Face match error (non-fatal):", faceErr);
      }
    }

    return NextResponse.json({ upload });
  } catch (err) {
    console.error("Upload error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
