import { Readable } from "node:stream";
import { google } from "googleapis";

const OAUTH_PLAYGROUND_REDIRECT_URI = "https://developers.google.com/oauthplayground";

function getDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google Drive OAuth2 credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN) are not fully configured."
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    OAUTH_PLAYGROUND_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export interface UploadImageParams {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  memoryDate?: string; // YYYY-MM-DD
  subfolderName?: string; // e.g. "Daily Pictures"
}

async function findOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  parentId: string,
  folderName: string
): Promise<string> {
  const escapedName = folderName.replace(/'/g, "\\'");
  const query = [
    `name = '${escapedName}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    `'${parentId}' in parents`,
    "trashed = false",
  ].join(" and ");

  const listRes = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    spaces: "drive",
    pageSize: 1,
  });

  const existingId = listRes.data.files?.[0]?.id;
  if (existingId) {
    return existingId;
  }

  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  const newId = createRes.data.id;
  if (!newId) {
    throw new Error(`Failed to create Google Drive folder "${folderName}".`);
  }
  return newId;
}

/**
 * Uploads an image buffer to `<GOOGLE_DRIVE_FOLDER_ID>/<Year>/<MonthName>` (when memoryDate is provided).
 * Files remain private (restricted access) and are served through our authenticated proxy route.
 */
export async function uploadImageToDrive({
  buffer,
  mimeType,
  fileName,
  memoryDate,
  subfolderName,
}: UploadImageParams): Promise<string> {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID environment variable is not configured.");
  }

  const drive = getDriveClient();

  let targetFolderId = rootFolderId;
  if (subfolderName) {
    targetFolderId = await findOrCreateFolder(drive, rootFolderId, subfolderName);
  } else if (memoryDate && /^\d{4}-\d{2}-\d{2}$/.test(memoryDate)) {
    const year = memoryDate.slice(0, 4);
    const monthIndex = Number(memoryDate.slice(5, 7)) - 1;
    const monthName = MONTH_NAMES[monthIndex];

    if (monthName) {
      const yearFolderId = await findOrCreateFolder(drive, rootFolderId, year);
      targetFolderId = await findOrCreateFolder(drive, yearFolderId, monthName);
    }
  }

  const createResponse = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [targetFolderId],
    },
    media: {
      mimeType: mimeType || "image/jpeg",
      body: Readable.from(buffer),
    },
    fields: "id",
  });

  const fileId = createResponse.data.id;
  if (!fileId) {
    throw new Error("Google Drive did not return a file ID after upload.");
  }

  return fileId;
}

/**
 * Fetches a private image's metadata and binary buffer from Google Drive.
 */
export async function getDriveImageStream(
  fileId: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const drive = getDriveClient();

  const metaRes = await drive.files.get({
    fileId,
    fields: "mimeType",
  });

  const mimeType = metaRes.data.mimeType || "image/jpeg";

  const mediaRes = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );

  const buffer = Buffer.from(mediaRes.data as ArrayBuffer);
  return { buffer, mimeType };
}

/**
 * Best-effort removal of an uploaded image from Google Drive when a memory is deleted.
 */
export async function deleteImageFromDrive(fileId: string): Promise<void> {
  if (!fileId) return;
  try {
    const drive = getDriveClient();
    await drive.files.delete({ fileId });
  } catch (error) {
    console.warn(`Could not delete Google Drive file ${fileId}:`, error);
  }
}
