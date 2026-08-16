import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SAMPLE_FEATURED_SERVICES, type FeaturedService } from "@/lib/featured-services";

export const Route = createFileRoute("/admin/featured-services")({
  head: () => ({
    meta: [
      { title: "Featured Services | Amazingfly.ng Admin" },
      {
        name: "description",
        content:
          "Staff interface to curate the featured service cards shown in the Amazingfly.ng homepage carousel.",
      },
      { property: "og:title", content: "Featured Services | Amazingfly.ng Admin" },
      {
        property: "og:description",
        content: "Curate the homepage featured services carousel on Amazingfly.ng.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminFeaturedServicesPage,
});

type Draft = Omit<FeaturedService, "id"> & { id?: string };

const EMPTY_DRAFT: Draft = {
  title: "",
  description: "",
  image_url: "",
  link_path: "",
  display_order: 0,
  is_active: true,
};

/**
 * UI-only admin screen. All state is local/mock so a backend can later replace
 * the handlers below with real CRUD calls without changing the layout.
 */
function AdminFeaturedServicesPage() {
  const [items, setItems] = useState<FeaturedService[]>(SAMPLE_FEATURED_SERVICES);
  const [draft, setDraft] = useState<Draft | null>(null);

  const sorted = items.slice().sort((a, b) => a.display_order - b.display_order);

  const save = () => {
    if (!draft) return;
    setItems((current) =>
      draft.id
        ? current.map((item) =>
            item.id === draft.id ? ({ ...item, ...draft, id: draft.id } as FeaturedService) : item,
          )
        : [...current, { ...draft, id: `local-${Date.now()}` } as FeaturedService],
    );
    setDraft(null);
  };

  const remove = (id: string) => setItems((current) => current.filter((item) => item.id !== id));

  const toggleActive = (id: string) =>
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, is_active: !item.is_active } : item)),
    );

  const move = (id: string, direction: -1 | 1) => {
    const ordered = items.slice().sort((a, b) => a.display_order - b.display_order);
    const index = ordered.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const a = ordered[index]!;
    const b = ordered[target]!;
    const swapped = ordered.map((item) => {
      if (item.id === a.id) return { ...item, display_order: b.display_order };
      if (item.id === b.id) return { ...item, display_order: a.display_order };
      return item;
    });
    setItems(swapped);
  };

  return (
    <AdminShell
      title="Featured services"
      subtitle="Curate the “What we can help you with” carousel on the homepage."
      actions={
        <Button
          onClick={() =>
            setDraft({ ...EMPTY_DRAFT, display_order: (sorted.at(-1)?.display_order ?? 0) + 1 })
          }
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add service
        </Button>
      }
    >
      <div className="rounded-2xl border border-orange/30 bg-orange-tint p-4 text-sm font-medium text-navy">
        Interface preview only — changes here are not saved yet.
      </div>

      <div className="mt-6 space-y-4">
        {sorted.map((item, index) => (
          <article
            key={item.id}
            className="flex flex-col gap-4 rounded-3xl border border-border bg-white/80 p-4 shadow-card md:flex-row md:items-center"
          >
            <span className="grid h-20 w-28 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-tint to-peach-tint">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImagePlus className="h-5 w-5 text-navy-soft" aria-hidden="true" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-navy">{item.title}</h2>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] ${
                    item.is_active
                      ? "border-mint/50 bg-mint-tint text-navy"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {item.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
              <p className="mt-2 text-xs font-semibold text-navy-soft">
                {item.link_path} · order {item.display_order}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Move ${item.title} up`}
                  disabled={index === 0}
                  onClick={() => move(item.id, -1)}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Move ${item.title} down`}
                  disabled={index === sorted.length - 1}
                  onClick={() => move(item.id, 1)}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <Switch
                checked={item.is_active}
                onCheckedChange={() => toggleActive(item.id)}
                aria-label={`Toggle ${item.title}`}
              />
              <Button variant="outline" size="sm" onClick={() => setDraft({ ...item })}>
                <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => remove(item.id)}>
                <Trash2 className="mr-2 h-4 w-4 text-coral" aria-hidden="true" />
                Delete
              </Button>
            </div>
          </article>
        ))}

        {sorted.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No featured services yet. Add your first card.
          </p>
        ) : null}
      </div>

      <Dialog open={Boolean(draft)} onOpenChange={(open) => (open ? null : setDraft(null))}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit featured service" : "Add featured service"}</DialogTitle>
            <DialogDescription>
              These fields map directly to the homepage carousel card.
            </DialogDescription>
          </DialogHeader>

          {draft ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fs-title">Title</Label>
                <Input
                  id="fs-title"
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder="Visa Applications"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fs-description">Description</Label>
                <Textarea
                  id="fs-description"
                  rows={3}
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  placeholder="Short summary shown on the card."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fs-image">Card image</Label>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-white/70 p-3">
                  <span className="grid h-16 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-tint to-peach-tint">
                    {draft.image_url ? (
                      <img src={draft.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus className="h-5 w-5 text-navy-soft" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      id="fs-image"
                      type="file"
                      accept="image/*"
                      className="block w-full text-xs text-navy-soft"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        // Preview only — no upload is performed in this UI stage.
                        if (file) setDraft({ ...draft, image_url: URL.createObjectURL(file) });
                      }}
                    />
                    <Input
                      value={draft.image_url}
                      onChange={(event) => setDraft({ ...draft, image_url: event.target.value })}
                      placeholder="…or paste an image URL"
                      aria-label="Image URL"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fs-link">Internal link path</Label>
                  <Input
                    id="fs-link"
                    value={draft.link_path}
                    onChange={(event) => setDraft({ ...draft, link_path: event.target.value })}
                    placeholder="/services/visa-assistance"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fs-order">Display order</Label>
                  <Input
                    id="fs-order"
                    type="number"
                    value={draft.display_order}
                    onChange={(event) =>
                      setDraft({ ...draft, display_order: Number(event.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border bg-white/70 px-4 py-3">
                <Label htmlFor="fs-active" className="text-sm font-semibold text-navy">
                  Active on homepage
                </Label>
                <Switch
                  id="fs-active"
                  checked={draft.is_active}
                  onCheckedChange={(checked) => setDraft({ ...draft, is_active: checked })}
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!draft?.title || !draft?.link_path}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
