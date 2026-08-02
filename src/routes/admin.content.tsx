import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createMediaUploadUrl,
  getSiteContent,
  removeAdminTestimonial,
  saveAdminTestimonial,
  updateSiteContent,
} from "@/lib/admin-ops.functions";

export const Route = createFileRoute("/admin/content")({
  head: () => ({
    meta: [
      { title: "Website Content | Amazingfly.ng Admin" },
      {
        name: "description",
        content:
          "Staff tools to edit the Amazingfly Travels homepage headline, about copy, contact details and customer testimonials.",
      },
      { property: "og:title", content: "Website Content | Amazingfly.ng Admin" },
      { property: "og:description", content: "Update website copy without touching code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminContentPage,
});

const FIELDS: { key: string; label: string; multiline?: boolean }[] = [
  { key: "hero_headline", label: "Homepage headline" },
  { key: "hero_subheadline", label: "Homepage sub-headline", multiline: true },
  { key: "hero_cta_label", label: "Homepage button label" },
  { key: "hero_image_url", label: "Homepage hero image URL" },
  { key: "about_heading", label: "About heading" },
  { key: "about_body", label: "About copy", multiline: true },
  { key: "why_choose_us", label: "Why choose us (one point per line)", multiline: true },
  { key: "contact_phone", label: "Contact phone" },
  { key: "contact_whatsapp", label: "WhatsApp number" },
  { key: "contact_email", label: "Contact email" },
  { key: "office_address", label: "Office address", multiline: true },
  { key: "business_hours", label: "Business hours" },
  { key: "facebook_url", label: "Facebook URL" },
  { key: "instagram_url", label: "Instagram URL" },
  { key: "x_url", label: "X (Twitter) URL" },
];

type TestimonialDraft = {
  id?: string | undefined;
  name: string;
  location: string;
  quote: string;
  rating: number;
  is_active: boolean;
  display_order: number;
};

function AdminContentPage() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [testimonial, setTestimonial] = useState<TestimonialDraft | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchContent = useServerFn(getSiteContent);
  const saveContentFn = useServerFn(updateSiteContent);
  const saveTestimonialFn = useServerFn(saveAdminTestimonial);
  const removeTestimonialFn = useServerFn(removeAdminTestimonial);
  const uploadUrlFn = useServerFn(createMediaUploadUrl);

  const content = useQuery({ queryKey: ["admin", "content"], queryFn: () => fetchContent() });

  useEffect(() => {
    if (!content.data) return;
    const next: Record<string, string> = {};
    content.data.content.forEach((item) => {
      next[item.key] = item.value;
    });
    setValues(next);
  }, [content.data]);

  const saveContent = useMutation({
    mutationFn: () =>
      saveContentFn({
        data: { entries: FIELDS.map((field) => ({ key: field.key, value: values[field.key] ?? "" })) },
      }),
    onSuccess: (result) => {
      setFeedback(result.ok ? "Website content saved." : (result.message ?? "Could not save."));
      void queryClient.invalidateQueries({ queryKey: ["admin", "content"] });
    },
    onError: () => setFeedback("Could not save the content."),
  });

  const saveTestimonial = useMutation({
    mutationFn: (draft: TestimonialDraft) => saveTestimonialFn({ data: draft }),
    onSuccess: (result) => {
      setFeedback(result.ok ? "Testimonial saved." : (result.message ?? "Could not save."));
      if (result.ok) setTestimonial(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "content"] });
    },
  });

  const removeTestimonial = useMutation({
    mutationFn: (id: string) => removeTestimonialFn({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "content"] }),
  });

  async function uploadHero(file: File) {
    setUploading(true);
    setFeedback(null);
    try {
      const signed = await uploadUrlFn({ data: { folder: "hero", file_name: file.name } });
      if (!signed.ok) {
        setFeedback(signed.message);
        return;
      }
      const response = await fetch(signed.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "content-type": file.type || "application/octet-stream" },
      });
      if (!response.ok) {
        setFeedback("The image upload failed.");
        return;
      }
      setValues((current) => ({ ...current, hero_image_url: signed.publicUrl }));
      setFeedback("Image uploaded — remember to save.");
    } finally {
      setUploading(false);
    }
  }

  const testimonials = content.data?.testimonials ?? [];

  return (
    <AdminShell
      title="Website content"
      subtitle="Edit homepage copy, contact details and testimonials. Only publish testimonials from real customers."
    >
      {feedback ? (
        <p className="glass-card mb-5 rounded-2xl px-5 py-3 text-sm text-navy">{feedback}</p>
      ) : null}

      {content.isPending ? (
        <div className="glass-card flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <form
            className="glass-card space-y-4 rounded-3xl p-6"
            onSubmit={(event) => {
              event.preventDefault();
              setFeedback(null);
              saveContent.mutate();
            }}
          >
            <h2 className="text-lg font-extrabold text-navy">Homepage &amp; contact details</h2>

            {FIELDS.map((field) => (
              <label key={field.key} className="block">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-navy-soft">
                  {field.label}
                </span>
                <div className="mt-1.5">
                  {field.multiline ? (
                    <Textarea
                      value={values[field.key] ?? ""}
                      onChange={(event) =>
                        setValues({ ...values, [field.key]: event.target.value })
                      }
                      rows={3}
                      className="rounded-2xl border-white/60 bg-white/80"
                    />
                  ) : (
                    <Input
                      value={values[field.key] ?? ""}
                      onChange={(event) =>
                        setValues({ ...values, [field.key]: event.target.value })
                      }
                      className="rounded-2xl border-white/60 bg-white/80"
                    />
                  )}
                </div>
              </label>
            ))}

            <div>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-navy-soft">
                Upload a hero image
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadHero(file);
                }}
                className="mt-1.5 block w-full text-sm text-navy-soft"
              />
              {uploading ? (
                <p className="mt-1 text-xs text-muted-foreground">Uploading…</p>
              ) : null}
            </div>

            <Button type="submit" disabled={saveContent.isPending} className="btn-gradient text-white">
              {saveContent.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Save content
            </Button>
          </form>

          <section className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-navy">Testimonials</h2>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setTestimonial({
                    name: "",
                    location: "",
                    quote: "",
                    rating: 5,
                    is_active: true,
                    display_order: testimonials.length + 1,
                  })
                }
              >
                <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Add
              </Button>
            </div>

            <ul className="mt-4 space-y-2">
              {testimonials.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  No testimonials yet. Only add reviews you have received from real customers.
                </li>
              ) : (
                testimonials.map((item) => (
                  <li key={item.id} className="rounded-2xl border border-white/70 bg-white/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-navy">
                          {item.name}
                          {item.location ? ` · ${item.location}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.quote}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setTestimonial({ ...item })}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`Remove testimonial from ${item.name}`}
                          onClick={() => removeTestimonial.mutate(item.id)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>

            {testimonial ? (
              <form
                className="mt-5 space-y-3 border-t border-white/60 pt-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  setFeedback(null);
                  saveTestimonial.mutate(testimonial);
                }}
              >
                <Input
                  value={testimonial.name}
                  onChange={(event) =>
                    setTestimonial({ ...testimonial, name: event.target.value })
                  }
                  placeholder="Customer name"
                  aria-label="Customer name"
                  required
                  className="rounded-2xl border-white/60 bg-white/80"
                />
                <Input
                  value={testimonial.location}
                  onChange={(event) =>
                    setTestimonial({ ...testimonial, location: event.target.value })
                  }
                  placeholder="Location (optional)"
                  aria-label="Location"
                  className="rounded-2xl border-white/60 bg-white/80"
                />
                <Textarea
                  value={testimonial.quote}
                  onChange={(event) =>
                    setTestimonial({ ...testimonial, quote: event.target.value })
                  }
                  rows={3}
                  placeholder="What the customer said"
                  aria-label="Testimonial"
                  required
                  className="rounded-2xl border-white/60 bg-white/80"
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={saveTestimonial.isPending}
                    className="btn-gradient text-white"
                  >
                    Save testimonial
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setTestimonial(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : null}
          </section>
        </div>
      )}
    </AdminShell>
  );
}
