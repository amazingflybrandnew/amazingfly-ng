import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Plane, HeartPulse, Luggage, Loader2, ArrowRight, Lock } from "lucide-react";

import { PageHero } from "@/components/PageParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSessionQuery } from "@/components/AccountShell";
import { formatMoney } from "@/lib/payment-status";
import { TRAVEL_PURPOSES } from "@/lib/travel-options";
import {
  getInsuranceOptions,
  getInsuranceTravelPlans,
  previewInsuranceQuote,
  createInsuranceQuote,
} from "@/lib/insurance/insurance.functions";
import type { AllianzLookupItem } from "@/lib/insurance/allianz.types";

export const Route = createFileRoute("/travel-insurance")({
  head: () => ({
    meta: [
      { title: "Travel Insurance | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Get an instant travel insurance quote and buy a Sanlam Allianz policy online — Schengen and worldwide cover.",
      },
    ],
  }),
  component: TravelInsurance,
});

const selectClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-sky disabled:opacity-60";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold uppercase tracking-[0.12em] text-navy-soft">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** true when the trip is longer than 92 days (drives IsMultiTrip). */
function isMultiTrip(begins: string, ends: string): boolean {
  if (!begins || !ends) return false;
  const ms = new Date(`${ends}T00:00:00Z`).getTime() - new Date(`${begins}T00:00:00Z`).getTime();
  return ms / (1000 * 60 * 60 * 24) > 92;
}

type FormState = {
  destinationCountryId: string;
  travelPlanId: string;
  coverBegins: string;
  coverEnds: string;
  purposeOfTravel: string;
  isRoundTrip: boolean;
  // Traveller
  titleId: string;
  genderId: string;
  surname: string;
  firstName: string;
  middleName: string;
  dateOfBirth: string;
  email: string;
  telephone: string;
  stateId: string;
  address: string;
  zipCode: string;
  nationality: string;
  passportNo: string;
  occupation: string;
  maritalStatusId: string;
  nin: string;
  preExistingMedicalCondition: boolean;
  medicalCondition: string;
  nokFullName: string;
  nokAddress: string;
  nokRelationship: string;
  nokTelephone: string;
  consent: boolean;
};

const EMPTY: FormState = {
  destinationCountryId: "",
  travelPlanId: "",
  coverBegins: "",
  coverEnds: "",
  purposeOfTravel: TRAVEL_PURPOSES[0] ?? "Tourism / Holiday",
  isRoundTrip: true,
  titleId: "",
  genderId: "",
  surname: "",
  firstName: "",
  middleName: "",
  dateOfBirth: "",
  email: "",
  telephone: "",
  stateId: "",
  address: "",
  zipCode: "",
  nationality: "Nigeria",
  passportNo: "",
  occupation: "",
  maritalStatusId: "",
  nin: "",
  preExistingMedicalCondition: false,
  medicalCondition: "",
  nokFullName: "",
  nokAddress: "",
  nokRelationship: "",
  nokTelephone: "",
  consent: false,
};

function LookupSelect({
  value,
  onChange,
  items,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  items: AllianzLookupItem[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <select
      className={selectClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required
    >
      <option value="">{placeholder}</option>
      {items.map((item) => (
        <option key={item.id} value={String(item.id)}>
          {item.name}
        </option>
      ))}
    </select>
  );
}

function TravelInsurance() {
  const navigate = useNavigate();
  const { data: session } = useSessionQuery();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [price, setPrice] = useState<{ amount: number; currency: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const optionsFn = useServerFn(getInsuranceOptions);
  const plansFn = useServerFn(getInsuranceTravelPlans);
  const previewFn = useServerFn(previewInsuranceQuote);
  const createFn = useServerFn(createInsuranceQuote);

  const options = useQuery({ queryKey: ["insurance-options"], queryFn: () => optionsFn() });

  // Prefill contact email from the signed-in account.
  useEffect(() => {
    if (session?.user?.email && !form.email) set("email", session.user.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email]);

  const countryId = Number(form.destinationCountryId) || 0;
  const plans = useQuery({
    queryKey: ["insurance-plans", countryId],
    queryFn: () => plansFn({ data: { countryId } }),
    enabled: countryId > 0,
  });

  // Individual booking type (family cover comes later).
  const bookingTypeId = useMemo(() => {
    const list = options.data?.bookingTypes ?? [];
    const individual = list.find((b) => /individual/i.test(b.name));
    return individual?.id ?? 1;
  }, [options.data]);

  // Any change to pricing inputs invalidates a shown price.
  const priceInputs = [
    form.destinationCountryId,
    form.travelPlanId,
    form.coverBegins,
    form.coverEnds,
    form.purposeOfTravel,
    form.dateOfBirth,
    form.isRoundTrip,
  ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setPrice(null), priceInputs);

  const canPrice =
    countryId > 0 &&
    Number(form.travelPlanId) > 0 &&
    !!form.coverBegins &&
    !!form.coverEnds &&
    !!form.purposeOfTravel &&
    !!form.dateOfBirth &&
    !!form.email &&
    !!form.telephone;

  const preview = useMutation({
    mutationFn: () =>
      previewFn({
        data: {
          destination_country_id: countryId,
          cover_begins: form.coverBegins,
          cover_ends: form.coverEnds,
          purpose_of_travel: form.purposeOfTravel,
          travel_plan_id: Number(form.travelPlanId),
          booking_type_id: bookingTypeId,
          is_round_trip: form.isRoundTrip,
          is_multi_trip: isMultiTrip(form.coverBegins, form.coverEnds),
          date_of_birth: form.dateOfBirth,
          email: form.email,
          telephone: form.telephone,
        },
      }),
    onSuccess: (res) => {
      if (res.ok) {
        setPrice({ amount: res.amount, currency: res.currency });
        setError(null);
      } else {
        setPrice(null);
        setError(res.message);
      }
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not get a price."),
  });

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          destination_country_id: countryId,
          cover_begins: form.coverBegins,
          cover_ends: form.coverEnds,
          purpose_of_travel: form.purposeOfTravel,
          travel_plan_id: Number(form.travelPlanId),
          booking_type_id: bookingTypeId,
          is_round_trip: form.isRoundTrip,
          is_multi_trip: isMultiTrip(form.coverBegins, form.coverEnds),
          surname: form.surname,
          first_name: form.firstName,
          middle_name: form.middleName,
          gender_id: Number(form.genderId),
          title_id: Number(form.titleId),
          date_of_birth: form.dateOfBirth,
          email: form.email,
          telephone: form.telephone,
          state_id: Number(form.stateId),
          address: form.address,
          zip_code: form.zipCode,
          nationality: form.nationality,
          passport_no: form.passportNo,
          occupation: form.occupation,
          marital_status_id: Number(form.maritalStatusId),
          ...(form.nin ? { nin: form.nin } : {}),
          pre_existing_medical_condition: form.preExistingMedicalCondition,
          medical_condition: form.preExistingMedicalCondition
            ? form.medicalCondition || null
            : null,
          next_of_kin: {
            full_name: form.nokFullName,
            address: form.nokAddress,
            relationship: form.nokRelationship,
            telephone: form.nokTelephone,
          },
          consent_to_contact: true as const,
        },
      }),
    onSuccess: (res) => {
      if (res.ok) {
        void navigate({ to: "/checkout/$requestId", params: { requestId: res.requestId } });
      } else {
        setError(res.message);
      }
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not start your policy."),
  });

  const signedIn = !!session?.user;
  const opt = options.data;

  return (
    <>
      <PageHero
        eyebrow="Travel Documents"
        title="Travel Insurance"
        description="Get an instant quote and buy your Sanlam Allianz travel policy online — Schengen-compliant and worldwide cover, issued in minutes."
      >
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><Plane className="h-4 w-4 text-orange" /> Trip protection</span>
          <span className="flex items-center gap-2"><Luggage className="h-4 w-4 text-orange" /> Lost baggage</span>
          <span className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-orange" /> Medical cover</span>
        </div>
      </PageHero>

      <div className="container-page section-y">
        <div className="mx-auto max-w-3xl space-y-8">
          {options.isPending ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
            </div>
          ) : options.isError ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              We could not load the insurance options right now. Please refresh and try again.
            </p>
          ) : (
            <form
              className="space-y-8"
              onSubmit={(e) => {
                e.preventDefault();
                if (!price) preview.mutate();
                else create.mutate();
              }}
            >
              {/* Trip */}
              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-navy">
                  <ShieldCheck className="h-5 w-5 text-orange" /> Trip details
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Destination country">
                    <select
                      className={selectClass}
                      value={form.destinationCountryId}
                      onChange={(e) => {
                        set("destinationCountryId", e.target.value);
                        set("travelPlanId", "");
                      }}
                      required
                    >
                      <option value="">Select destination</option>
                      {opt?.countries.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Travel plan" hint={countryId ? undefined : "Choose a destination first"}>
                    <select
                      className={selectClass}
                      value={form.travelPlanId}
                      onChange={(e) => set("travelPlanId", e.target.value)}
                      disabled={!countryId || plans.isPending}
                      required
                    >
                      <option value="">{plans.isPending && countryId ? "Loading plans…" : "Select plan"}</option>
                      {(plans.data ?? []).map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Cover start date">
                    <Input type="date" value={form.coverBegins} onChange={(e) => set("coverBegins", e.target.value)} required />
                  </Field>
                  <Field label="Cover end date">
                    <Input type="date" value={form.coverEnds} onChange={(e) => set("coverEnds", e.target.value)} required />
                  </Field>
                  <Field label="Purpose of travel">
                    <select
                      className={selectClass}
                      value={form.purposeOfTravel}
                      onChange={(e) => set("purposeOfTravel", e.target.value)}
                      required
                    >
                      {TRAVEL_PURPOSES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Trip type">
                    <label className="flex h-11 items-center gap-2 text-sm text-navy-soft">
                      <input
                        type="checkbox"
                        checked={form.isRoundTrip}
                        onChange={(e) => set("isRoundTrip", e.target.checked)}
                      />
                      Return trip (round trip)
                    </label>
                  </Field>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <Field label="Traveller date of birth">
                    <Input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} required />
                  </Field>
                  <Field label="Email">
                    <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={200} required />
                  </Field>
                  <Field label="Phone number">
                    <Input value={form.telephone} onChange={(e) => set("telephone", e.target.value)} maxLength={40} required />
                  </Field>
                </div>

                {!price ? (
                  <div className="mt-5">
                    <Button type="submit" size="lg" disabled={!canPrice || preview.isPending}>
                      {preview.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Getting price…</>
                      ) : (
                        <>Get my price</>
                      )}
                    </Button>
                  </div>
                ) : null}
              </section>

              {/* Price + traveller KYC (revealed after pricing) */}
              {price ? (
                <>
                  <div className="rounded-2xl border border-orange/30 bg-orange-tint p-5">
                    <p className="text-sm font-medium text-navy">Your travel insurance premium</p>
                    <p className="mt-1 text-3xl font-extrabold text-navy">
                      {formatMoney(price.amount, price.currency)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Underwritten by Sanlam Allianz. Complete the traveller details below to continue to secure payment.
                    </p>
                  </div>

                  <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
                    <h2 className="mb-4 text-lg font-bold text-navy">Traveller details</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Title">
                        <LookupSelect value={form.titleId} onChange={(v) => set("titleId", v)} items={opt?.titles ?? []} placeholder="Select title" />
                      </Field>
                      <Field label="Gender">
                        <LookupSelect value={form.genderId} onChange={(v) => set("genderId", v)} items={opt?.genders ?? []} placeholder="Select gender" />
                      </Field>
                      <Field label="First name">
                        <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} maxLength={80} required />
                      </Field>
                      <Field label="Surname">
                        <Input value={form.surname} onChange={(e) => set("surname", e.target.value)} maxLength={80} required />
                      </Field>
                      <Field label="Middle name (optional)">
                        <Input value={form.middleName} onChange={(e) => set("middleName", e.target.value)} maxLength={80} />
                      </Field>
                      <Field label="Marital status">
                        <LookupSelect value={form.maritalStatusId} onChange={(v) => set("maritalStatusId", v)} items={opt?.maritalStatuses ?? []} placeholder="Select status" />
                      </Field>
                      <Field label="Passport number">
                        <Input value={form.passportNo} onChange={(e) => set("passportNo", e.target.value)} maxLength={40} required />
                      </Field>
                      <Field label="Nationality">
                        <Input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} maxLength={80} required />
                      </Field>
                      <Field label="Occupation">
                        <Input value={form.occupation} onChange={(e) => set("occupation", e.target.value)} maxLength={80} required />
                      </Field>
                      <Field label="NIN" hint="Required by the insurer">
                        <Input value={form.nin} onChange={(e) => set("nin", e.target.value)} maxLength={20} required />
                      </Field>
                      <Field label="State">
                        <LookupSelect value={form.stateId} onChange={(v) => set("stateId", v)} items={opt?.states ?? []} placeholder="Select state" />
                      </Field>
                      <Field label="Postal / ZIP code (optional)">
                        <Input value={form.zipCode} onChange={(e) => set("zipCode", e.target.value)} maxLength={20} />
                      </Field>
                    </div>
                    <div className="mt-4">
                      <Field label="Residential address">
                        <Input value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={300} required />
                      </Field>
                    </div>
                    <div className="mt-4">
                      <label className="flex items-start gap-2 text-sm text-navy-soft">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={form.preExistingMedicalCondition}
                          onChange={(e) => set("preExistingMedicalCondition", e.target.checked)}
                        />
                        The traveller has a pre-existing medical condition
                      </label>
                      {form.preExistingMedicalCondition ? (
                        <div className="mt-3">
                          <Field label="Medical condition details">
                            <Input value={form.medicalCondition} onChange={(e) => set("medicalCondition", e.target.value)} maxLength={500} />
                          </Field>
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
                    <h2 className="mb-4 text-lg font-bold text-navy">Next of kin</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Full name">
                        <Input value={form.nokFullName} onChange={(e) => set("nokFullName", e.target.value)} maxLength={160} required />
                      </Field>
                      <Field label="Relationship">
                        <Input value={form.nokRelationship} onChange={(e) => set("nokRelationship", e.target.value)} maxLength={60} required />
                      </Field>
                      <Field label="Phone number">
                        <Input value={form.nokTelephone} onChange={(e) => set("nokTelephone", e.target.value)} maxLength={40} required />
                      </Field>
                      <Field label="Address">
                        <Input value={form.nokAddress} onChange={(e) => set("nokAddress", e.target.value)} maxLength={300} required />
                      </Field>
                    </div>
                  </section>

                  {!signedIn ? (
                    <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
                      <p className="text-sm text-muted-foreground">
                        Please sign in to complete your purchase — your policy and certificate will be saved to your account.
                      </p>
                      <Button asChild size="lg" className="mt-4">
                        <Link to="/auth" search={{ redirect: "/travel-insurance" }}>
                          Sign in or create an account
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="flex items-start gap-2 text-sm text-navy-soft">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={form.consent}
                          onChange={(e) => set("consent", e.target.checked)}
                          required
                        />
                        I confirm the details are correct and authorise Amazingfly to arrange this Sanlam Allianz policy.
                      </label>
                      <Button type="submit" size="lg" disabled={!form.consent || create.isPending}>
                        {create.isPending ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing payment…</>
                        ) : (
                          <><Lock className="mr-2 h-4 w-4" /> Pay {formatMoney(price.amount, price.currency)} &amp; get policy <ArrowRight className="ml-2 h-4 w-4" /></>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              ) : null}

              {error ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </form>
          )}
        </div>
      </div>
    </>
  );
}
