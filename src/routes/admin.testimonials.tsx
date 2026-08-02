import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Star, Trash2, UserRound } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { AdminMediaUpload } from "@/components/AdminMediaUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getCmsTestimonials,
  removeCmsTestimonialFn,
  saveCmsTestimonialFn,
  type CmsTestimonial,
} from "@/lib/cms.functions";

export const Route = createFileRoute("/admin/testimonials")({
  head: () => ({
    meta: [
      { title: "Testimonials | Amazingfly.ng Admin" },
      {
        name: "description",
        content:
          "Staff tools to add, edit and remove genuine customer testimonials shown on the Amazingfly Travels website.",
      },
      { property: "og:title", content: "Testimonials | Amazingfly.ng Admin" },
      { property: "og:description", content: "Publish real customer reviews on Amazingfly.ng." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminTestimonialsPage,
});

type Draft = Omit<CmsTestimonial, "id"> & { id?: string | undefined };

const EMPTY: Draft = {
  customer_name: "",
  country: "",
  review: "",
  rating: 5,
  image_url: "",
  is_active: true,
  display_order: 0,
};

function AdminTestimonialsPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchTestimonials = useServerFn(getCmsTestimonials);
  const saveFn = useServerFn(saveCmsTestimonialFn);
  const removeFn = useServerFn(removeCmsTestimonialFn);

  const list = useQuery({
    queryKey: ["admin", "testimonials"],
    queryFn: () => fetchTestimonials(),
  });

  const save = useMutation({
    mutationFn: (value: Draft) => saveFn({ data: value }),
    onSuccess: (result) => {
      setFeedback(result.ok ? "Testimonial saved." : (result.message ?? "Could not save."));
      if (result.ok) setDraft(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "testimonials"] });
    },
    onError: () => setFeedback("Could not save the testimonial."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "testimonials"] }),
  });

  const testimonials = list.data ?? [];

  return (
    <AdminShell
      title="Testimonials"
      subtitle="Only publish reviews you have actually received from real customers."
      actions={
        <Button
          type="button"
          className="btn-gradient text-white"
          onClick={() => setDraft({ ...EMPTY, display_order: testimonials.length + 1 })}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Add testimonial
        </Button>
      }
    >
      {feedback ? (
        <p className="glass-card mb-5 rounded-2xl px-5 py-3 text-sm text-navy">{feedback}</p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className="glass-card rounded-3xl p-6">
          <h2 className="text-lg font-extrabold text-navy">Customer reviews</h2>

          {list.isPending ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
            </div>
          ) : testimonials.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No testimonials yet. Add reviews only once real customers have given them to you.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {testimonials.map((item) => (
                <li key={item.id} className="rounded-2xl border border-white/70 bg-white/75 p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-lavender-tint to-peach-tint">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <UserRound className="h-5 w-5 text-navy-soft" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-navy">
                        {item.customer_name}
                        {item.country ? ` · ${item.country}` : ""}
                      </p>
                      <span className="mt-0.5 flex items-center gap-0.5" aria-label={`${item.rating} out of 5`}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${
                              star <= item.rating ? "fill-orange text-orange" : "text-navy/20"
                            }`}
                            aria-hidden="true"
                          />
                        ))}
                      </span>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {item.review}
                      </p>
                      {!item.is_active ? (
                        <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                          Hidden
                        </span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setDraft({ ...item })}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`Remove testimonial from ${item.customer_name}`}
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
            {draft?.id ? "Edit testimonial" : "New testimonial"}
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
              <Input
                value={draft.customer_name}
                onChange={(event) => setDraft({ ...draft, customer_name: event.target.value })}
                placeholder="Customer name"
                aria-label="Customer name"
                required
                className="rounded-2xl border-white/60 bg-white/80"
              />
              <Input
                value={draft.country}
                onChange={(event) => setDraft({ ...draft, country: event.target.value })}
                placeholder="Country"
                aria-label="Country"
                className="rounded-2xl border-white/60 bg-white/80"
              />
              <Textarea
                value={draft.review}
                onChange={(event) => setDraft({ ...draft, review: event.target.value })}
                rows={4}
                placeholder="What the customer said"
                aria-label="Review"
                required
                className="rounded-2xl border-white/60 bg-white/80"
              />

              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-navy-soft">
                  Rating
                </span>
                <div className="mt-1.5 flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      aria-label={`${star} star${star > 1 ? "s" : ""}`}
                      aria-pressed={draft.rating === star}
                      onClick={() => setDraft({ ...draft, rating: star })}
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= draft.rating ? "fill-orange text-orange" : "text-navy/20"
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              </div>

              <AdminMediaUpload
                folder="testimonials"
                label="Customer photo"
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
                  Show on website
                </label>
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={save.isPending} className="btn-gradient text-white">
                  {save.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  Save testimonial
                </Button>
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Select a testimonial to edit, or add a new one.
            </p>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
