import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST /api/guest/register
 * Register a new guest after Firebase phone auth
 * Body: { weddingId, phone, name, firebaseUid, faceConsent }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { weddingId, phone, name, firebaseUid, faceConsent } = body;

    if (!weddingId || !phone || !name || !firebaseUid) {
      return NextResponse.json(
        {
          error: "Missing required fields: weddingId, phone, name, firebaseUid",
        },
        { status: 400 }
      );
    }

    // Check if guest already exists (same phone + wedding)
    const { data: existing } = await supabaseAdmin
      .from("guests")
      .select("*")
      .eq("wedding_id", weddingId)
      .eq("phone", phone)
      .single();

    if (existing) {
      const existingRecord = existing as Record<string, unknown>;
      // Update firebase_uid in case they re-authenticated on a new device
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("guests")
        .update({
          firebase_uid: firebaseUid,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRecord.id as string)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ guest: updated, isNew: false });
    }

    // Create new guest
    const { data: guest, error } = await supabaseAdmin
      .from("guests")
      .insert({
        wedding_id: weddingId,
        phone,
        name,
        firebase_uid: firebaseUid,
        face_consent: faceConsent ?? false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ guest, isNew: true });
  } catch (err) {
    console.error("Guest registration error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
