import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AdminDashboard from "@/components/admin-dashboard";
import { getFolderId, listFolderFiles } from "@/lib/drive";
import { getUploadAttempts } from "@/lib/upload-log";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (session.role !== "admin") redirect("/?error=admin_required");

  let files: Array<{ id: string; name: string; createdTime?: string | null }> = [];
  let folderId = "";
  let errorNotice: string | undefined;

  try {
    const [fetchedFiles, fetchedFolderId] = await Promise.all([listFolderFiles(), getFolderId()]);
    files = fetchedFiles;
    folderId = fetchedFolderId;
  } catch (err) {
    console.warn("Admin dashboard drive connection warning:", err);
    errorNotice = err instanceof Error ? err.message : "Could not connect to Google Drive.";
  }

  const attempts = await getUploadAttempts();
  return (
    <AdminDashboard
      email={session.email ?? "Administrator"}
      files={files}
      attempts={attempts}
      folderId={folderId}
      errorNotice={errorNotice}
    />
  );
}
