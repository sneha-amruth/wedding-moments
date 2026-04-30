import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { indexGuestFace, deleteFace } from "@/lib/rekognition";
import { scanPhotosForGuest } from "@/lib/scan-photos";

export const maxDuration = 60;

/**
 * POST /api/guest/register
 * Register a new guest after Firebase phone auth, optionally with a
 * selfie that we index for face-based photo matching.
 * Multipart form data: weddingId, phone, name, firebaseUid, faceConsent, selfie?
 * (also accepts JSON body without selfie for backwards compat)
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let weddingId: string | null;
    let phone: string | null;
    let name: string | null;
    let firebaseUid: string | null;
    let faceConsent = false;
    let selfieBytes: Buffer | null = null;

    if (contentType.includes("multipart/form-data")) {
      const fd = await request.formData();
      weddingId = fd.get("weddingId") as string | null;
      phone = fd.get("phone") as string | null;
      name = fd.get("name") as string | null;
      firebaseUid = fd.get("firebaseUid") as string | null;
      faceConsent = fd.get("faceConsent") === "true";
      const selfie = fd.get("selfie") as File | null;
      if (selfie && selfie.size > 0) {
        selfieBytes = Buffer.from(await selfie.arrayBuffer());
      }
    } else {
      const body = await request.json();
      ({ weddingId, phone, name, firebaseUid } = body);
      faceConsent = Boolean(body.faceConsent);
    }

    if (!weddingId || !phone || !name || !firebaseUid) {
      return NextResponse.json(
        {
          error: "Missing required fields: weddingId, phone, name, firebaseUid",
        },
        { status: 400 }
      );
    }

    // Look up existing guest by phone
    const { data: existing } = await supabaseAdmin
      .from("guests")
      .select("*")
      .eq("wedding_id", weddingId)
      .eq("phone", phone)
      .single();

    let guestId: string;
    let isNew = false;

    if (existing) {
      const existingRecord = existing as Record<string, unknown>;
      guestId = existingRecord.id as string;

      const { error: updateError } = await supabaseAdmin
        .from("guests")
        .update({
          firebase_uid: firebaseUid,
          face_consent: faceConsent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", guestId);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      // If a new selfie was provided and the guest had a previous one,
      // remove the old face from the collection before re-indexing.
      const oldFaceId = existingRecord.selfie_face_id as string | null;
      if (selfieBytes && oldFaceId) {
        try {
          await deleteFace(oldFaceId);
        } catch (e) {
          console.error("Failed to delete old face (continuing):", e);
        }
      }
    } else {
      const { data: created, error } = await supabaseAdmin
        .from("guests")
        .insert({
          wedding_id: weddingId,
          phone,
          name,
          firebase_uid: firebaseUid,
          face_consent: faceConsent,
        })
        .select("id")
        .single();

      if (error || !created) {
        return NextResponse.json(
          { error: error?.message ?? "Insert failed" },
          { status: 500 }
        );
      }
      guestId = created.id;
      isNew = true;
    }

    // Index selfie if provided + guest opted in.
    // After indexing, kick off a background scan of existing photos so the
    // guest sees themselves in pre-existing uploads without waiting on a
    // periodic backfill. waitUntil keeps the function alive after the
    // response is sent (subject to maxDuration).
    if (selfieBytes && faceConsent) {
      try {
        const faceId = await indexGuestFace(selfieBytes, guestId);
        if (faceId) {
          await supabaseAdmin
            .from("guests")
            .update({ selfie_face_id: faceId })
            .eq("id", guestId);
          waitUntil(
            scanPhotosForGuest(guestId).catch((e) =>
              console.error("Background scan failed:", e)
            )
          );
        }
      } catch (e) {
        console.error("Failed to index selfie (continuing):", e);
      }
    }

    const { data: guest } = await supabaseAdmin
      .from("guests")
      .select("*")
      .eq("id", guestId)
      .single();

    return NextResponse.json({ guest, isNew });
  } catch (err) {
    console.error("Guest registration error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
