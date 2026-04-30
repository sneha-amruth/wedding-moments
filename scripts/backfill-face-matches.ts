/**
 * One-time backfill: run face recognition on every existing photo upload
 * that hasn't been processed yet, and write rows into photo_matches.
 *
 * Run with:
 *   node --env-file=.env.local --experimental-strip-types scripts/backfill-face-matches.ts
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION,
 * REKOGNITION_COLLECTION_ID, GOOGLE_OAUTH_CLIENT_ID,
 * GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN.
 */

import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import {
  RekognitionClient,
  DetectFacesCommand,
  SearchFacesByImageCommand,
  CreateCollectionCommand,
  ResourceAlreadyExistsException,
  type BoundingBox,
} from "@aws-sdk/client-rekognition";
import sharp from "sharp";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "REKOGNITION_COLLECTION_ID",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REFRESH_TOKEN",
];
for (const k of required) {
  if (!process.env[k]) {
    console.error(`Missing env var: ${k}`);
    process.exit(1);
  }
}

const COLLECTION_ID = process.env.REKOGNITION_COLLECTION_ID!;
const SIMILARITY_THRESHOLD = 85;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const rek = new RekognitionClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const oauth2 = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET
);
oauth2.setCredentials({
  refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
});
const drive = google.drive({ version: "v3", auth: oauth2 });

async function ensureCollection() {
  try {
    await rek.send(new CreateCollectionCommand({ CollectionId: COLLECTION_ID }));
  } catch (e) {
    if (!(e instanceof ResourceAlreadyExistsException)) throw e;
  }
}

async function getDriveBytes(fileId: string): Promise<Buffer> {
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer);
}

async function cropFace(
  bytes: Buffer,
  bbox: BoundingBox,
  w: number,
  h: number
): Promise<Buffer> {
  const m = 0.15;
  const bx = Math.max(0, (bbox.Left ?? 0) - (bbox.Width ?? 0) * m);
  const by = Math.max(0, (bbox.Top ?? 0) - (bbox.Height ?? 0) * m);
  const bw = Math.min(1 - bx, (bbox.Width ?? 0) * (1 + m * 2));
  const bh = Math.min(1 - by, (bbox.Height ?? 0) * (1 + m * 2));
  return sharp(bytes)
    .extract({
      left: Math.floor(bx * w),
      top: Math.floor(by * h),
      width: Math.max(1, Math.floor(bw * w)),
      height: Math.max(1, Math.floor(bh * h)),
    })
    .toBuffer();
}

interface Match {
  guestId: string;
  similarity: number;
}

async function findMatches(bytes: Buffer): Promise<Match[]> {
  const detect = await rek.send(
    new DetectFacesCommand({ Image: { Bytes: bytes }, Attributes: ["DEFAULT"] })
  );
  const faces = detect.FaceDetails ?? [];
  if (!faces.length) return [];

  const meta = await sharp(bytes).metadata();
  if (!meta.width || !meta.height) return [];

  const matches = new Map<string, number>();
  for (const f of faces) {
    if (!f.BoundingBox) continue;
    let crop: Buffer;
    try {
      crop = await cropFace(bytes, f.BoundingBox, meta.width, meta.height);
    } catch {
      continue;
    }
    try {
      const search = await rek.send(
        new SearchFacesByImageCommand({
          CollectionId: COLLECTION_ID,
          Image: { Bytes: crop },
          FaceMatchThreshold: SIMILARITY_THRESHOLD,
          MaxFaces: 1,
          QualityFilter: "AUTO",
        })
      );
      const top = search.FaceMatches?.[0];
      const guestId = top?.Face?.ExternalImageId;
      const similarity = top?.Similarity ?? 0;
      if (guestId && similarity >= SIMILARITY_THRESHOLD) {
        const prev = matches.get(guestId) ?? 0;
        if (similarity > prev) matches.set(guestId, similarity);
      }
    } catch {
      // no face / no match — skip
    }
  }
  return Array.from(matches, ([guestId, similarity]) => ({ guestId, similarity }));
}

async function main() {
  await ensureCollection();

  console.log("Fetching unprocessed photos...");
  const { data, error } = await supabase
    .from("uploads")
    .select("id, drive_file_id, file_type, face_processed_at")
    .eq("file_type", "photo")
    .is("face_processed_at", null);

  if (error) {
    console.error("Failed to fetch:", error.message);
    process.exit(1);
  }

  const rows = data ?? [];
  console.log(`Found ${rows.length} photos to process.\n`);

  let ok = 0,
    fail = 0;
  for (const row of rows) {
    const label = `[${row.id.slice(0, 8)}]`;
    try {
      const bytes = await getDriveBytes(row.drive_file_id);
      const matches = await findMatches(bytes);

      if (matches.length > 0) {
        const { error: insertErr } = await supabase.from("photo_matches").upsert(
          matches.map((m) => ({
            upload_id: row.id,
            guest_id: m.guestId,
            similarity: m.similarity,
          })),
          { onConflict: "upload_id,guest_id" }
        );
        if (insertErr) throw new Error(`insert: ${insertErr.message}`);
      }
      await supabase
        .from("uploads")
        .update({ face_processed_at: new Date().toISOString() })
        .eq("id", row.id);

      ok++;
      console.log(`✓ ${label} ${matches.length} match(es)`);
    } catch (e) {
      fail++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`✗ ${label} ${msg}`);
    }
  }

  console.log(`\nDone. Processed ${ok}, failed ${fail}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
