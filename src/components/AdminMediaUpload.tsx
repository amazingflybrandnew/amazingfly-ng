import { useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { createMediaUploadUrl } from "@/lib/admin-ops.functions";

type Folder = "hero" | "services" | "destinations" | "testimonials";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

/**
 * Uploads website imagery into the `site-media` bucket
 * (website/hero, website/services, website/destinations, website/testimonials)
 * and returns the public URL.
 */
export function AdminMediaUpload({
  folder,
  label,
  value,
  onChange,
}: {
  folder: Folder;
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const uploadUrlFn = useServerFn(createMediaUploadUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  async function upload(file: File) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setError("Please upload a JPG, PNG, WebP or AVIF image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Please keep website images at 5 MB or smaller.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const signed = await uploadUrlFn({ data: { folder, file_name: file.name } });
      if (!signed.ok) {
        setError(signed.message);
        return;
      }

      // Supabase signed uploads expect multipart FormData for browser File/Blob
      // bodies. Do not set Content-Type manually; the browser must add the
      // multipart boundary.
      const body = new FormData();
      body.append("cacheControl", "3600");
      body.append("", file);

      const response = await fetch(signed.uploadUrl, {
        method: "PUT",
        body,
        headers: { "x-upsert": "false" },
      });
      if (!response.ok) {
        setError("The image upload failed. Please try again.");
        return;
      }

      setPreviewFailed(false);
      onChange(signed.publicUrl);
    } catch {
      setError("The image upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/70 bg-white/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-navy-soft">
          {label}
        </span>
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin text-navy-soft" aria-hidden="true" />
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-tint to-peach-tint">
          {value && !previewFailed ? (
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
              onLoad={() => setPreviewFailed(false)}
              onError={() => setPreviewFailed(true)}
            />
          ) : (
            <ImagePlus className="h-5 w-5 text-navy-soft" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            aria-label={label}
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.currentTarget.value = "";
            }}
            className="block w-full text-xs text-navy-soft"
          />
          <input
            value={value}
            onChange={(event) => {
              setPreviewFailed(false);
              setError(null);
              onChange(event.target.value);
            }}
            placeholder="…or paste a direct image URL"
            aria-label={`${label} URL`}
            className="mt-2 w-full rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 text-xs text-navy outline-none focus:border-sky/60"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            For external URLs, use the direct image file URL rather than a gallery or webpage link.
          </p>
        </div>
      </div>

      {previewFailed ? (
        <p className="mt-2 text-xs font-medium text-coral">
          This URL does not load as an image. Upload a file or use a direct image URL.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs font-medium text-coral">{error}</p> : null}
    </div>
  );
}
