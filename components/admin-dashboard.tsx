"use client";

import { useMemo, useState } from "react";

type DriveFile = { id: string; name: string; createdTime?: string | null };
type Attempt = { name: string; createdAt: string; success: boolean; error?: string };

export default function AdminDashboard({
  email,
  files,
  attempts,
  folderId,
  errorNotice
}: {
  email: string;
  files: DriveFile[];
  attempts: Attempt[];
  folderId: string;
  errorNotice?: string;
}) {
  const [activeTab, setActiveTab] = useState<"files" | "attempts">("files");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const successfulAttempts = useMemo(() => attempts.filter((a) => a.success).length, [attempts]);
  const successRate = useMemo(() => {
    if (attempts.length === 0) return 100;
    return Math.round((successfulAttempts / attempts.length) * 100);
  }, [attempts, successfulAttempts]);

  const filteredFiles = useMemo(() => {
    if (!searchTerm.trim()) return files;
    const term = searchTerm.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(term) || f.id.toLowerCase().includes(term));
  }, [files, searchTerm]);

  const filteredAttempts = useMemo(() => {
    if (!searchTerm.trim()) return attempts;
    const term = searchTerm.toLowerCase();
    return attempts.filter(
      (a) => a.name.toLowerCase().includes(term) || (a.error && a.error.toLowerCase().includes(term))
    );
  }, [attempts, searchTerm]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Admin Navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo & Admin Badge */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm transition-transform group-hover:scale-105">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                </svg>
              </div>
              <span className="font-semibold text-base tracking-tight text-slate-900">CloudVault</span>
            </a>
            <span className="inline-flex items-center rounded-md bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
              ADMIN CONSOLE
            </span>
          </div>

          {/* User profile & Actions */}
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Upload Portal</span>
            </a>

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-medium truncate max-w-[150px] sm:max-w-[200px]" title={email}>
                {email}
              </span>
            </div>

            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 hover:text-red-600 transition"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Connection Alert if Drive Auth Failed */}
        {errorNotice && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold">Google Drive Connection Required</h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  The current token was rejected by Google ({errorNotice}). Authorize your Google account to connect your Drive vault.
                </p>
              </div>
            </div>
            <a
              href="/api/auth/google"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition"
            >
              Authorize Google Drive &rarr;
            </a>
          </div>
        )}

        {/* Header Breadcrumbs & Title */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>CloudVault Management</span>
              <span>•</span>
              <span className="text-indigo-600">Storage Overview</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Cloud Storage & Audit Console
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Monitor active Google Drive repository files, manage upload access tokens, and inspect transfer activity.
            </p>
          </div>

          <a
            href={`https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <span>Open in Google Drive</span>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" x2="21" y1="14" y2="3" />
            </svg>
          </a>
        </div>

        {/* KPI Metric Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Files Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Drive Files</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-slate-900">{files.length}</span>
              <span className="text-xs font-medium text-slate-500">items in vault</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">Fetched via Google Drive API v3</div>
          </div>

          {/* Activity Log Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Upload Activity</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-slate-900">{attempts.length}</span>
              <span className="text-xs font-medium text-slate-500">total attempts</span>
            </div>
            <div className="mt-1 text-xs text-emerald-600 font-medium">
              {successRate}% successful transfers
            </div>
          </div>

          {/* Vault Folder Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Folder ID</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 8 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                </svg>
              </span>
            </div>
            <div className="mt-3">
              <p className="font-mono text-xs text-slate-700 truncate" title={folderId}>
                {folderId || "Automatic Default"}
              </p>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>Drive Storage Target</span>
              <button
                onClick={() => copyToClipboard(folderId, "folder-id")}
                className="text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                {copiedId === "folder-id" ? "Copied!" : "Copy ID"}
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Data Panel */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Controls toolbar */}
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            {/* View Switcher Tabs */}
            <div className="flex rounded-lg bg-slate-200/70 p-1 text-xs font-medium text-slate-600">
              <button
                onClick={() => setActiveTab("files")}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 transition ${
                  activeTab === "files" ? "bg-white text-slate-900 shadow-sm font-semibold" : "hover:text-slate-900"
                }`}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                </svg>
                <span>Drive Files ({files.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("attempts")}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 transition ${
                  activeTab === "attempts" ? "bg-white text-slate-900 shadow-sm font-semibold" : "hover:text-slate-900"
                }`}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                <span>Audit Log ({attempts.length})</span>
              </button>
            </div>

            {/* Live Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={activeTab === "files" ? "Filter files by name or ID..." : "Filter audit log by name..."}
                className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:w-72"
              />
              <svg
                className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
          </div>

          {/* Drive Files Table */}
          {activeTab === "files" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">File Name</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Google Drive ID</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Upload Timestamp</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFiles.slice(0, 50).map((file) => (
                    <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 font-medium text-slate-900">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect width="18" height="18" x="3" y="3" rx="2" />
                              <circle cx="9" cy="9" r="2" />
                              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                            </svg>
                          </span>
                          <span className="truncate max-w-xs sm:max-w-md" title={file.name}>
                            {file.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <span>{file.id.slice(0, 14)}...</span>
                          <button
                            onClick={() => copyToClipboard(file.id, file.id)}
                            className="text-slate-400 hover:text-indigo-600"
                            title="Copy full file ID"
                          >
                            {copiedId === file.id ? (
                              <span className="text-[10px] text-emerald-600 font-sans">Copied</span>
                            ) : (
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {file.createdTime ? new Date(file.createdTime).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          <span>Open</span>
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" x2="21" y1="14" y2="3" />
                          </svg>
                        </a>
                      </td>
                    </tr>
                  ))}

                  {filteredFiles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        {files.length === 0 ? "No photos have been uploaded yet." : "No files matched your search filter."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Audit Log Table */}
          {activeTab === "attempts" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Attempt File Name</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Result Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Detail / Error</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Logged Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttempts.slice(0, 50).map((attempt, index) => (
                    <tr key={`${attempt.createdAt}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900 truncate max-w-xs">
                        {attempt.name}
                      </td>
                      <td className="px-4 py-3">
                        {attempt.success ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 border border-red-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {attempt.success ? (
                          <span className="text-slate-400">Streamed to Google Drive successfully</span>
                        ) : (
                          <span className="font-mono text-red-600 text-[11px]">{attempt.error ?? "Upload error"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 font-mono">
                        {new Date(attempt.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}

                  {filteredAttempts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        {attempts.length === 0 ? "No upload attempts recorded yet." : "No attempts matched your search filter."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Admin Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6 lg:px-8 text-xs text-slate-500">
          <span>CloudVault Administration Console · Google Drive API</span>
          <div className="flex items-center gap-4">
            <a href="/" className="hover:text-slate-800 transition">User Upload Portal</a>
            <span>•</span>
            <a href="/api/health" target="_blank" rel="noreferrer" className="hover:text-slate-800 transition">System Health</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
