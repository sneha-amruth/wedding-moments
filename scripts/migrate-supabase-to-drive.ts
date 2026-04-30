/**
 * One-time migration: move uploads from Supabase Storage to Google Drive.
 *
 * For every uploads row whose drive_view_url still points at Supabase, this:
 *   1. Downloads the file from Supabase Storage
 *   2. Re-uploads it to Drive under {EventName}/{GuestName}/
 *   3. Updates drive_file_id, drive_view_url, thumbnail_url in the DB
 *   4. Deletes the original from Supabase Storage
 *
 * Run with:
 *   node --env-file=.env.local --experimental-strip-types scripts/migrate-supabase-to-drive.ts
 *
 * Required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET,
 * GOOGLE_OAUTH_REFRESH_TOKEN, GOOGLE_DRIVE_ROOT_FOLDER_ID
 */

import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { Readable } from "stream";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "wedding-uploads";
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

const required = {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SUPABASE_KEY,
  GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  GOOGLE_OAUTH_REFRESH_TOKEN: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  GOOGLE_DRIVE_ROOT_FOLDER_ID: ROOT_FOLDER_ID,
};
for (const [k, v] of Object.entries(required)) {
  if (!v) {
    console.error(`Missing env var: ${k}`);
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const oauth2 = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET
);
oauth2.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
const drive = google.drive({ version: "v3", auth: oauth2 });

const folderCache = new Map<string, string>();
async function findOrCreateFolder(name: string, parentId: string): Promise<string> {
  const key = `${parentId}/${name}`;
  if (folderCache.has(key)) return folderCache.get(key)!;

  const safeName = name.replace(/'/g, "\\'");
  const list = await drive.files.list({
    q: `name='${safeName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });
  if (list.data.files && list.data.files.length > 0) {
    const id = list.data.files[0].id!;
    folderCache.set(key, id);
    return id;
  }
  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });
  folderCache.set(key, folder.data.id!);
  return folder.data.id!;
}

async function uploadToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  eventName: string,
  guestName: string
) {
  const eventFolderId = await findOrCreateFolder(eventName, ROOT_FOLDER_ID);
  const guestFolderId = await findOrCreateFolder(guestName, eventFolderId);

  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);

  const file = await drive.files.create({
    requestBody: { name: fileName, parents: [guestFolderId] },
    media: { mimeType, body: readable },
    fields: "id, webViewLink, thumbnailLink",
  });
  await drive.permissions.create({
    fileId: file.data.id!,
    requestBody: { role: "reader", type: "anyone" },
  });
  return {
    fileId: file.data.id!,
    webViewLink: file.data.webViewLink || "",
    thumbnailLink: file.data.thumbnailLink || null,
  };
}

interface UploadRow {
  id: string;
  file_name: string;
  mime_type: string;
  drive_file_id: string;
  drive_view_url: string;
  events: { name: string } | null;
  guests: { name: string } | null;
}

async function main() {
  console.log("Fetching uploads still on Supabase Storage...");
  const { data, error } = await supabase
    .from("uploads")
    .select("id, file_name, mime_type, drive_file_id, drive_view_url, events(name), guests(name)")
    .like("drive_view_url", "%supabase%");

  if (error) {
    console.error("Failed to fetch uploads:", error.message);
    process.exit(1);
  }

  const rows = (data ?? []) as unknown as UploadRow[];
  console.log(`Found ${rows.length} rows to migrate.\n`);
  if (rows.length === 0) return;

  let migrated = 0;
  let failed = 0;

  for (const row of rows) {
    const eventName = row.events?.name ?? "Unknown Event";
    const guestName = row.guests?.name ?? "Unknown Guest";
    const label = `[${row.id.slice(0, 8)}] ${eventName}/${guestName}/${row.file_name}`;

    try {
      const { data: blob, error: dlErr } = await supabase.storage
        .from(BUCKET)
        .download(row.drive_file_id);
      if (dlErr || !blob) throw new Error(`download: ${dlErr?.message ?? "no blob"}`);

      const buffer = Buffer.from(await blob.arrayBuffer());

      const { fileId, webViewLink, thumbnailLink } = await uploadToDrive(
        buffer,
        row.file_name,
        row.mime_type,
        eventName,
        guestName
      );

      const { error: updateErr } = await supabase
        .from("uploads")
        .update({
          drive_file_id: fileId,
          drive_view_url: webViewLink,
          thumbnail_url:
            thumbnailLink || `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
        })
        .eq("id", row.id);
      if (updateErr) throw new Error(`db update: ${updateErr.message}`);

      const oldPath = row.drive_file_id;
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove([oldPath]);
      if (rmErr) console.warn(`  (warn) failed to delete old object: ${rmErr.message}`);

      migrated++;
      console.log(`✓ ${label}`);
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`✗ ${label} — ${msg}`);
    }
  }

  console.log(`\nDone. Migrated ${migrated}, failed ${failed}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
