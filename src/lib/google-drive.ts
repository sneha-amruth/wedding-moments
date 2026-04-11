import { google, type drive_v3 } from "googleapis";

// Google Drive service account authentication
// The service account must have access to the couple's Google Drive folder
function getAuthClient() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) return null;

  const credentials = JSON.parse(key);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
}

function getDriveClient(): drive_v3.Drive {
  const authClient = getAuthClient();
  if (!authClient) {
    throw new Error(
      "Google Drive not configured — missing GOOGLE_SERVICE_ACCOUNT_KEY"
    );
  }
  return google.drive({ version: "v3", auth: authClient });
}

// Root folder ID in the couple's Google Drive
export const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "";

/**
 * Find or create a folder inside a parent folder
 */
export async function findOrCreateFolder(
  name: string,
  parentId: string
): Promise<string> {
  const drive = getDriveClient();
  // Check if folder already exists
  const response = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  // Create the folder
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
  // Create nested folder structure
  const eventFolderId = await findOrCreateFolder(eventName, ROOT_FOLDER_ID);
  const guestFolderId = await findOrCreateFolder(guestName, eventFolderId);

  // Upload the file
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

  // Make file viewable by anyone with the link (for thumbnail/preview)
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

/**
 * Delete a file from Google Drive
 */
export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}

/**
 * Get a direct thumbnail/preview URL for a file
 */
export function getDriveThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
}

/**
 * Get a direct view URL for a file
 */
export function getDriveViewUrl(fileId: string): string {
  return `https://drive.google.com/uc?id=${fileId}`;
}
