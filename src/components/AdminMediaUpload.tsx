import { useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { createMediaUploadUrl } from "@/lib/admin-ops.functions";

type Folder = "hero" | "services" | "destinations" | "testimonials";

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

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const signed = await uploadUrlFn({ data: { folder, file_name: file.name } });
      if (!signed.ok) {
        setError(signed.message);
        return;
      }
      const response = await fetch(signed.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "content-type": file.type || "application/octet-stream" },
      });
      if (!response.ok) {
        setError("The image upload failed. Please try again.");
        return;
      }
      onChange(signed.publicUrl);
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
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-5 w-5 text-navy-soft" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <input
            type="file"
            accept="image/*"
            aria-label={label}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
            className="block w-full text-xs text-navy-soft"
          />
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="…or paste an image URL"
            aria-label={`${label} URL`}
            className="mt-2 w-full rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 text-xs text-navy outline-none focus:border-sky/60"
          />
        </div>
      </div>

      {error ? <p className="mt-2 text-xs font-medium text-coral">{error}</p> : null}
    </div>
  );
}
