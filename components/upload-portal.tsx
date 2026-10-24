"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";

type UploadItem = {
  id: string;
  file: File;
  status: "ready" | "uploading" | "success" | "error";
  progress: number;
  message?: string;
  driveFileId?: string;
};

const accepted = ".jpg,.jpeg,.png,.webp,.heic,image/jpeg,image/png,image/webp,image/heic";

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function UploadPortal() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [access, setAccess] = useState("");
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [accessSuccess, setAccessSuccess] = useState(false);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "completed" | "failed">("all");

  const successCount = useMemo(() => items.filter((item) => item.status === "success").length, [items]);
  const pendingCount = useMemo(() => items.filter((item) => item.status === "ready").length, [items]);
  const uploadingCount = useMemo(() => items.filter((item) => item.status === "uploading").length, [items]);
  const errorCount = useMemo(() => items.filter((item) => item.status === "error").length, [items]);

  const totalSize = useMemo(() => {
    return items.reduce((acc, item) => acc + item.file.size, 0);
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeTab === "pending") return items.filter((i) => i.status === "ready" || i.status === "uploading");
    if (activeTab === "completed") return items.filter((i) => i.status === "success");
    if (activeTab === "failed") return items.filter((i) => i.status === "error");
    return items;
  }, [items, activeTab]);

  const addFiles = (files: File[]) => {
    const next = files
      .filter((file) => file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic)$/i.test(file.name))
      .map((file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        status: "ready" as const,
        progress: 0
      }));
    setItems((current) => [...current, ...next]);
  };

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const update = (id: string, patch: Partial<UploadItem>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const uploadOne = async (item: UploadItem) => {
    update(item.id, { status: "uploading", progress: 10, message: undefined });
    const form = new FormData();
    form.append("files", item.file, item.file.name);
    try {
      const body = await new Promise<{ results?: Array<{ success: boolean; fileId?: string; error?: string }> }>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/upload");
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              update(item.id, { progress: Math.max(10, Math.round((event.loaded / event.total) * 90)) });
            }
          };
          xhr.onload = () => {
            try {
              if (xhr.status === 401) {
                setAccessOpen(true);
                reject(new Error("Access key required. Enter your secret in the panel above."));
                return;
              }
              const parsed = JSON.parse(xhr.responseText);
              if (xhr.status >= 400) {
                reject(new Error(parsed.error ?? `Server error (${xhr.status})`));
                return;
              }
              resolve(parsed as { results?: Array<{ success: boolean; fileId?: string; error?: string }> });
            } catch (e) {
              reject(e instanceof Error ? e : new Error("The server returned an invalid response."));
            }
          };
          xhr.onerror = () => reject(new Error("Network connection interrupted."));
          xhr.send(form);
        }
      );
      const result = body.results?.[0];
      if (!result?.success) throw new Error(result?.error ?? "Upload could not be completed.");
      update(item.id, { status: "success", progress: 100, driveFileId: result.fileId, message: "Saved to Google Drive" });
    } catch (error) {
      update(item.id, { status: "error", progress: 0, message: error instanceof Error ? error.message : "Upload failed" });
    }
  };

  const uploadAll = () => {
    items.filter((item) => item.status === "ready" || item.status === "error").forEach((item) => void uploadOne(item));
  };

  const clearCompleted = () => {
    setItems((current) => current.filter((item) => item.status !== "success"));
  };

  const clearAll = () => {
    setItems([]);
  };

  const unlock = async () => {
    setLoadingAccess(true);
    setAccessMessage("");
    setAccessSuccess(false);
    try {
      const response = await fetch("/api/auth/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: access })
      });
      if (!response.ok) throw new Error("Invalid access key or secret has expired.");
      setAccessSuccess(true);
      setAccessMessage("Access verified. Workstation authorized to upload.");
      setAccess("");
      setTimeout(() => {
        setAccessOpen(false);
      }, 1400);
    } catch (error) {
      setAccessSuccess(false);
      setAccessMessage(error instanceof Error ? error.message : "Could not verify access key.");
    } finally {
      setLoadingAccess(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Brand Logo & Status */}
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm transition-transform group-hover:scale-105">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                </svg>
              </div>
              <div>
                <span className="font-semibold text-base tracking-tight text-slate-900">CloudVault</span>
                <span className="ml-2 inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                  STORAGE HUB
                </span>
              </div>
            </a>

            <div className="hidden h-5 w-px bg-slate-200 sm:block" />

            <div className="hidden items-center gap-2 sm:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-slate-600">Google Drive Gateway Online</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5">
            <button
              id="access-key-button"
              type="button"
              onClick={() => setAccessOpen((open) => !open)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors cursor-pointer ${
                accessSuccess
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : accessOpen
                  ? "border-indigo-400 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
              }`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>{accessSuccess ? "Authorized" : "Access Key"}</span>
            </button>

            <a
              id="admin-console-link"
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-400"
            >
              <svg className="h-3.5 w-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              </svg>
              <span>Admin Console</span>
            </a>
          </div>
        </div>
      </header>

      {/* Access Key Authorization Drawer / Panel */}
      {accessOpen && (
        <div className="border-b border-indigo-100 bg-indigo-50/70 py-4 transition-all animate-in fade-in slide-in-from-top-2">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 rounded-xl border border-indigo-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="16" r="1" />
                    <rect x="3" y="10" width="18" height="12" rx="2" />
                    <path d="M7 10V7a5 5 0 0 1 10 0v3" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Workstation Upload Authorization</h4>
                  <p className="text-xs text-slate-500">
                    Enter your team's access secret to authorize direct uploads from this browser session.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <input
                    type="password"
                    value={access}
                    onChange={(e) => setAccess(e.target.value)}
                    placeholder="Enter access secret"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:w-64"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") unlock();
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={unlock}
                    disabled={loadingAccess || !access.trim()}
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {loadingAccess ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Verifying...
                      </span>
                    ) : (
                      "Unlock"
                    )}
                  </button>
                  <button
                    onClick={() => setAccessOpen(false)}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
            {accessMessage && (
              <p
                className={`mt-2 text-xs font-medium ${
                  accessSuccess ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {accessMessage}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Dashboard Title & Headline */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Cloud Asset Ingestion</span>
              <span>•</span>
              <span className="text-indigo-600">Secure Pipeline</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Asset Upload & Storage Console
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Stream high-resolution product media directly to Google Drive. Fully private with zero intermediate server retention.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button
                onClick={uploadAll}
                disabled={pendingCount === 0 && errorCount === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
                <span>Upload All ({pendingCount + errorCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Top KPI Metrics Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Card 1 */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Staged Queue</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">{items.length}</span>
              <span className="text-xs font-medium text-slate-500">assets</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {successCount} synced · {pendingCount} pending
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Target Vault</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold tracking-tight text-slate-900 truncate">Google Drive</span>
            </div>
            <div className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Connected & Verified
            </div>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Ingestion Limit</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">25 MB</span>
              <span className="text-xs font-medium text-slate-500">/ file</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP, HEIC</div>
          </div>

          {/* Card 4 */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Data Pipeline</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold tracking-tight text-slate-900">Direct Relay</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">Zero Server Disk Footprint</div>
          </div>
        </div>

        {/* Dashboard Workspace Layout: 8 cols main + 4 cols sidebar */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Main Console Section (8 cols) */}
          <div className="space-y-6 lg:col-span-8">
            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`group relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                dragging
                  ? "border-indigo-600 bg-indigo-50/50 shadow-inner"
                  : "border-slate-300 bg-white hover:border-indigo-500 hover:bg-slate-50/60 shadow-sm"
              }`}
            >
              <input ref={inputRef} type="file" multiple accept={accepted} onChange={onPick} className="hidden" />

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-8 ring-indigo-50/50 group-hover:scale-110 transition-transform">
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                  <path d="M12 12v9" />
                  <path d="m16 16-4-4-4 4" />
                </svg>
              </div>

              <h3 className="mt-4 text-base font-semibold text-slate-900">
                Drag and drop assets here, or <span className="text-indigo-600 underline-offset-2 hover:underline">browse files</span>
              </h3>
              <p className="mt-1.5 text-xs text-slate-500">
                Supports high-resolution JPEG, PNG, WebP, and Apple HEIC photos up to 25 MB per file.
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                {["JPG", "PNG", "WEBP", "HEIC"].map((format) => (
                  <span key={format} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                    {format}
                  </span>
                ))}
                <span className="text-[10px] text-slate-400">• Multi-file batch support</span>
              </div>
            </div>

            {/* Queue Management Card */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {/* Queue Header & Tabs */}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50/60 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">Upload Queue</h3>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    {items.length}
                  </span>
                  {totalSize > 0 && (
                    <span className="text-xs text-slate-500">
                      ({formatBytes(totalSize)})
                    </span>
                  )}
                </div>

                {items.length > 0 && (
                  <div className="flex items-center gap-2">
                    {/* Filter tabs */}
                    <div className="flex rounded-lg bg-slate-200/70 p-0.5 text-xs font-medium text-slate-600">
                      <button
                        onClick={() => setActiveTab("all")}
                        className={`rounded-md px-2.5 py-1 transition ${activeTab === "all" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"}`}
                      >
                        All ({items.length})
                      </button>
                      <button
                        onClick={() => setActiveTab("pending")}
                        className={`rounded-md px-2.5 py-1 transition ${activeTab === "pending" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"}`}
                      >
                        Pending ({pendingCount})
                      </button>
                      <button
                        onClick={() => setActiveTab("completed")}
                        className={`rounded-md px-2.5 py-1 transition ${activeTab === "completed" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"}`}
                      >
                        Done ({successCount})
                      </button>
                      {errorCount > 0 && (
                        <button
                          onClick={() => setActiveTab("failed")}
                          className={`rounded-md px-2.5 py-1 transition ${activeTab === "failed" ? "bg-white text-red-600 shadow-sm" : "text-red-500 hover:text-red-700"}`}
                        >
                          Failed ({errorCount})
                        </button>
                      )}
                    </div>

                    {successCount > 0 && (
                      <button
                        onClick={clearCompleted}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        title="Remove uploaded items from queue"
                      >
                        Clear Done
                      </button>
                    )}

                    <button
                      onClick={clearAll}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      title="Clear entire queue"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>

              {/* Items List */}
              {items.length > 0 ? (
                <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3.5 p-3.5 transition-colors hover:bg-slate-50/80"
                    >
                      {/* Image Thumbnail Preview */}
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-xs">
                        <img
                          src={URL.createObjectURL(item.file)}
                          alt={item.file.name}
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute bottom-0 right-0 rounded-tl bg-slate-900/70 px-1 py-0.2 text-[9px] font-mono text-white">
                          {item.file.name.split(".").pop()?.toUpperCase() ?? "IMG"}
                        </span>
                      </div>

                      {/* File Details & Progress */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900" title={item.file.name}>
                            {item.file.name}
                          </p>
                          <span className="shrink-0 font-mono text-xs text-slate-500">
                            {formatBytes(item.file.size)}
                          </span>
                        </div>

                        {/* Progress Bar for Uploading State */}
                        {item.status === "uploading" && (
                          <div className="mt-1.5">
                            <div className="flex items-center justify-between text-[11px] font-medium text-indigo-600">
                              <span>Transferring to Drive...</span>
                              <span className="font-mono">{item.progress}%</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-indigo-600 transition-all duration-200"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Status Message */}
                        <div className="mt-1 flex items-center gap-2">
                          {item.status === "ready" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              Ready for upload
                            </span>
                          )}

                          {item.status === "success" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                              <svg className="h-3 w-3 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span>Saved to Google Drive</span>
                              {item.driveFileId && (
                                <span className="font-mono text-[10px] text-emerald-600 opacity-80">
                                  ({item.driveFileId.slice(0, 8)}...)
                                </span>
                              )}
                            </span>
                          )}

                          {item.status === "error" && (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 border border-red-200">
                                <svg className="h-3 w-3 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="12" y1="8" x2="12" y2="12" />
                                  <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>{item.message ?? "Transfer failed"}</span>
                              </span>
                              <button
                                onClick={() => void uploadOne(item)}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
                              >
                                Retry
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        {item.status === "ready" && (
                          <button
                            onClick={() => void uploadOne(item)}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-xs hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition"
                            title="Upload this file"
                          >
                            <svg className="h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" x2="12" y1="3" y2="15" />
                            </svg>
                            Upload
                          </button>
                        )}

                        {item.status !== "uploading" && (
                          <button
                            onClick={() => setItems((current) => current.filter((other) => other.id !== item.id))}
                            aria-label={`Remove ${item.file.name}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600 transition"
                            title="Remove from queue"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {filteredItems.length === 0 && (
                    <div className="py-10 text-center text-xs text-slate-500">
                      No files matching the "{activeTab}" filter.
                    </div>
                  )}
                </div>
              ) : (
                /* Empty state when no files exist */
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="m9 9 6 6" />
                      <path d="m15 9-6 6" />
                    </svg>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-slate-900">No assets staged in queue</h4>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                    Drag photos into the dropzone above or click to browse. Selected files will appear here for inspection before transfer.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar System Console (4 cols) */}
          <div className="space-y-6 lg:col-span-4">
            {/* System Status & Gateway Health */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Infrastructure
                </h4>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Operational
                </span>
              </div>

              <dl className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Storage Destination</dt>
                  <dd className="font-medium text-slate-900">Google Drive API v3</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Authentication</dt>
                  <dd className="font-medium text-slate-900">OAuth 2.0 Token Vault</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Transfer Security</dt>
                  <dd className="font-medium text-slate-900">IronSession Encrypted</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Ingestion Mode</dt>
                  <dd className="font-medium text-slate-900">Direct In-Memory Buffer</dd>
                </div>
              </dl>
            </div>

            {/* Ingestion Guidelines */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-3">
                Upload Specifications
              </h4>
              <ul className="mt-4 space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Supports original resolution photographs with preserved color profiles.</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Files up to 25 MB are uploaded via multipart/resumable streams.</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>File names are automatically normalized for cloud storage compatibility.</span>
                </li>
              </ul>
            </div>

            {/* Admin Console Card */}
            <div className="rounded-xl border border-slate-200 bg-linear-to-br from-slate-900 to-slate-800 p-5 text-white shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Administrator Access</h4>
                  <p className="text-[11px] text-slate-300">Authorized personnel only</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                Sign in to view real-time Google Drive folder contents, audit upload logs, and manage storage authorizations.
              </p>
              <div className="mt-4">
                <a
                  href="/api/auth/google"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
                >
                  <span>Sign In with Google</span>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Enterprise Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6 lg:px-8 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>CloudVault Enterprise Ingestion Service</span>
            <span>•</span>
            <span>Zero server data retention</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/api/health" target="_blank" rel="noreferrer" className="hover:text-slate-800 transition">
              Health API
            </a>
            <a href="/admin" className="font-medium text-indigo-600 hover:text-indigo-800 transition">
              Admin Portal
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
