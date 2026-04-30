/**
 * One-shot: re-categorize every existing photo to PelliKuthuru. Updates
 * the DB event_id AND moves the Drive file into PelliKuthuru/{Guest}/.
 *
 * Run with:
 *   node --env-file=.env.local --experimental-strip-types scripts/bulk-move-to-pellikuthuru.ts
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * NEXT_PUBLIC_WEDDING_ID, GOOGLE_OAUTH_CLIENT_ID,
 * GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN,
 * GOOGLE_DRIVE_ROOT_FOLDER_ID.
 */

import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_WEDDING_ID",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REFRESH_TOKEN",
  "GOOGLE_DRIVE_ROOT_FOLDER_ID",
];
for (const k of required) {
  if (!process.env[k]) {
    console.error(`Missing env var: ${k}`);
    process.exit(1);
  }
}

const TARGET_EVENT_NAME = "PelliKuthuru";
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;
const WEDDING_ID = process.env.NEXT_PUBLIC_WEDDING_ID!;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const oauth2 = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET
);
oauth2.setCredentials({
  refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
});
const drive = google.drive({ version: "v3", auth: oauth2 });

const folderCache = new Map<string, string>();
async function findOrCreateFolder(name: string, parentId: string): Promise<string> {
  const key = `${parentId}/${name}`;
  if (folderCache.has(key)) return folderCache.get(key)!;

  const safe = name.replace(/'/g, "\\'");
  const list = await drive.files.list({
    q: `name='${safe}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });
  if (list.data.files && list.data.files.length > 0) {
    folderCache.set(key, list.data.files[0].id!);
    return list.data.files[0].id!;
  }
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });
  folderCache.set(key, created.data.id!);
  return created.data.id!;
}

async function moveDriveFile(fileId: string, eventName: string, guestName: string) {
  const eventFolder = await findOrCreateFolder(eventName, ROOT_FOLDER_ID);
  const guestFolder = await findOrCreateFolder(guestName, eventFolder);

  const meta = await drive.files.get({ fileId, fields: "parents" });
  const currentParents = (meta.data.parents ?? []).join(",");

  await drive.files.update({
    fileId,
    addParents: guestFolder,
    removeParents: currentParents || undefined,
  });
}

async function main() {
  // 1. Find PelliKuthuru's id
  const { data: target, error: tErr } = await supabase
    .from("events")
    .select("id, name")
    .eq("wedding_id", WEDDING_ID)
    .eq("name", TARGET_EVENT_NAME)
    .single();
  if (tErr || !target) {
    console.error(`Could not find event named "${TARGET_EVENT_NAME}":`, tErr?.message);
    process.exit(1);
  }
  console.log(`Target event: ${target.name} (${target.id})`);

  // 2. Find all uploads NOT already in target event
  const { data: uploads, error: uErr } = await supabase
    .from("uploads")
    .select("id, drive_file_id, guest_id, event_id, events(name), guests(name)")
    .eq("wedding_id", WEDDING_ID)
    .neq("event_id", target.id);

  if (uErr) {
    console.error("Failed to fetch uploads:", uErr.message);
    process.exit(1);
  }
  const rows = uploads ?? [];
  console.log(`Found ${rows.length} uploads to move.\n`);

  if (rows.length === 0) return;

  // Show breakdown
  const byEvent = new Map<string, number>();
  for (const r of rows) {
    const ev = (r.events as unknown as { name: string } | null)?.name ?? "?";
    byEvent.set(ev, (byEvent.get(ev) ?? 0) + 1);
  }
  for (const [ev, count] of byEvent) {
    console.log(`  ${count} from ${ev}`);
  }

  // 3. Confirm
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`\nMove all ${rows.length} to ${target.name}? (yes/no) `);
  rl.close();
  if (answer.trim().toLowerCase() !== "yes") {
    console.log("Aborted.");
    return;
  }

  // 4. Run
  let ok = 0,
    fail = 0;
  for (const row of rows) {
    const guestName =
      (row.guests as unknown as { name: string } | null)?.name ?? "Unknown";
    const label = `[${row.id.slice(0, 8)}] ${guestName}`;
    try {
      await moveDriveFile(row.drive_file_id, target.name, guestName);
      const { error: updateErr } = await supabase
        .from("uploads")
        .update({ event_id: target.id })
        .eq("id", row.id);
      if (updateErr) throw new Error(`db: ${updateErr.message}`);
      ok++;
      console.log(`✓ ${label}`);
    } catch (e) {
      fail++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`✗ ${label} — ${msg}`);
    }
  }

  console.log(`\nDone. Moved ${ok}, failed ${fail}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
