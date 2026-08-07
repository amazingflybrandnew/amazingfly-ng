import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SERVICE_CATEGORY_GROUPS, categoryTitle } from "@/lib/catalogue/service-categories";
import { formatNaira, type CatalogueItem } from "@/lib/catalogue/visa-catalogue";
import {
  deleteServicePackage,
  getAdminPackages,
  saveServicePackage,
  toggleServicePackage,
} from "@/lib/packages.functions";

export const Route = createFileRoute("/admin/packages")({
  head: () => ({
    meta: [
      { title: "Service Packages | Amazingfly.ng Admin" },
      {
        name: "description",
        content:
          "Create and manage the visa, document and travel service packages customers can select when starting a request.",
      },
      { property: "og:title", content: "Service Packages | Amazingfly.ng Admin" },
      {
        property: "og:description",
        content: "Define package name, destination, price, processing time and requirements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPackagesPage,
});

type Draft = {
  id?: string | undefined;
  category: string;
  country: string;
  flag: string;
  name: string;
  description: string;
  serviceType: string;
  price: number;
  priceFrom: boolean;
  processingTime: string;
  validity: string;
  requirementsText: string;
  optionalText: string;
  includesText: string;
  requiresQuote: boolean;
  active: boolean;
};

const EMPTY: Draft = {
  category: "visa",
  country: "",
  flag: "",
  name: "",
  description: "",
  serviceType: "Tourist",
  price: 0,
  priceFrom: false,
  processingTime: "",
  validity: "",
  requirementsText: "Passport datapage\nPassport photo",
  optionalText: "",
  includesText: "",
  requiresQuote: false,
  active: true,
};

const lines = (value: string) =>
  value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);

function toDraft(item: CatalogueItem): Draft {
  return {
    id: item.id,
    category: item.category,
    country: item.country,
    flag: item.flag ?? "",
    name: item.name,
    description: item.description ?? "",
    serviceType: item.serviceType,
    price: item.price,
    priceFrom: Boolean(item.priceFrom),
    processingTime: item.processingTime,
    validity: item.validity ?? "",
    requirementsText: item.requirements.join("\n"),
    optionalText: (item.optionalDocuments ?? []).join("\n"),
    includesText: (item.includes ?? []).join("\n"),
    requiresQuote: Boolean(item.requiresQuote),
    active: item.active,
  };
}

function AdminPackagesPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const fetchPackages = useServerFn(getAdminPackages);
  const saveFn = useServerFn(saveServicePackage);
  const toggleFn = useServerFn(toggleServicePackage);
  const deleteFn = useServerFn(deleteServicePackage);

  const packages = useQuery({
    queryKey: ["admin", "packages"],
    queryFn: () => fetchPackages(),
  });

  const rows = useMemo(() => {
    const all = packages.data ?? [];
    return categoryFilter === "all" ? all : all.filter((item) => item.category === categoryFilter);
  }, [packages.data, categoryFilter]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "packages"] });

  const save = useMutation({
    mutationFn: (value: Draft) =>
      saveFn({
        data: {
          ...(value.id ? { id: value.id } : {}),
          category: value.category,
          country: value.country,
          flag: value.flag,
          name: value.name,
          description: value.description,
          serviceType: value.serviceType,
          price: Number(value.price) || 0,
          priceFrom: value.priceFrom,
          processingTime: value.processingTime,
          validity: value.validity,
          requirements: lines(value.requirementsText),
          optionalDocuments: lines(value.optionalText),
          includes: lines(value.includesText),
          requiresQuote: value.requiresQuote,
          active: value.active,
        },
      }),
    onSuccess: (result) => {
      setFeedback(result.message ?? (result.ok ? "Package saved." : "Could not save the package."));
      if (result.ok) {
        setDraft(null);
        void refresh();
      }
    },
    onError: () => setFeedback("The package could not be saved."),
  });

  const toggle = useMutation({
    mutationFn: (value: { id: string; active: boolean }) => toggleFn({ data: value }),
    onSuccess: () => void refresh(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => void refresh(),
  });

  return (
    <AdminShell title="Service packages" description="Define the packages customers can choose.">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={categoryFilter === "all" ? "default" : "outline"}
          onClick={() => setCategoryFilter("all")}
        >
          All categories
        </Button>
        {SERVICE_CATEGORY_GROUPS.map((group) => (
          <Button
            key={group.key}
            type="button"
            size="sm"
            variant={categoryFilter === group.key ? "default" : "outline"}
            onClick={() => setCategoryFilter(group.key)}
          >
            {group.title}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          className="btn-gradient ml-auto text-white"
          onClick={() => {
            setFeedback(null);
            setDraft({ ...EMPTY, ...(categoryFilter !== "all" ? { category: categoryFilter } : {}) });
          }}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> New package
        </Button>
      </div>

      {feedback ? (
        <p className="mb-4 rounded-2xl border border-sky/40 bg-sky-tint px-4 py-3 text-sm font-semibold text-navy">
          {feedback}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {packages.isLoading ? (
          <div className="glass-card grid place-items-center rounded-3xl p-12">
            <Loader2 className="h-6 w-6 animate-spin text-navy" aria-hidden="true" />
          </div>
        ) : (
          <div className="glass-card overflow-hidden rounded-3xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/60 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Package</th>
                    <th className="px-5 py-3">Destination</th>
                    <th className="px-5 py-3">Price</th>
                    <th className="px-5 py-3">Processing</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                        No packages in this category yet.
                      </td>
                    </tr>
                  ) : null}
                  {rows.map((item) => (
                    <tr key={item.id} className="border-t border-white/50 align-top">
                      <td className="px-5 py-4">
                        <p className="font-bold text-navy">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {categoryTitle(item.category)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-navy-soft">
                        {item.flag ? `${item.flag} ` : ""}
                        {item.country}
                      </td>
                      <td className="px-5 py-4 font-semibold text-navy">
                        {item.requiresQuote || item.price <= 0
                          ? "Quotation"
                          : `${item.priceFrom ? "From " : ""}${formatNaira(item.price)}`}
                      </td>
                      <td className="px-5 py-4 text-navy-soft">{item.processingTime || "—"}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            item.active
                              ? "bg-mint-tint text-navy"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {item.active ? "Active" : "Inactive"}
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
                              setDraft(toDraft(item));
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => toggle.mutate({ id: item.id, active: !item.active })}
                          >
                            {item.active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label={`Remove ${item.name}`}
                            onClick={() => {
                              if (confirm(`Remove “${item.name}” from the catalogue?`)) {
                                remove.mutate(item.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
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
              Select a package to edit, or create a new one.
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
                {draft.id ? "Edit package" : "New package"}
              </h2>

              <Field label="Service category">
                <select
                  value={draft.category}
                  onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                  className="h-11 w-full rounded-2xl border border-white/60 bg-white/80 px-3 text-sm"
                >
                  {SERVICE_CATEGORY_GROUPS.map((group) => (
                    <option key={group.key} value={group.key}>
                      {group.title}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Package name">
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  required
                  className="rounded-2xl border-white/60 bg-white/80"
                />
              </Field>

              <div className="grid grid-cols-[2fr_1fr] gap-3">
                <Field label="Destination country">
                  <Input
                    value={draft.country}
                    onChange={(event) => setDraft({ ...draft, country: event.target.value })}
                    required
                    className="rounded-2xl border-white/60 bg-white/80"
                  />
                </Field>
                <Field label="Flag">
                  <Input
                    value={draft.flag}
                    onChange={(event) => setDraft({ ...draft, flag: event.target.value })}
                    placeholder="🇦🇪"
                    className="rounded-2xl border-white/60 bg-white/80"
                  />
                </Field>
              </div>

              <Field label="Customer description">
                <Textarea
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  rows={3}
                  className="rounded-2xl border-white/60 bg-white/80"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Service type">
                  <Input
                    value={draft.serviceType}
                    onChange={(event) => setDraft({ ...draft, serviceType: event.target.value })}
                    className="rounded-2xl border-white/60 bg-white/80"
                  />
                </Field>
                <Field label="Price (NGN)">
                  <Input
                    type="number"
                    min={0}
                    value={draft.price}
                    onChange={(event) =>
                      setDraft({ ...draft, price: Number(event.target.value) || 0 })
                    }
                    className="rounded-2xl border-white/60 bg-white/80"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Processing time">
                  <Input
                    value={draft.processingTime}
                    onChange={(event) =>
                      setDraft({ ...draft, processingTime: event.target.value })
                    }
                    placeholder="5 – 7 working days"
                    className="rounded-2xl border-white/60 bg-white/80"
                  />
                </Field>
                <Field label="Validity">
                  <Input
                    value={draft.validity}
                    onChange={(event) => setDraft({ ...draft, validity: event.target.value })}
                    placeholder="30 days"
                    className="rounded-2xl border-white/60 bg-white/80"
                  />
                </Field>
              </div>

              <Field label="Required documents (one per line)">
                <Textarea
                  value={draft.requirementsText}
                  onChange={(event) =>
                    setDraft({ ...draft, requirementsText: event.target.value })
                  }
                  rows={4}
                  className="rounded-2xl border-white/60 bg-white/80"
                />
              </Field>

              <Field label="Optional documents (one per line)">
                <Textarea
                  value={draft.optionalText}
                  onChange={(event) => setDraft({ ...draft, optionalText: event.target.value })}
                  rows={2}
                  className="rounded-2xl border-white/60 bg-white/80"
                />
              </Field>

              <Field label="Package includes (one per line)">
                <Textarea
                  value={draft.includesText}
                  onChange={(event) => setDraft({ ...draft, includesText: event.target.value })}
                  rows={2}
                  className="rounded-2xl border-white/60 bg-white/80"
                />
              </Field>

              <label className="flex items-center gap-2 text-sm font-semibold text-navy">
                <input
                  type="checkbox"
                  checked={draft.priceFrom}
                  onChange={(event) => setDraft({ ...draft, priceFrom: event.target.checked })}
                />
                Show price as a starting price (“from”)
              </label>

              <label className="flex items-center gap-2 text-sm font-semibold text-navy">
                <input
                  type="checkbox"
                  checked={draft.requiresQuote}
                  onChange={(event) => setDraft({ ...draft, requiresQuote: event.target.checked })}
                />
                Price is confirmed by a specialist (no fixed price)
              </label>

              <label className="flex items-center gap-2 text-sm font-semibold text-navy">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
                />
                Active — customers can select this package
              </label>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={save.isPending} className="btn-gradient text-white">
                  {save.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  Save package
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
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
