import { google, type drive_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";

// Scope: only files this app creates — cannot see other Drive contents
export const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file"];

export const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "";

export function getOAuthClient(redirectUri?: string): OAuth2Client {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Google OAuth not configured — missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET"
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function getDriveClient(): drive_v3.Drive {
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error(
      "Google Drive not configured — missing GOOGLE_OAUTH_REFRESH_TOKEN. Visit /api/auth/google/start to obtain one."
    );
  }
  const auth = getOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth });
}

/**
 * Find or create a folder inside a parent folder
 */
export async function findOrCreateFolder(
  name: string,
  parentId: string
): Promise<string> {
  const drive = getDriveClient();
  // Escape single quotes in the folder name for the query
  const safeName = name.replace(/'/g, "\\'");
  const response = await drive.files.list({
    q: `name='${safeName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  return folder.data.id!;
}

/**
 * Upload a file to Google Drive
 * Path: Root / {eventName} / {guestName} / filename
 */
export async function uploadFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  eventName: string,
  guestName: string
): Promise<{
  fileId: string;
  webViewLink: string;
  thumbnailLink: string | null;
}> {
  const drive = getDriveClient();
  const eventFolderId = await findOrCreateFolder(eventName, ROOT_FOLDER_ID);
  const guestFolderId = await findOrCreateFolder(guestName, eventFolderId);

  const { Readable } = await import("stream");
  const readable = new Readable();
  readable.push(fileBuffer);
  readable.push(null);

  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [guestFolderId],
    },
    media: {
      mimeType,
      body: readable,
    },
    fields: "id, webViewLink, thumbnailLink",
  });

  // Make file viewable by anyone with the link (so guests can preview)
  await drive.permissions.create({
    fileId: file.data.id!,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return {
    fileId: file.data.id!,
    webViewLink: file.data.webViewLink || "",
    thumbnailLink: file.data.thumbnailLink || null,
  };
}

export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}

/**
 * Download the raw bytes of a Drive file (used for face recognition).
 */
export async function getDriveFileBytes(fileId: string): Promise<Buffer> {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer);
}

export function getDriveThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
}

export function getDriveViewUrl(fileId: string): string {
  return `https://drive.google.com/uc?id=${fileId}`;
}
