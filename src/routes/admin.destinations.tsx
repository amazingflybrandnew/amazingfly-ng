import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Globe2, Loader2, Plus, Trash2 } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { AdminMediaUpload } from "@/components/AdminMediaUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getAdminDestinations,
  removeAdminDestination,
  saveAdminDestination,
  type Destination,
} from "@/lib/cms.functions";

export const Route = createFileRoute("/admin/destinations")({
  head: () => ({
    meta: [
      { title: "Destination Management | Amazingfly.ng Admin" },
      {
        name: "description",
        content:
          "Staff tools to manage the destination countries, imagery and available travel services shown on Amazingfly.ng.",
      },
      { property: "og:title", content: "Destination Management | Amazingfly.ng Admin" },
      { property: "og:description", content: "Add and edit destination countries and their services." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDestinationsPage,
});

type Draft = Omit<Destination, "id"> & { id?: string | undefined };

const SERVICE_OPTIONS = [
  "Visa Assistance",
  "Flight Reservations",
  "Hotel Reservations",
  "Travel Insurance",
  "Proof of Funds Guidance",
  "Police Character Certificate",
  "Yellow Fever Card",
];

const EMPTY: Draft = {
  country: "",
  title: "",
  description: "",
  image_url: "",
  services: [],
  status: true,
  display_order: 0,
};

function AdminDestinationsPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchDestinations = useServerFn(getAdminDestinations);
  const saveFn = useServerFn(saveAdminDestination);
  const removeFn = useServerFn(removeAdminDestination);

  const list = useQuery({
    queryKey: ["admin", "destinations"],
    queryFn: () => fetchDestinations(),
  });

  const save = useMutation({
    mutationFn: (value: Draft) => saveFn({ data: value }),
    onSuccess: (result) => {
      setFeedback(result.ok ? "Destination saved." : (result.message ?? "Could not save."));
      if (result.ok) setDraft(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "destinations"] });
    },
    onError: () => setFeedback("Could not save the destination."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "destinations"] }),
  });

  const destinations = list.data ?? [];

  return (
    <AdminShell
      title="Destinations"
      subtitle="Manage the destination countries, imagery and the services available for each one."
      actions={
        <Button
          type="button"
          className="btn-gradient text-white"
          onClick={() => setDraft({ ...EMPTY, display_order: destinations.length + 1 })}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Add destination
        </Button>
      }
    >
      {feedback ? (
        <p className="glass-card mb-5 rounded-2xl px-5 py-3 text-sm text-navy">{feedback}</p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className="glass-card rounded-3xl p-6">
          <h2 className="text-lg font-extrabold text-navy">Published destinations</h2>

          {list.isPending ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
            </div>
          ) : destinations.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No destinations yet. Add the countries you support, e.g. United Kingdom, Canada, USA
              or the Schengen countries.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {destinations.map((item) => (
                <li
                  key={item.id}
                  className="hover-lift rounded-2xl border border-white/70 bg-white/75 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-tint to-lavender-tint">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Globe2 className="h-5 w-5 text-navy-soft" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-navy">{item.country}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.title || "No headline"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${
                            item.status
                              ? "bg-sky-tint text-navy"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {item.status ? "Active" : "Hidden"}
                        </span>
                        {item.services.slice(0, 3).map((service) => (
                          <span
                            key={service}
                            className="rounded-full bg-peach-tint px-2 py-0.5 text-[10px] font-semibold text-navy"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setDraft({ ...item })}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${item.country}`}
                      onClick={() => remove.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass-card h-fit rounded-3xl p-6">
          <h2 className="text-lg font-extrabold text-navy">
            {draft?.id ? "Edit destination" : "New destination"}
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
                value={draft.country}
                onChange={(event) => setDraft({ ...draft, country: event.target.value })}
                placeholder="Country (e.g. United Kingdom)"
                aria-label="Country"
                required
                className="rounded-2xl border-white/60 bg-white/80"
              />
              <Input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder="Destination name / headline"
                aria-label="Destination name"
                className="rounded-2xl border-white/60 bg-white/80"
              />
              <Textarea
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                rows={4}
                placeholder="Short description of the destination"
                aria-label="Description"
                className="rounded-2xl border-white/60 bg-white/80"
              />

              <AdminMediaUpload
                folder="destinations"
                label="Destination image"
                value={draft.image_url}
                onChange={(url) => setDraft({ ...draft, image_url: url })}
              />

              <fieldset>
                <legend className="text-[11px] font-bold uppercase tracking-[0.14em] text-navy-soft">
                  Available services
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SERVICE_OPTIONS.map((service) => {
                    const checked = draft.services.includes(service);
                    return (
                      <button
                        key={service}
                        type="button"
                        aria-pressed={checked}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            services: checked
                              ? draft.services.filter((item) => item !== service)
                              : [...draft.services, service],
                          })
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          checked
                            ? "border-transparent bg-gradient-to-r from-sky to-orange text-white"
                            : "border-white/70 bg-white/80 text-navy hover:border-sky/50"
                        }`}
                      >
                        {service}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

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
                    checked={draft.status}
                    onChange={(event) => setDraft({ ...draft, status: event.target.checked })}
                    className="h-4 w-4 rounded border-navy/30"
                  />
                  Active on the website
                </label>
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={save.isPending} className="btn-gradient text-white">
                  {save.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  Save destination
                </Button>
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Select a destination to edit, or add a new one.
            </p>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
