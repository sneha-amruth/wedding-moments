import { supabaseAdmin } from "@/lib/supabase-admin";
import { getDriveFileBytes } from "@/lib/google-drive";
import { findGuestsInPhoto } from "@/lib/rekognition";

const SCAN_LIMIT = 30; // photos per invocation; bounded by Vercel timeout

interface ScanResult {
  scanned: number;
  matched: number;
  skipped: number;
  errors: number;
}

/**
 * Find all photos that have not yet been matched to this guest, run face
 * detection on each, and insert any matches found. Bounded so it can run
 * in a single Vercel function invocation (30 photos max).
 *
 * Note: this re-runs face detection on photos that may already have other
 * guests' matches — that's fine, photo_matches is upserted on
 * (upload_id, guest_id), so other guests' rows aren't disturbed.
 */
export async function scanPhotosForGuest(guestId: string): Promise<ScanResult> {
  const result: ScanResult = { scanned: 0, matched: 0, skipped: 0, errors: 0 };

  // Photo IDs already matched to this guest — we'll skip these.
  const { data: alreadyMatched } = await supabaseAdmin
    .from("photo_matches")
    .select("upload_id")
    .eq("guest_id", guestId);
  const matchedSet = new Set((alreadyMatched ?? []).map((m) => m.upload_id));

  // Candidate photos for this wedding (not the guest's own uploads — those
  // are already in their feed via guest_id).
  const { data: photos, error } = await supabaseAdmin
    .from("uploads")
    .select("id, drive_file_id, guest_id")
    .eq("file_type", "photo")
    .neq("guest_id", guestId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !photos) {
    console.error("scanPhotosForGuest fetch error:", error?.message);
    return result;
  }

  const todo = photos.filter((p) => !matchedSet.has(p.id)).slice(0, SCAN_LIMIT);
  result.skipped = photos.length - todo.length;

  for (const photo of todo) {
    result.scanned++;
    try {
      const bytes = await getDriveFileBytes(photo.drive_file_id);
      const matches = await findGuestsInPhoto(bytes);
      const mine = matches.find((m) => m.guestId === guestId);
      if (mine) {
        await supabaseAdmin.from("photo_matches").upsert(
          {
            upload_id: photo.id,
            guest_id: guestId,
            similarity: mine.similarity,
          },
          { onConflict: "upload_id,guest_id" }
        );
        result.matched++;
      }
    } catch (e) {
      result.errors++;
      console.error(`scanPhotosForGuest photo ${photo.id} error:`, e);
    }
  }

  return result;
}
