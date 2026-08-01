import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";

import { PageHero } from "@/components/PageParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useServerFn } from "@tanstack/react-start";
import { generateRequestReference } from "@/lib/request-reference";
import {
  getActiveServices,
  submitServiceRequest,
  type ServiceOption,
} from "@/lib/requests.functions";

const TRAVEL_SLUGS = ["visa-assistance", "flights", "hotels", "travel-insurance"];

const CONTACT_METHODS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Phone call" },
  { value: "email", label: "Email" },
] as const;

type FormState = {
  serviceId: string;
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string;
  whatsappSameAsPhone: boolean;
  destination: string;
  travelDate: string;
  details: string;
  preferredContact: string;
  consent: boolean;
};

const EMPTY_FORM: FormState = {
  serviceId: "",
  fullName: "",
  email: "",
  phone: "",
  whatsapp: "",
  whatsappSameAsPhone: false,
  destination: "",
  travelDate: "",
  details: "",
  preferredContact: "whatsapp",
  consent: false,
};

type RequestSearch = {
  service?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
};

type FormErrors = {
  serviceId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  details?: string;
  preferredContact?: string;
  consent?: string;
};

export const Route = createFileRoute("/request")({
  validateSearch: (search: Record<string, unknown>): RequestSearch => ({
    ...(typeof search["service"] === "string" ? { service: search["service"] } : {}),
    ...(typeof search["from"] === "string" ? { from: search["from"] } : {}),
    ...(typeof search["to"] === "string" ? { to: search["to"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Start a Request | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Submit a travel documentation, visa assistance or booking support request to Amazingfly Travels through Amazingfly.ng.",
      },
      { property: "og:title", content: "Start a Request | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Send your request to the Amazingfly Travels team through Amazingfly.ng.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/request" },
    ],
    links: [{ rel: "canonical", href: "/request" }],
  }),
  component: RequestPage,
});

function RequestPage() {
  const { service: serviceSlug } = Route.useSearch();

  const fetchServices = useServerFn(getActiveServices);
  const sendRequest = useServerFn(submitServiceRequest);

  const servicesQuery = useQuery({
    queryKey: ["active-services"],
    queryFn: () => fetchServices(),
    retry: 1,
  });

  const options = useMemo(() => servicesQuery.data ?? [], [servicesQuery.data]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  // Preselect the service coming from a service page link.
  useEffect(() => {
    if (!options.length) return;
    setForm((prev) => {
      if (prev.serviceId) return prev;
      const match = serviceSlug ? options.find((o) => o.slug === serviceSlug) : undefined;
      return match ? { ...prev, serviceId: match.id } : prev;
    });
  }, [options, serviceSlug]);

  const selected = options.find((o) => o.id === form.serviceId);
  const travelFieldsProminent = selected ? TRAVEL_SLUGS.includes(selected.slug) : false;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function validate(): boolean {
    const next: FormErrors = {};
    if (!form.serviceId) next["serviceId"] = "Please select a service.";
    if (!form.fullName.trim()) next["fullName"] = "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next["email"] = "Please enter a valid email address.";
    if (!form.phone.trim()) next["phone"] = "Please enter your phone number.";
    if (!form.details.trim()) next["details"] = "Please describe your request.";
    if (!form.preferredContact) next["preferredContact"] = "Please choose a contact method.";
    if (!form.consent) next["consent"] = "Please confirm that we may contact you.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function insertRequest(requestReference: string) {
    return sendRequest({
      data: {
        request_reference: requestReference,
        service_id: form.serviceId,
        full_name: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsappSameAsPhone
        ? form.phone.trim()
        : form.whatsapp.trim() || null,
        destination: form.destination.trim() || null,
        travel_date: form.travelDate || null,
        request_details: form.details.trim(),
        preferred_contact: form.preferredContact as "whatsapp" | "phone" | "email",
        consent_to_contact: true as const,
      },
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      let requestReference = generateRequestReference();
      let result = await insertRequest(requestReference);

      // Retry once if the generated reference already exists.
      if (!result.ok && result.code === "23505") {
        requestReference = generateRequestReference();
        result = await insertRequest(requestReference);
      }

      if (!result.ok) {
        setSubmitError(
          "We could not submit your request at the moment. Please try again, or contact Amazingfly Travels directly.",
        );
        return;
      }

      setReference(requestReference);
      setForm(EMPTY_FORM);
      setErrors({});
    } catch {
      setSubmitError(
        "We could not submit your request at the moment. Please check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (reference) {
    return (
      <>
        <PageHero eyebrow="Requests" title="Request Submitted Successfully" />
        <section className="container-page section-y">
          <div className="max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-card md:p-12">
            <CheckCircle2 className="h-10 w-10 text-orange" aria-hidden="true" />
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              Thank you for contacting Amazingfly Travels through Amazingfly.ng. Our team will
              review your request and contact you through your preferred contact method.
            </p>
            <div className="mt-8 rounded-xl border border-border bg-orange-tint p-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">
                Your request reference
              </p>
              <p className="mt-2 text-2xl font-extrabold tracking-wide text-navy md:text-3xl">
                {reference}
              </p>
            </div>
            <p className="mt-6 text-sm font-semibold text-navy">
              Please save your request reference for future communication.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/services">Explore Services</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/contact">Contact Support</Link>
              </Button>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Requests"
        title="Start a Request"
        description="Share your travel details and the Amazingfly Travels team will review your request and respond through your preferred contact method."
      />

      <section className="container-page section-y">
        <div className="max-w-2xl">
          {servicesQuery.isError ? (
            <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
              <p className="text-lg font-semibold text-navy">
                We cannot load the request form right now.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Our service list is temporarily unavailable, so requests cannot be submitted at the
                moment. Please contact Amazingfly Travels directly and our team will assist you.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/contact">Contact Support</Link>
                </Button>
                <Button size="lg" variant="secondary" onClick={() => servicesQuery.refetch()}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="rounded-2xl border border-border bg-card p-6 shadow-card md:p-10"
            >
              <div className="grid gap-6">
                <Field label="Service" htmlFor="service" required error={errors["serviceId"]}>
                  <select
                    id="service"
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    value={form.serviceId}
                    disabled={servicesQuery.isLoading}
                    onChange={(e) => update("serviceId", e.target.value)}
                  >
                    <option value="">
                      {servicesQuery.isLoading ? "Loading services…" : "Select a service"}
                    </option>
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {selected?.price_label ? (
                    <p className="mt-2 text-xs text-muted-foreground">{selected.price_label}</p>
                  ) : null}
                </Field>

                <Field label="Full name" htmlFor="fullName" required error={errors["fullName"]}>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    autoComplete="name"
                    onChange={(e) => update("fullName", e.target.value)}
                  />
                </Field>

                <div className="grid gap-6 md:grid-cols-2">
                  <Field label="Email address" htmlFor="email" required error={errors["email"]}>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      autoComplete="email"
                      onChange={(e) => update("email", e.target.value)}
                    />
                  </Field>

                  <Field label="Phone number" htmlFor="phone" required error={errors["phone"]}>
                    <Input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      autoComplete="tel"
                      onChange={(e) => update("phone", e.target.value)}
                    />
                  </Field>
                </div>

                <Field label="WhatsApp number" htmlFor="whatsapp">
                  <Input
                    id="whatsapp"
                    type="tel"
                    value={form.whatsappSameAsPhone ? form.phone : form.whatsapp}
                    disabled={form.whatsappSameAsPhone}
                    onChange={(e) => update("whatsapp", e.target.value)}
                  />
                  <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={form.whatsappSameAsPhone}
                      onCheckedChange={(checked) =>
                        update("whatsappSameAsPhone", checked === true)
                      }
                    />
                    Same as my phone number
                  </label>
                </Field>

                <div className="grid gap-6 md:grid-cols-2">
                  <Field
                    label={travelFieldsProminent ? "Destination" : "Destination (optional)"}
                    htmlFor="destination"
                  >
                    <Input
                      id="destination"
                      value={form.destination}
                      onChange={(e) => update("destination", e.target.value)}
                    />
                  </Field>

                  <Field
                    label={
                      travelFieldsProminent ? "Intended travel date" : "Intended travel date (optional)"
                    }
                    htmlFor="travelDate"
                  >
                    <Input
                      id="travelDate"
                      type="date"
                      value={form.travelDate}
                      onChange={(e) => update("travelDate", e.target.value)}
                    />
                  </Field>
                </div>

                <Field label="Request details" htmlFor="details" required error={errors["details"]}>
                  <Textarea
                    id="details"
                    rows={5}
                    value={form.details}
                    placeholder="Tell us what you need help with."
                    onChange={(e) => update("details", e.target.value)}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Please do not include passport numbers, bank statements, card or payment details.
                  </p>
                </Field>

                <Field
                  label="Preferred contact method"
                  htmlFor="preferredContact"
                  required
                  error={errors["preferredContact"]}
                >
                  <RadioGroup
                    id="preferredContact"
                    className="flex flex-wrap gap-4"
                    value={form.preferredContact}
                    onValueChange={(value) => update("preferredContact", value)}
                  >
                    {CONTACT_METHODS.map((method) => (
                      <label
                        key={method.value}
                        className="flex items-center gap-2 text-sm text-navy"
                      >
                        <RadioGroupItem value={method.value} />
                        {method.label}
                      </label>
                    ))}
                  </RadioGroup>
                </Field>

                <div>
                  <label className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                    <Checkbox
                      className="mt-0.5"
                      checked={form.consent}
                      onCheckedChange={(checked) => update("consent", checked === true)}
                    />
                    I consent to Amazingfly Travels contacting me about this request.
                  </label>
                  {errors["consent"] ? (
                    <p className="mt-2 text-sm font-medium text-destructive">{errors["consent"]}</p>
                  ) : null}
                </div>

                {submitError ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive"
                  >
                    {submitError}
                  </div>
                ) : null}

                <div>
                  <Button type="submit" size="lg" disabled={submitting || servicesQuery.isLoading}>
                    {submitting ? "Submitting…" : "Submit Request"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

function Field({
  label,
  htmlFor,
  required,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean | undefined;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="text-sm font-semibold text-navy">
        {label}
        {required ? <span className="ml-1 text-orange">*</span> : null}
      </Label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-2 text-sm font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
