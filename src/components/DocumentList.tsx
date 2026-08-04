import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileText, Loader2, Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createAccountUploadUrl,
  deleteAccountDocument,
  getDocumentDownloadUrl,
  recordAccountDocument,
  type AccountDocument,
} from "@/lib/account.functions";
import { formatDate } from "@/lib/request-status";

function fileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({
  documents,
  requestId,
  showReference = false,
}: {
  documents: AccountDocument[];
  requestId?: string;
  showReference?: boolean;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signUpload = useServerFn(createAccountUploadUrl);
  const recordDoc = useServerFn(recordAccountDocument);
  const signDownload = useServerFn(getDocumentDownloadUrl);
  const removeDoc = useServerFn(deleteAccountDocument);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["account"] });

  const upload = async (file: File) => {
    if (!requestId) return;
    setError(null);
    setBusy(true);
    try {
      const signed = await signUpload({
        data: {
          request_id: requestId,
          document_type: "Supporting document",
          file_name: file.name,
          file_size: file.size,
        },
      });
      if (!signed.ok) throw new Error(signed.message);
      const put = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error("Upload failed. Please try again.");
      const saved = await recordDoc({
        data: {
          request_id: requestId,
          document_type: "Supporting document",
          file_url: signed.path,
          file_name: file.name,
          file_size: file.size,
        },
      });
      if (!saved.ok) throw new Error(saved.message ?? "Could not save the document.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const download = useMutation({
    mutationFn: (id: string) => signDownload({ data: { document_id: id } }),
    onSuccess: (result) => {
      if (result.ok) window.open(result.url, "_blank", "noopener,noreferrer");
      else setError(result.message);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeDoc({ data: { document_id: id } }),
    onSuccess: async (result) => {
      if (!result.ok) setError(result.message ?? "Could not delete the document.");
      await refresh();
    },
  });

  return (
    <div>
      {requestId ? (
        <div className="mb-5">
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <Button
            type="button"
            size="lg"
            variant="secondary"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="rounded-2xl"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
            )}
            Upload a document
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">PDF, JPG or PNG, up to 10 MB.</p>
        </div>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-2xl border border-orange/40 bg-peach-tint px-4 py-3 text-sm font-medium text-navy">
          {error}
        </p>
      ) : null}

      {documents.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-white/60 p-6 text-sm text-muted-foreground">
          No documents uploaded yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {documents.map((doc) => {
            const status = normalizeDocumentStatus(doc.review_status);
            const replace = needsReplacement(doc.review_status);
            return (
            <li
              key={doc.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/70 bg-white/70 p-4"
            >
              <span
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-tint"
                aria-hidden="true"
              >
                <FileText className="h-5 w-5 text-navy" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 truncate text-sm font-bold text-navy">
                  {doc.file_name ?? doc.document_type}
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${documentStatusTone(
                      doc.review_status,
                    )}`}
                  >
                    {status === "verified" ? "✓ " : ""}
                    {documentStatusLabel(doc.review_status)}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {doc.document_type}
                  {showReference && doc.request_reference ? ` · ${doc.request_reference}` : ""}
                  {doc.file_size ? ` · ${fileSize(doc.file_size)}` : ""} ·{" "}
                  {formatDate(doc.uploaded_at)}
                </p>
                {doc.review_note ? (
                  <p className="mt-1.5 rounded-xl bg-peach-tint px-3 py-2 text-xs font-medium text-navy">
                    {doc.review_note}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                {replace && requestId ? (
                  <Button
                    type="button"
                    size="sm"
                    className="btn-gradient rounded-xl text-white"
                    disabled={busy}
                    onClick={() => {
                      setReplaceFor(doc);
                      requestAnimationFrame(() => inputRef.current?.click());
                    }}
                  >
                    <UploadCloud className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Upload replacement
                  </Button>
                ) : null}
                <button
                  type="button"
                  onClick={() => download.mutate(doc.id)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-navy transition-colors hover:bg-navy-tint"
                  aria-label={`Download ${doc.file_name ?? doc.document_type}`}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => remove.mutate(doc.id)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-navy transition-colors hover:bg-peach-tint"
                  aria-label={`Delete ${doc.file_name ?? doc.document_type}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
