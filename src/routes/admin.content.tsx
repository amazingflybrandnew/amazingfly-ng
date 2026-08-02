import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { AdminMediaUpload } from "@/components/AdminMediaUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSiteContent, updateSiteContent } from "@/lib/admin-ops.functions";

export const Route = createFileRoute("/admin/content")({
  head: () => ({
    meta: [
      { title: "Website Content | Amazingfly.ng Admin" },
      {
        name: "description",
        content:
          "Staff tools to edit the Amazingfly Travels homepage hero, rotating headlines, imagery, about copy and contact details.",
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

type Field = { key: string; label: string; multiline?: boolean; hint?: string };

const HERO_FIELDS: Field[] = [
  { key: "hero_badge", label: "Hero badge text" },
  { key: "hero_headline", label: "Hero headline", hint: 'e.g. "Your fastest way to"' },
  {
    key: "hero_rotating_words",
    label: "Rotating headline words",
    multiline: true,
    hint: "One phrase per line — e.g. get your travel visa",
  },
  { key: "hero_description", label: "Hero description", multiline: true },
  { key: "hero_cta_label", label: "Hero button label" },
];

const SITE_FIELDS: Field[] = [
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

const IMAGE_KEYS = ["hero_image_url", "hero_traveller_image_url"] as const;

const ALL_KEYS = [
  ...HERO_FIELDS.map((field) => field.key),
  ...IMAGE_KEYS,
  ...SITE_FIELDS.map((field) => field.key),
];

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-navy-soft">
        {field.label}
      </span>
      <div className="mt-1.5">
        {field.multiline ? (
          <Textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={4}
            className="rounded-2xl border-white/60 bg-white/80"
          />
        ) : (
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="rounded-2xl border-white/60 bg-white/80"
          />
        )}
      </div>
      {field.hint ? <span className="mt-1 block text-xs text-muted-foreground">{field.hint}</span> : null}
    </label>
  );
}

function AdminContentPage() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchContent = useServerFn(getSiteContent);
  const saveContentFn = useServerFn(updateSiteContent);

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
        data: { entries: ALL_KEYS.map((key) => ({ key, value: values[key] ?? "" })) },
      }),
    onSuccess: (result) => {
      setFeedback(result.ok ? "Website content saved." : (result.message ?? "Could not save."));
      void queryClient.invalidateQueries({ queryKey: ["admin", "content"] });
      void queryClient.invalidateQueries({ queryKey: ["hero-content"] });
    },
    onError: () => setFeedback("Could not save the content."),
  });

  const set = (key: string) => (next: string) => setValues((current) => ({ ...current, [key]: next }));
  const rotating = (values["hero_rotating_words"] ?? "")
    .split("\n")
    .map((word) => word.trim())
    .filter(Boolean);

  return (
    <AdminShell
      title="Website content"
      subtitle="Edit the homepage hero, imagery, about copy and contact details. Changes go live as soon as you save."
      actions={
        <Button asChild variant="outline" className="rounded-2xl">
          <Link to="/admin/testimonials">
            Testimonials
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      }
    >
      {feedback ? (
        <p className="glass-card mb-5 rounded-2xl px-5 py-3 text-sm text-navy">{feedback}</p>
      ) : null}

      {content.isPending ? (
        <div className="glass-card flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      ) : (
        <form
          className="grid gap-6 xl:grid-cols-[1.15fr_1fr]"
          onSubmit={(event) => {
            event.preventDefault();
            setFeedback(null);
            saveContent.mutate();
          }}
        >
          <div className="space-y-6">
            <section className="glass-card space-y-4 rounded-3xl p-6">
              <h2 className="text-lg font-extrabold text-navy">Homepage hero</h2>
              {HERO_FIELDS.map((field) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  value={values[field.key] ?? ""}
                  onChange={set(field.key)}
                />
              ))}

              <div className="grid gap-3 sm:grid-cols-2">
                <AdminMediaUpload
                  folder="hero"
                  label="Hero background image"
                  value={values["hero_image_url"] ?? ""}
                  onChange={set("hero_image_url")}
                />
                <AdminMediaUpload
                  folder="hero"
                  label="Traveller image"
                  value={values["hero_traveller_image_url"] ?? ""}
                  onChange={set("hero_traveller_image_url")}
                />
              </div>
            </section>

            <section className="glass-card space-y-4 rounded-3xl p-6">
              <h2 className="text-lg font-extrabold text-navy">About &amp; contact details</h2>
              {SITE_FIELDS.map((field) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  value={values[field.key] ?? ""}
                  onChange={set(field.key)}
                />
              ))}
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:h-fit">
            <section className="glass-card rounded-3xl p-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-navy/70">
                <Sparkles className="h-3.5 w-3.5 text-orange" aria-hidden="true" />
                Live hero preview
              </span>

              <div className="mt-4 overflow-hidden rounded-2xl">
                <div
                  className="hero-aurora relative p-6"
                  style={
                    values["hero_image_url"]
                      ? {
                          backgroundImage: `url(${values["hero_image_url"]})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                >
                  <div className="rounded-2xl bg-white/70 p-4 backdrop-blur">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-navy/70">
                      {values["hero_badge"] || "Amazingfly.ng"}
                    </p>
                    <p className="mt-2 text-xl font-extrabold leading-tight text-navy">
                      {values["hero_headline"] || "Your fastest way to"}
                    </p>
                    <p className="text-gradient-brand text-xl font-extrabold leading-tight">
                      {rotating[0] ?? "get your travel visa"}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-navy/70">
                      {values["hero_description"] ||
                        "Fast, reliable and stress-free travel solutions."}
                    </p>
                    <span className="btn-gradient mt-3 inline-flex rounded-xl px-4 py-2 text-xs font-bold text-white">
                      {values["hero_cta_label"] || "Get Started"}
                    </span>
                  </div>

                  {values["hero_traveller_image_url"] ? (
                    <img
                      src={values["hero_traveller_image_url"]}
                      alt=""
                      className="mt-4 h-28 w-auto object-contain"
                    />
                  ) : null}
                </div>
              </div>

              {rotating.length ? (
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {rotating.map((word) => (
                    <li
                      key={word}
                      className="rounded-full bg-sky-tint px-2.5 py-1 text-[11px] font-semibold text-navy"
                    >
                      {word}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <Button
              type="submit"
              disabled={saveContent.isPending}
              className="btn-gradient w-full text-white"
            >
              {saveContent.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Save website content
            </Button>
          </aside>
        </form>
      )}
    </AdminShell>
  );
}
