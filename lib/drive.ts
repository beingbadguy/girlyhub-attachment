import { Readable } from "node:stream";
import { google } from "googleapis";
import { getConfig } from "./config";
import { getOAuthClient } from "./google";
import { getRefreshToken } from "./token-store";

async function driveClient() {
  const token = await getRefreshToken();
  if (!token) throw new Error("Google Drive has not been connected by an administrator.");
  const auth = getOAuthClient();
  auth.setCredentials({ refresh_token: token });
  return google.drive({ version: "v3", auth });
}

export async function getFolderId() {
  const config = getConfig();
  const drive = await driveClient();
  if (config.GOOGLE_DRIVE_FOLDER_ID) return config.GOOGLE_DRIVE_FOLDER_ID;

  const existing = await drive.files.list({
    q: "name = 'GirlyHub' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    fields: "files(id,name)",
    spaces: "drive",
    pageSize: 1
  });
  if (existing.data.files?.[0]?.id) return existing.data.files[0].id;

  const created = await drive.files.create({
    requestBody: { name: "GirlyHub", mimeType: "application/vnd.google-apps.folder" },
    fields: "id"
  });
  if (!created.data.id) throw new Error("Could not create the GirlyHub folder.");
  return created.data.id;
}

export async function uploadToDrive(file: File) {
  const drive = await driveClient();
  const folderId = await getFolderId();
  const buffer = Buffer.from(await file.arrayBuffer());
  const bodyStream = Readable.from(buffer);

  const response = await drive.files.create({
    requestBody: {
      name: file.name.replace(/[^\w.\- ()]/g, "_"),
      parents: [folderId],
      mimeType: file.type
    },
    media: {
      mimeType: file.type,
      body: bodyStream
    },
    fields: "id,name,createdTime",
    uploadType: file.size > 5 * 1024 * 1024 ? "resumable" : "multipart"
  });

  if (!response.data.id) throw new Error("Google Drive did not return a file ID.");
  return {
    id: response.data.id,
    name: response.data.name ?? file.name,
    createdTime: response.data.createdTime
  };
}

export async function listFolderFiles() {
  const drive = await driveClient();
  const folderId = await getFolderId();
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    orderBy: "createdTime desc",
    pageSize: 100,
    fields: "files(id,name,createdTime)"
  });
  return (response.data.files ?? []).filter(
    (file): file is { id: string; name: string; createdTime?: string | null } =>
      Boolean(file.id && file.name)
  );
}
