import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, FileWarning, Loader2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createAccountUploadUrl,
  recordAccountDocument,
  type DocumentRequestItem,
} from "@/lib/account.functions";
import { formatDate } from "@/lib/request-status";

const TONE: Record<string, string> = {
  pending: "border-orange/40 bg-peach-tint text-navy",
  uploaded: "border-lavender/50 bg-lavender-tint text-navy",
  approved: "border-mint/50 bg-mint-tint text-navy",
  rejected: "border-coral/50 bg-peach-tint text-navy",
};

const LABEL: Record<string, string> = {
  pending: "Upload needed",
  uploaded: "Uploaded",
  approved: "Approved",
  rejected: "Re-upload needed",
};

export function DocumentRequestList({
  items,
  showReference = false,
}: {
  items: DocumentRequestItem[];
  showReference?: boolean;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signUpload = useServerFn(createAccountUploadUrl);
  const recordDoc = useServerFn(recordAccountDocument);

  const active = items.find((item) => item.id === activeId) ?? null;

  const upload = async (file: File, item: DocumentRequestItem) => {
    setError(null);
    setBusyId(item.id);
    try {
      const signed = await signUpload({
        data: {
          request_id: item.request_id,
          document_type: item.document_name,
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
          request_id: item.request_id,
          document_type: item.document_name,
          file_url: signed.path,
          file_name: file.name,
          file_size: file.size,
          document_request_id: item.id,
        },
      });
      if (!saved.ok) throw new Error(saved.message ?? "Could not save the document.");
      await queryClient.invalidateQueries({ queryKey: ["account"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusyId(null);
      setActiveId(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-white/60 p-6 text-sm text-muted-foreground">
        No documents have been requested. We will let you know here if our specialists need
        anything else.
      </p>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && active) void upload(file, active);
        }}
      />

      {error ? (
        <p className="mb-4 rounded-2xl border border-orange/40 bg-peach-tint px-4 py-3 text-sm font-medium text-navy">
          {error}
        </p>
      ) : null}

      <ul className="space-y-3">
        {items.map((item) => {
          const done = item.uploaded_status === "uploaded" || item.uploaded_status === "approved";
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/70 bg-white/70 p-4"
            >
              <span
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  done ? "bg-mint-tint" : "bg-peach-tint"
                }`}
                aria-hidden="true"
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-navy" />
                ) : (
                  <FileWarning className="h-5 w-5 text-navy" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-navy">
                  {item.document_name}
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                      TONE[item.uploaded_status] ?? TONE["pending"]
                    }`}
                  >
                    {LABEL[item.uploaded_status] ?? item.uploaded_status}
                  </span>
                  {item.required_status === "optional" ? (
                    <span className="text-[11px] font-semibold text-muted-foreground">Optional</span>
                  ) : null}
                </p>
                {item.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {showReference && item.request_reference ? `${item.request_reference} · ` : ""}
                  {item.file_name
                    ? `${item.file_name} · uploaded ${formatDate(item.uploaded_at)}`
                    : `Requested ${formatDate(item.created_at)}`}
                </p>
              </div>

              <Button
                type="button"
                size="lg"
                variant={done ? "secondary" : "default"}
                className={done ? "rounded-2xl" : "btn-gradient rounded-2xl text-white"}
                disabled={busyId === item.id}
                onClick={() => {
                  setActiveId(item.id);
                  requestAnimationFrame(() => inputRef.current?.click());
                }}
              >
                {busyId === item.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <UploadCloud className="h-4 w-4" aria-hidden="true" />
                )}
                {done ? "Replace" : "Upload"}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
