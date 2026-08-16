import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

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
import { featuredServiceImage, type FeaturedService } from "@/lib/featured-services";
import {
  createFeaturedServiceUploadUrl,
  getAdminFeaturedServices,
  removeAdminFeaturedService,
  reorderAdminFeaturedServices,
  saveAdminFeaturedService,
  toggleAdminFeaturedService,
} from "@/lib/featured-services.functions";

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

type Draft = Omit<FeaturedService, "id"> & { id?: string | undefined };

const EMPTY_DRAFT: Draft = {
  title: "",
  description: "",
  image_url: "",
  link_path: "",
  display_order: 0,
  is_active: true,
};

function AdminFeaturedServicesPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchItems = useServerFn(getAdminFeaturedServices);
  const saveFn = useServerFn(saveAdminFeaturedService);
  const removeFn = useServerFn(removeAdminFeaturedService);
  const toggleFn = useServerFn(toggleAdminFeaturedService);
  const reorderFn = useServerFn(reorderAdminFeaturedServices);

  const list = useQuery({
    queryKey: ["admin", "featured-services"],
    queryFn: () => fetchItems(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "featured-services"] });
    void queryClient.invalidateQueries({ queryKey: ["featured-services"] });
  };

  const save = useMutation({
    mutationFn: (value: Draft) => saveFn({ data: value }),
    onSuccess: (result) => {
      setFeedback(result.ok ? "Featured service saved." : (result.message ?? "Could not save."));
      if (result.ok) setDraft(null);
      invalidate();
    },
    onError: () => setFeedback("Could not save the featured service."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: (result) => {
      setFeedback(result.ok ? "Featured service removed." : (result.message ?? "Could not remove."));
      invalidate();
    },
    onError: () => setFeedback("Could not remove the featured service."),
  });

  const toggle = useMutation({
    mutationFn: (value: { id: string; is_active: boolean }) => toggleFn({ data: value }),
    onSuccess: (result) => {
      setFeedback(result.ok ? "Homepage visibility updated." : (result.message ?? "Could not update."));
      invalidate();
    },
    onError: () => setFeedback("Could not update homepage visibility."),
  });

  const reorder = useMutation({
    mutationFn: (items: Array<{ id: string; display_order: number }>) =>
      reorderFn({ data: { items } }),
    onSuccess: (result) => {
      setFeedback(result.ok ? "Featured service order updated." : (result.message ?? "Could not reorder."));
      invalidate();
    },
    onError: () => setFeedback("Could not reorder the featured services."),
  });

  const sorted = (list.data ?? []).slice().sort((a, b) => a.display_order - b.display_order);

  const move = (id: string, direction: -1 | 1) => {
    const next = sorted.slice();
    const index = next.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= next.length) return;
    const currentItem = next[index]!;
    next[index] = next[target]!;
    next[target] = currentItem;
    reorder.mutate(next.map((item, position) => ({ id: item.id, display_order: position + 1 })));
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
      <div className="rounded-2xl border border-mint/30 bg-mint-tint p-4 text-sm font-medium text-navy">
        Changes made here are saved to the website CMS and reflected on the homepage after refresh.
      </div>

      {feedback ? (
        <p className="mt-4 rounded-2xl border border-border bg-white/75 px-4 py-3 text-sm text-navy">
          {feedback}
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        {list.isPending ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
          </div>
        ) : list.isError ? (
          <p className="rounded-3xl border border-coral/30 bg-coral-tint p-6 text-sm text-navy">
            Featured services could not be loaded. Please refresh and try again.
          </p>
        ) : (
          sorted.map((item, index) => {
            const image = featuredServiceImage(item);
            return (
              <article
                key={item.id}
                className="flex flex-col gap-4 rounded-3xl border border-border bg-white/80 p-4 shadow-card md:flex-row md:items-center"
              >
                <span className="grid h-20 w-28 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-tint to-peach-tint">
                  {image ? (
                    <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
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
                      disabled={index === 0 || reorder.isPending}
                      onClick={() => move(item.id, -1)}
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Move ${item.title} down`}
                      disabled={index === sorted.length - 1 || reorder.isPending}
                      onClick={() => move(item.id, 1)}
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <Switch
                    checked={item.is_active}
                    disabled={toggle.isPending}
                    onCheckedChange={(checked) => toggle.mutate({ id: item.id, is_active: checked })}
                    aria-label={`Toggle ${item.title}`}
                  />
                  <Button variant="outline" size="sm" onClick={() => setDraft({ ...item })}>
                    <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Delete ${item.title}? This cannot be undone.`)) {
                        remove.mutate(item.id);
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4 text-coral" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </article>
            );
          })
        )}

        {!list.isPending && !list.isError && sorted.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No featured services yet. Add your first card.
          </p>
        ) : null}
      </div>

      <Dialog
        open={Boolean(draft)}
        onOpenChange={(open) => {
          if (!open) setDraft(null);
        }}
      >
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

              <FeaturedServiceImageUpload
                value={draft.image_url}
                fallback={featuredServiceImage(draft)}
                onChange={(url) => setDraft({ ...draft, image_url: url })}
              />

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
                    min={0}
                    max={999}
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
            <Button
              onClick={() => {
                if (draft) {
                  setFeedback(null);
                  save.mutate(draft);
                }
              }}
              disabled={!draft?.title.trim() || !draft?.link_path.trim() || save.isPending}
            >
              {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function FeaturedServiceImageUpload({
  value,
  fallback,
  onChange,
}: {
  value: string;
  fallback: string;
  onChange: (url: string) => void;
}) {
  const uploadUrlFn = useServerFn(createFeaturedServiceUploadUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = value || fallback;

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const signed = await uploadUrlFn({ data: { file_name: file.name } });
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
    } catch {
      setError("The image upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="fs-image">Card image</Label>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-white/70 p-3">
        <span className="grid h-16 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-tint to-peach-tint">
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-5 w-5 text-navy-soft" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <input
              id="fs-image"
              type="file"
              accept="image/*"
              disabled={busy}
              className="block min-w-0 flex-1 text-xs text-navy-soft"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            {busy ? <Loader2 className="h-4 w-4 animate-spin text-navy-soft" aria-hidden="true" /> : null}
          </div>
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="…or paste an image URL"
            aria-label="Image URL"
          />
          {error ? <p className="text-xs font-medium text-coral">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
