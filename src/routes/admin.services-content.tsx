import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Loader2, Plus, Trash2 } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { AdminMediaUpload } from "@/components/AdminMediaUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getAdminServiceContent,
  removeAdminServiceContent,
  saveAdminServiceContent,
  type ServiceContentRow,
} from "@/lib/cms.functions";

export const Route = createFileRoute("/admin/services-content")({
  head: () => ({
    meta: [
      { title: "Service Content | Amazingfly.ng Admin" },
      {
        name: "description",
        content:
          "Staff tools to edit the titles, descriptions, requirements and imagery for visa, flight, hotel, insurance and travel document services.",
      },
      { property: "og:title", content: "Service Content | Amazingfly.ng Admin" },
      { property: "og:description", content: "Edit the written content of every Amazingfly service." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminServiceContentPage,
});

type Draft = {
  id?: string | undefined;
  service_id: string | null;
  slug: string;
  title: string;
  description: string;
  requirements: string;
  image_url: string;
  is_active: boolean;
  display_order: number;
};

const EMPTY: Draft = {
  service_id: null,
  slug: "",
  title: "",
  description: "",
  requirements: "",
  image_url: "",
  is_active: true,
  display_order: 0,
};

function toDraft(row: ServiceContentRow): Draft {
  return {
    id: row.id,
    service_id: row.service_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    requirements: row.requirements,
    image_url: row.image_url,
    is_active: row.is_active,
    display_order: row.display_order,
  };
}

function AdminServiceContentPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchContent = useServerFn(getAdminServiceContent);
  const saveFn = useServerFn(saveAdminServiceContent);
  const removeFn = useServerFn(removeAdminServiceContent);

  const data = useQuery({
    queryKey: ["admin", "service-content"],
    queryFn: () => fetchContent(),
  });

  const save = useMutation({
    mutationFn: (value: Draft) => saveFn({ data: value }),
    onSuccess: (result) => {
      setFeedback(result.ok ? "Service content saved." : (result.message ?? "Could not save."));
      if (result.ok) setDraft(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "service-content"] });
    },
    onError: () => setFeedback("Could not save the service content."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "service-content"] }),
  });

  const entries = data.data?.entries ?? [];
  const services = data.data?.services ?? [];

  return (
    <AdminShell
      title="Service content"
      subtitle="Edit the wording, requirements and imagery for visas, flights, hotels, insurance and travel documents."
      actions={
        <Button
          type="button"
          className="btn-gradient text-white"
          onClick={() => setDraft({ ...EMPTY, display_order: entries.length + 1 })}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Add content block
        </Button>
      }
    >
      {feedback ? (
        <p className="glass-card mb-5 rounded-2xl px-5 py-3 text-sm text-navy">{feedback}</p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className="glass-card rounded-3xl p-6">
          <h2 className="text-lg font-extrabold text-navy">Service content blocks</h2>

          {data.isPending ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
            </div>
          ) : entries.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No service content yet. Add a block for each service — visa, flights, hotels, travel
              documents and insurance.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {entries.map((item) => (
                <li key={item.id} className="rounded-2xl border border-white/70 bg-white/75 p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-tint to-mint-tint">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <FileText className="h-5 w-5 text-navy-soft" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-navy">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.service_name || item.slug || "Not linked to a service"}
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                      <span
                        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${
                          item.is_active ? "bg-sky-tint text-navy" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(toDraft(item))}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`Remove ${item.title}`}
                        onClick={() => remove.mutate(item.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass-card h-fit rounded-3xl p-6">
          <h2 className="text-lg font-extrabold text-navy">
            {draft?.id ? "Edit content" : "New content block"}
          </h2>

          {draft ? (
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                setFeedback(null);
                save.mutate(draft);
              }}
            >
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-navy-soft">
                  Linked service
                </span>
                <select
                  value={draft.service_id ?? ""}
                  onChange={(event) => {
                    const id = event.target.value || null;
                    const match = services.find((service) => service.id === id);
                    setDraft({ ...draft, service_id: id, slug: match?.slug ?? draft.slug });
                  }}
                  className="mt-1.5 w-full rounded-2xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-semibold text-navy outline-none focus:border-sky/60"
                >
                  <option value="">Not linked</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>

              <Input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder="Title"
                aria-label="Title"
                required
                className="rounded-2xl border-white/60 bg-white/80"
              />
              <Textarea
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                rows={4}
                placeholder="Description"
                aria-label="Description"
                className="rounded-2xl border-white/60 bg-white/80"
              />
              <Textarea
                value={draft.requirements}
                onChange={(event) => setDraft({ ...draft, requirements: event.target.value })}
                rows={5}
                placeholder="Requirements — one per line"
                aria-label="Requirements"
                className="rounded-2xl border-white/60 bg-white/80"
              />

              <AdminMediaUpload
                folder="services"
                label="Service image"
                value={draft.image_url}
                onChange={(url) => setDraft({ ...draft, image_url: url })}
              />

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-navy-soft">
                    Display order
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={draft.display_order}
                    onChange={(event) =>
                      setDraft({ ...draft, display_order: Number(event.target.value) || 0 })
                    }
                    className="mt-1.5 rounded-2xl border-white/60 bg-white/80"
                  />
                </label>
                <label className="mt-6 flex items-center gap-2 text-sm font-semibold text-navy">
                  <input
                    type="checkbox"
                    checked={draft.is_active}
                    onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })}
                    className="h-4 w-4 rounded border-navy/30"
                  />
                  Active
                </label>
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={save.isPending} className="btn-gradient text-white">
                  {save.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  Save content
                </Button>
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Select a content block to edit, or add a new one.
            </p>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
