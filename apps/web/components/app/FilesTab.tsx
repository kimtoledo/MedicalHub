"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload, FileImage, FileText, File, Trash2, ExternalLink,
  X, ChevronDown, Loader2, ImageIcon,
} from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialogProvider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FileItem = {
  id: string;
  fileType: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  toothRef: string | null;
  notes: string | null;
  encounterId: string | null;
  patientId: string;
  createdAt: string;
};

const FILE_TYPE_LABELS: Record<string, string> = {
  radiograph: "Radiograph",
  intraoral_photo: "Intraoral Photo",
  extraoral_photo: "Extraoral Photo",
  consent_form: "Consent Form",
  lab_result: "Lab Result",
  referral_letter: "Referral Letter",
  other: "Other",
};

const ACCEPTED_TYPES = ".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf";
const MAX_SIZE_MB = 20;

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <FileImage size={16} className="text-violet-400" />;
  if (mimeType === "application/pdf") return <FileText size={16} className="text-red-400" />;
  return <File size={16} className="text-violet-300" />;
}

// ---------------------------------------------------------------------------
// Inline Image Viewer
// ---------------------------------------------------------------------------

function ImageViewer({ url, filename, onClose }: { url: string; filename: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 bg-white rounded-full p-1 shadow-lg hover:bg-gray-100"
        >
          <X size={16} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={filename}
          className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain"
        />
        <p className="text-white text-xs text-center mt-2 opacity-70 truncate">{filename}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FilesTab({
  clinicId,
  encounterId,
  patientId,
  branchId,
  /** If false, upload button is hidden (e.g. on patient-level aggregated view) */
  allowUpload = true,
}: {
  clinicId: string;
  encounterId?: string;
  patientId?: string;
  branchId: string;
  allowUpload?: boolean;
}) {
  const confirmDialog = useConfirm();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerFilename, setViewerFilename] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState("radiograph");
  const [encounterIdInput] = useState(encounterId ?? "");
  const [toothRef, setToothRef] = useState("");
  const [notes, setNotes] = useState("");

  // URL cache: fileId → url (short-lived, ~14 min)
  const urlCache = useRef<Record<string, { url: string; exp: number }>>({});

  const listUrl = encounterId
    ? `/api/clinic/${clinicId}/files?encounterId=${encounterId}&pageSize=50`
    : patientId
    ? `/api/clinic/${clinicId}/files?patientId=${patientId}&pageSize=50`
    : null;

  const loadFiles = useCallback(() => {
    if (!listUrl) return;
    setLoading(true);
    fetch(listUrl, { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data: { success: boolean; data: FileItem[]; total: number }) => {
        if (data.success) {
          setFiles(data.data);
          setTotal(data.total);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [listUrl]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  async function getSignedUrl(fileId: string): Promise<string | null> {
    const cached = urlCache.current[fileId];
    if (cached && Date.now() < cached.exp) return cached.url;

    try {
      const res = await fetch(
        `/api/clinic/${clinicId}/files/${fileId}/url`,
        { credentials: "include", cache: "no-store" }
      );
      const body = await res.json() as { success: boolean; data?: { downloadUrl: string } };
      if (!body.success || !body.data) return null;
      // The API returns an internal path; rewrite to /api proxy path
      const rawPath = body.data.downloadUrl;
      const url = rawPath.startsWith("/v1/")
        ? rawPath.replace(/^\/v1/, "/api")
        : rawPath;
      urlCache.current[fileId] = { url, exp: Date.now() + 14 * 60 * 1000 };
      return url;
    } catch {
      return null;
    }
  }

  async function handleView(file: FileItem) {
    const url = await getSignedUrl(file.id);
    if (!url) return;
    if (file.mimeType.startsWith("image/")) {
      setViewerFilename(file.originalFilename);
      setViewerUrl(url);
    } else {
      window.open(url, "_blank");
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setSelectedFile(f);
    if (f && !showUploadForm) setShowUploadForm(true);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) { setUploadError("Please select a file"); return; }
    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`File exceeds ${MAX_SIZE_MB} MB limit`);
      return;
    }
    setUploading(true);
    setUploadError(null);

    const form = new FormData();
    form.append("file", selectedFile);
    form.append("fileType", fileType);
    form.append("patientId", patientId ?? "");
    form.append("branchId", branchId);
    if (encounterIdInput) form.append("encounterId", encounterIdInput);
    if (toothRef.trim()) form.append("toothRef", toothRef.trim());
    if (notes.trim()) form.append("notes", notes.trim());

    try {
      const res = await fetch(`/api/clinic/${clinicId}/files`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const body = await res.json() as { success: boolean; error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Upload failed");
      // Reset form
      setSelectedFile(null);
      setToothRef("");
      setNotes("");
      setShowUploadForm(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadFiles();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(fileId: string) {
    const confirmed = await confirmDialog({ title: "Delete file", message: "Delete this file? This cannot be undone.", tone: "danger" });
    if (!confirmed) return;
    setDeletingId(fileId);
    try {
      await fetch(`/api/clinic/${clinicId}/files/${fileId}`, {
        method: "DELETE",
        credentials: "include",
      });
      loadFiles();
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload trigger */}
      {allowUpload && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Upload size={14} /> Upload File
          </button>
        </div>
      )}

      {/* Upload form */}
      {showUploadForm && selectedFile && (
        <form onSubmit={handleUpload} className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-violet-900">
              {selectedFile.name} <span className="text-violet-400 font-normal">({formatBytes(selectedFile.size)})</span>
            </p>
            <button
              type="button"
              onClick={() => { setShowUploadForm(false); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="text-violet-400 hover:text-violet-600"
            >
              <X size={16} />
            </button>
          </div>

          {uploadError && (
            <p className="text-red-600 text-xs bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">{uploadError}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-violet-700 mb-1">File type</label>
              <div className="relative">
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                  className="w-full appearance-none px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 pr-8"
                >
                  {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-violet-700 mb-1">Tooth ref (FDI)</label>
              <input
                type="text"
                value={toothRef}
                onChange={(e) => setToothRef(e.target.value)}
                placeholder="e.g. 16, 36"
                className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-violet-700 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional annotation"
              className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowUploadForm(false); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="px-4 py-2 text-sm text-violet-600 hover:text-violet-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      )}

      {/* File list */}
      <div className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <ImageIcon size={32} className="text-violet-200" />
            <p className="text-violet-400 text-sm">No files uploaded yet</p>
            {allowUpload && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-violet-600 hover:text-violet-800 text-xs font-semibold underline"
              >
                Upload the first file
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-violet-50">
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                onView={() => handleView(file)}
                onDelete={() => handleDelete(file.id)}
                deleting={deletingId === file.id}
              />
            ))}
          </ul>
        )}
      </div>

      {total > 50 && (
        <p className="text-xs text-violet-400 text-center">Showing 50 of {total} files</p>
      )}

      {/* Lightbox */}
      {viewerUrl && (
        <ImageViewer
          url={viewerUrl}
          filename={viewerFilename}
          onClose={() => setViewerUrl(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FileRow sub-component
// ---------------------------------------------------------------------------

function FileRow({
  file,
  onView,
  onDelete,
  deleting,
}: {
  file: FileItem;
  onView: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const isImage = file.mimeType.startsWith("image/");
  const isPdf = file.mimeType === "application/pdf";

  return (
    <li className="flex items-center gap-3 px-4 py-3 hover:bg-violet-50/50 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
        {fileIcon(file.mimeType)}
      </div>

      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={onView}
          className="text-left group"
        >
          <p className="text-sm font-medium text-violet-900 truncate group-hover:text-violet-600 transition-colors">
            {file.originalFilename}
          </p>
        </button>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-violet-400 flex-wrap">
          <span className="bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded text-[10px] font-semibold">
            {FILE_TYPE_LABELS[file.fileType] ?? file.fileType}
          </span>
          <span>{formatBytes(file.sizeBytes)}</span>
          {file.toothRef && <span>Tooth {file.toothRef}</span>}
          {file.notes && <span className="truncate max-w-[150px]">{file.notes}</span>}
          <span>{new Date(file.createdAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={onView}
          title={isImage ? "View" : "Open in new tab"}
          className="p-1.5 rounded-lg text-violet-400 hover:bg-violet-100 hover:text-violet-600 transition-colors"
        >
          {isImage ? <ImageIcon size={15} /> : <ExternalLink size={15} />}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          title="Delete"
          className="p-1.5 rounded-lg text-violet-300 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
        >
          {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
        </button>
      </div>
    </li>
  );
}
