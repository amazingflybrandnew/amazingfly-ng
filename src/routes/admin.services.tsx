import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createMediaUploadUrl,
  getAdminServices,
  saveAdminService,
  toggleAdminService,
  type AdminService,
} from "@/lib/admin-ops.functions";

export const Route = createFileRoute("/admin/services")({
  head: () => ({
    meta: [
      { title: "Service Management | Amazingfly.ng Admin" },
      {
        name: "description",
        content:
          "Staff tools to add, edit, reorder and publish the travel services shown on the Amazingfly Travels website.",
      },
      { property: "og:title", content: "Service Management | Amazingfly.ng Admin" },
      {
        property: "og:description",
        content: "Control the services customers can request online.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminServicesPage,
});

type Draft = {
  id?: string | undefined;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  image_url: string;
  category: string;
  price_label: string;
  cta_label: string;
  active: boolean;
  display_order: number;
};

const EMPTY: Draft = {
  name: "",
  slug: "",
  short_description: "",
  description: "",
  image_url: "",
  category: "",
  price_label: "",
  cta_label: "Start a request",
  active: true,
  display_order: 0,
};

function toDraft(service: AdminService): Draft {
  return {
    id: service.id,
    name: service.name,
    slug: service.slug,
    short_description: service.short_description,
    description: service.description,
    image_url: service.image_url,
    category: service.category,
    price_label: service.price_label,
    cta_label: service.cta_label,
    active: service.active,
    display_order: service.display_order,
  };
}

function AdminServicesPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchServices = useServerFn(getAdminServices);
  const saveFn = useServerFn(saveAdminService);
  const toggleFn = useServerFn(toggleAdminService);
  const uploadUrlFn = useServerFn(createMediaUploadUrl);

  const services = useQuery({ queryKey: ["admin", "services"], queryFn: () => fetchServices() });

  const save = useMutation({
    mutationFn: (value: Draft) => saveFn({ data: value }),
    onSuccess: (result) => {
      if (!result.ok) {
        setFeedback(result.message ?? "The service could not be saved.");
        return;
      }
      setFeedback("Service saved.");
      setDraft(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "services"] });
    },
    onError: () => setFeedback("The service could not be saved."),
  });

  const toggle = useMutation({
    mutationFn: (value: { id: string; active: boolean }) => toggleFn({ data: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "services"] }),
  });

  async function uploadImage(file: File) {
    if (!draft) return;
    setUploading(true);
    setFeedback(null);
    try {
      const signed = await uploadUrlFn({ data: { folder: "services", file_name: file.name } });
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
        setFeedback("The image upload failed. Please try again.");
        return;
      }
      setDraft({ ...draft, image_url: signed.publicUrl });
      setFeedback("Image uploaded.");
    } finally {
      setUploading(false);
    }
  }

  const rows = services.data ?? [];

  return (
    <AdminShell
      title="Service management"
      subtitle="Add, edit, reorder and publish the services customers can request. Changes apply to the live website."
      actions={
        <Button
          type="button"
          onClick={() => {
            setFeedback(null);
            setDraft({ ...EMPTY, display_order: rows.length + 1 });
          }}
          className="btn-gradient text-white"
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New service
        </Button>
      }
    >
      {feedback ? (
        <p className="glass-card mb-5 rounded-2xl px-5 py-3 text-sm text-navy">{feedback}</p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        {services.isPending ? (
          <div className="glass-card flex items-center justify-center rounded-3xl p-16">
            <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
          </div>
        ) : (
          <div className="glass-card overflow-hidden rounded-3xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-white/70 text-[11px] uppercase tracking-[0.14em] text-navy-soft">
                    <th className="px-5 py-4 font-bold">Order</th>
                    <th className="px-5 py-4 font-bold">Service</th>
                    <th className="px-5 py-4 font-bold">Pricing note</th>
                    <th className="px-5 py-4 font-bold">Status</th>
                    <th className="px-5 py-4 font-bold" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((service) => (
                    <tr key={service.id} className="border-t border-white/60">
                      <td className="px-5 py-4 font-bold text-navy">{service.display_order}</td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-navy">{service.name}</p>
                        <p className="text-xs text-muted-foreground">/{service.slug}</p>
                      </td>
                      <td className="px-5 py-4 text-navy-soft">{service.price_label || "—"}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                            service.active
                              ? "border-mint/50 bg-mint-tint text-navy"
                              : "border-border bg-muted text-muted-foreground"
                          }`}
                        >
                          {service.active ? "Published" : "Hidden"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-navy"
                            onClick={() => {
                              setFeedback(null);
                              setDraft(toDraft(service));
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              toggle.mutate({ id: service.id, active: !service.active })
                            }
                          >
                            {service.active ? "Hide" : "Publish"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <aside className="glass-card rounded-3xl p-6">
          {!draft ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Select a service to edit, or create a new one.
            </p>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setFeedback(null);
                save.mutate(draft);
              }}
            >
              <h2 className="text-lg font-extrabold text-navy">
                {draft.id ? "Edit service" : "New service"}
              </h2>

              <Field label="Name">
                <Input
                  value={draft.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setDraft({
                      ...draft,
                      name,
                      slug:
                        draft.id || draft.slug
                          ? draft.slug
                          : name
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/^-|-$/g, ""),
                    });
                  }}
                  required
                  className="rounded-2xl border-white/60 bg-white/80"
                />
              </Field>

              <Field label="Slug">
                <Input
                  value={draft.slug}
                  onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
                  required
                  className="rounded-2xl border-white/60 bg-white/80"
                />
              </Field>

              <Field label="Short description">
                <Textarea
                  value={draft.short_description}
                  onChange={(event) =>
                    setDraft({ ...draft, short_description: event.target.value })
                  }
                  rows={2}
                  className="rounded-2xl border-white/60 bg-white/80"
                />
              </Field>

              <Field label="Full description">
                <Textarea
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  rows={5}
                  className="rounded-2xl border-white/60 bg-white/80"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <Input
                    value={draft.category}
                    onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                    className="rounded-2xl border-white/60 bg-white/80"
                  />
                </Field>
                <Field label="Display order">
                  <Input
                    type="number"
                    min={0}
                    value={draft.display_order}
                    onChange={(event) =>
                      setDraft({ ...draft, display_order: Number(event.target.value) || 0 })
                    }
                    className="rounded-2xl border-white/60 bg-white/80"
                  />
                </Field>
              </div>

              <Field label="Pricing note (no fixed prices required)">
                <Input
                  value={draft.price_label}
                  onChange={(event) => setDraft({ ...draft, price_label: event.target.value })}
                  placeholder="Quotation on request"
                  className="rounded-2xl border-white/60 bg-white/80"
                />
              </Field>

              <Field label="Service image">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadImage(file);
                  }}
                  className="block w-full text-sm text-navy-soft"
                />
                {uploading ? (
                  <p className="mt-1 text-xs text-muted-foreground">Uploading…</p>
                ) : draft.image_url ? (
                  <img
                    src={draft.image_url}
                    alt={`${draft.name} illustration`}
                    className="mt-2 h-24 w-full rounded-2xl object-cover"
                  />
                ) : null}
              </Field>

              <label className="flex items-center gap-2 text-sm font-semibold text-navy">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
                />
                Published on the website
              </label>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={save.isPending} className="btn-gradient text-white">
                  {save.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  Save service
                </Button>
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-navy-soft">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
