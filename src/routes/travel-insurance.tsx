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
          "Get an instant travel insurance quote and buy a Sanlam Allianz policy online — individual or family, Schengen and worldwide cover.",
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

function LookupSelect({
  value,
  onChange,
  items,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  items: AllianzLookupItem[];
  placeholder: string;
}) {
  return (
    <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="">{placeholder}</option>
      {items.map((item) => (
        <option key={item.id} value={String(item.id)}>
          {item.name}
        </option>
      ))}
    </select>
  );
}

/** true when the trip is longer than 92 days (drives IsMultiTrip). */
function isMultiTrip(begins: string, ends: string): boolean {
  if (!begins || !ends) return false;
  const ms = new Date(`${ends}T00:00:00Z`).getTime() - new Date(`${begins}T00:00:00Z`).getTime();
  return ms / (1000 * 60 * 60 * 24) > 92;
}

type Traveller = {
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
};

const emptyTraveller = (): Traveller => ({
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
});

type Opt = Awaited<ReturnType<typeof getInsuranceOptions>>;

function TravellerFields({
  value,
  onChange,
  opt,
}: {
  value: Traveller;
  onChange: (patch: Partial<Traveller>) => void;
  opt: Opt | undefined;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title">
          <LookupSelect value={value.titleId} onChange={(v) => onChange({ titleId: v })} items={opt?.titles ?? []} placeholder="Select title" />
        </Field>
        <Field label="Gender">
          <LookupSelect value={value.genderId} onChange={(v) => onChange({ genderId: v })} items={opt?.genders ?? []} placeholder="Select gender" />
        </Field>
        <Field label="First name">
          <Input value={value.firstName} onChange={(e) => onChange({ firstName: e.target.value })} maxLength={80} required />
        </Field>
        <Field label="Surname">
          <Input value={value.surname} onChange={(e) => onChange({ surname: e.target.value })} maxLength={80} required />
        </Field>
        <Field label="Middle name (optional)">
          <Input value={value.middleName} onChange={(e) => onChange({ middleName: e.target.value })} maxLength={80} />
        </Field>
        <Field label="Date of birth">
          <Input type="date" value={value.dateOfBirth} onChange={(e) => onChange({ dateOfBirth: e.target.value })} required />
        </Field>
        <Field label="Email">
          <Input type="email" value={value.email} onChange={(e) => onChange({ email: e.target.value })} maxLength={200} required />
        </Field>
        <Field label="Phone number">
          <Input value={value.telephone} onChange={(e) => onChange({ telephone: e.target.value })} maxLength={40} required />
        </Field>
        <Field label="Marital status">
          <LookupSelect value={value.maritalStatusId} onChange={(v) => onChange({ maritalStatusId: v })} items={opt?.maritalStatuses ?? []} placeholder="Select status" />
        </Field>
        <Field label="Passport number">
          <Input value={value.passportNo} onChange={(e) => onChange({ passportNo: e.target.value })} maxLength={40} required />
        </Field>
        <Field label="Nationality">
          <Input value={value.nationality} onChange={(e) => onChange({ nationality: e.target.value })} maxLength={80} required />
        </Field>
        <Field label="Occupation">
          <Input value={value.occupation} onChange={(e) => onChange({ occupation: e.target.value })} maxLength={80} required />
        </Field>
        <Field label="NIN" hint="Required by the insurer">
          <Input value={value.nin} onChange={(e) => onChange({ nin: e.target.value })} maxLength={20} required />
        </Field>
        <Field label="State">
          <LookupSelect value={value.stateId} onChange={(v) => onChange({ stateId: v })} items={opt?.states ?? []} placeholder="Select state" />
        </Field>
        <Field label="Postal / ZIP code (optional)">
          <Input value={value.zipCode} onChange={(e) => onChange({ zipCode: e.target.value })} maxLength={20} />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Residential address">
          <Input value={value.address} onChange={(e) => onChange({ address: e.target.value })} maxLength={300} required />
        </Field>
      </div>
      <div className="mt-4">
        <label className="flex items-start gap-2 text-sm text-navy-soft">
          <input
            type="checkbox"
            className="mt-1"
            checked={value.preExistingMedicalCondition}
            onChange={(e) => onChange({ preExistingMedicalCondition: e.target.checked })}
          />
          Has a pre-existing medical condition
        </label>
        {value.preExistingMedicalCondition ? (
          <div className="mt-3">
            <Field label="Medical condition details">
              <Input value={value.medicalCondition} onChange={(e) => onChange({ medicalCondition: e.target.value })} maxLength={500} />
            </Field>
          </div>
        ) : null}
      </div>
      <div className="mt-5 rounded-xl border border-border/70 bg-muted/30 p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-navy-soft">Next of kin</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name">
            <Input value={value.nokFullName} onChange={(e) => onChange({ nokFullName: e.target.value })} maxLength={160} required />
          </Field>
          <Field label="Relationship">
            <Input value={value.nokRelationship} onChange={(e) => onChange({ nokRelationship: e.target.value })} maxLength={60} required />
          </Field>
          <Field label="Phone number">
            <Input value={value.nokTelephone} onChange={(e) => onChange({ nokTelephone: e.target.value })} maxLength={40} required />
          </Field>
          <Field label="Address">
            <Input value={value.nokAddress} onChange={(e) => onChange({ nokAddress: e.target.value })} maxLength={300} required />
          </Field>
        </div>
      </div>
    </>
  );
}

function TravelInsurance() {
  const navigate = useNavigate();
  const { data: session } = useSessionQuery();

  // Trip + cover selection
  const [coverType, setCoverType] = useState<"individual" | "family">("individual");
  const [childrenCount, setChildrenCount] = useState(1);
  const [destinationCountryId, setDestinationCountryId] = useState("");
  const [travelPlanId, setTravelPlanId] = useState("");
  const [coverBegins, setCoverBegins] = useState("");
  const [coverEnds, setCoverEnds] = useState("");
  const [purpose, setPurpose] = useState<string>(TRAVEL_PURPOSES[0] ?? "Tourism / Holiday");
  const [isRoundTrip, setIsRoundTrip] = useState(true);
  // Primary traveller quick fields (for pricing); map to travellers[0]
  const [travellers, setTravellers] = useState<Traveller[]>([emptyTraveller()]);
  const [consent, setConsent] = useState(false);
  const [price, setPrice] = useState<{ amount: number; currency: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Allianz family cover is exactly 2 adults + 1-6 children.
  const noOfPeople = coverType === "family" ? 2 : 1;
  const noOfChildren = coverType === "family" ? childrenCount : 0;
  const travellerTarget = noOfPeople + noOfChildren;

  // Keep the travellers array sized to the selected cover type.
  useEffect(() => {
    setTravellers((prev) => {
      if (prev.length === travellerTarget) return prev;
      const next = prev.slice(0, travellerTarget);
      while (next.length < travellerTarget) next.push(emptyTraveller());
      return next;
    });
    setPrice(null);
  }, [travellerTarget]);

  // Prefill lead email from the signed-in account.
  useEffect(() => {
    if (session?.user?.email) {
      setTravellers((prev) => {
        if (!prev[0] || prev[0].email) return prev;
        const next = [...prev];
        next[0] = { ...next[0], email: session.user!.email };
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email]);

  const setTraveller = (index: number, patch: Partial<Traveller>) =>
    setTravellers((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));

  const optionsFn = useServerFn(getInsuranceOptions);
  const plansFn = useServerFn(getInsuranceTravelPlans);
  const previewFn = useServerFn(previewInsuranceQuote);
  const createFn = useServerFn(createInsuranceQuote);

  const options = useQuery({ queryKey: ["insurance-options"], queryFn: () => optionsFn() });
  const opt = options.data;

  const countryId = Number(destinationCountryId) || 0;
  const plans = useQuery({
    queryKey: ["insurance-plans", countryId],
    queryFn: () => plansFn({ data: { countryId } }),
    enabled: countryId > 0,
  });

  const bookingTypeId = useMemo(() => {
    const list = opt?.bookingTypes ?? [];
    const match = list.find((b) =>
      coverType === "family" ? /family/i.test(b.name) : /individual/i.test(b.name),
    );
    return match?.id ?? (coverType === "family" ? 2 : 1);
  }, [opt, coverType]);

  const lead = travellers[0];
  // Reset a shown price whenever pricing inputs change.
  useEffect(() => {
    setPrice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationCountryId, travelPlanId, coverBegins, coverEnds, purpose, isRoundTrip, coverType, childrenCount, lead?.dateOfBirth]);

  const canPrice =
    countryId > 0 &&
    Number(travelPlanId) > 0 &&
    !!coverBegins &&
    !!coverEnds &&
    !!lead?.dateOfBirth &&
    !!lead?.email &&
    !!lead?.telephone;

  const preview = useMutation({
    mutationFn: () =>
      previewFn({
        data: {
          destination_country_id: countryId,
          cover_begins: coverBegins,
          cover_ends: coverEnds,
          purpose_of_travel: purpose,
          travel_plan_id: Number(travelPlanId),
          booking_type_id: bookingTypeId,
          is_round_trip: isRoundTrip,
          is_multi_trip: isMultiTrip(coverBegins, coverEnds),
          no_of_people: noOfPeople,
          no_of_children: noOfChildren,
          date_of_birth: lead!.dateOfBirth,
          email: lead!.email,
          telephone: lead!.telephone,
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
          cover_begins: coverBegins,
          cover_ends: coverEnds,
          purpose_of_travel: purpose,
          travel_plan_id: Number(travelPlanId),
          booking_type_id: bookingTypeId,
          is_round_trip: isRoundTrip,
          is_multi_trip: isMultiTrip(coverBegins, coverEnds),
          no_of_people: noOfPeople,
          no_of_children: noOfChildren,
          consent_to_contact: true as const,
          travellers: travellers.map((t) => ({
            surname: t.surname,
            first_name: t.firstName,
            middle_name: t.middleName,
            gender_id: Number(t.genderId),
            title_id: Number(t.titleId),
            date_of_birth: t.dateOfBirth,
            email: t.email,
            telephone: t.telephone,
            state_id: Number(t.stateId),
            address: t.address,
            zip_code: t.zipCode,
            nationality: t.nationality,
            passport_no: t.passportNo,
            occupation: t.occupation,
            marital_status_id: Number(t.maritalStatusId),
            nin: t.nin,
            pre_existing_medical_condition: t.preExistingMedicalCondition,
            medical_condition: t.preExistingMedicalCondition ? t.medicalCondition || null : null,
            next_of_kin: {
              full_name: t.nokFullName,
              address: t.nokAddress,
              relationship: t.nokRelationship,
              telephone: t.nokTelephone,
            },
          })),
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
  const travellerLabel = (i: number) =>
    coverType === "individual"
      ? "Traveller"
      : i < noOfPeople
        ? `Adult ${i + 1}`
        : `Child ${i - noOfPeople + 1}`;

  return (
    <>
      <PageHero
        eyebrow="Travel Documents"
        title="Travel Insurance"
        description="Get an instant quote and buy your Sanlam Allianz travel policy online — individual or family, Schengen-compliant and worldwide cover."
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

                <div className="mb-4 flex flex-wrap gap-2">
                  {(["individual", "family"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCoverType(t)}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                        coverType === t ? "bg-navy text-white" : "bg-muted text-navy-soft"
                      }`}
                    >
                      {t === "individual" ? "Individual" : "Family (2 adults + children)"}
                    </button>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Destination country">
                    <select
                      className={selectClass}
                      value={destinationCountryId}
                      onChange={(e) => {
                        setDestinationCountryId(e.target.value);
                        setTravelPlanId("");
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
                      value={travelPlanId}
                      onChange={(e) => setTravelPlanId(e.target.value)}
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
                    <Input type="date" value={coverBegins} onChange={(e) => setCoverBegins(e.target.value)} required />
                  </Field>
                  <Field label="Cover end date">
                    <Input type="date" value={coverEnds} onChange={(e) => setCoverEnds(e.target.value)} required />
                  </Field>
                  <Field label="Purpose of travel">
                    <select className={selectClass} value={purpose} onChange={(e) => setPurpose(e.target.value)} required>
                      {TRAVEL_PURPOSES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {coverType === "family" ? (
                    <>
                      <Field label="Adults" hint="Family cover is for 2 adults">
                        <div className={`${selectClass} flex items-center`}>2 adults</div>
                      </Field>
                      <Field label="Number of children" hint="1–6, under 18">
                        <select
                          className={selectClass}
                          value={String(childrenCount)}
                          onChange={(e) => setChildrenCount(Number(e.target.value))}
                        >
                          {[1, 2, 3, 4, 5, 6].map((n) => (
                            <option key={n} value={String(n)}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </>
                  ) : null}
                  <Field label="Trip type">
                    <label className="flex h-11 items-center gap-2 text-sm text-navy-soft">
                      <input type="checkbox" checked={isRoundTrip} onChange={(e) => setIsRoundTrip(e.target.checked)} />
                      Return trip (round trip)
                    </label>
                  </Field>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <Field label={coverType === "family" ? "Lead traveller date of birth" : "Traveller date of birth"}>
                    <Input type="date" value={lead?.dateOfBirth ?? ""} onChange={(e) => setTraveller(0, { dateOfBirth: e.target.value })} required />
                  </Field>
                  <Field label="Email">
                    <Input type="email" value={lead?.email ?? ""} onChange={(e) => setTraveller(0, { email: e.target.value })} maxLength={200} required />
                  </Field>
                  <Field label="Phone number">
                    <Input value={lead?.telephone ?? ""} onChange={(e) => setTraveller(0, { telephone: e.target.value })} maxLength={40} required />
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

              {price ? (
                <>
                  <div className="rounded-2xl border border-orange/30 bg-orange-tint p-5">
                    <p className="text-sm font-medium text-navy">
                      Your travel insurance premium{coverType === "family" ? ` (${travellerTarget} travellers)` : ""}
                    </p>
                    <p className="mt-1 text-3xl font-extrabold text-navy">
                      {formatMoney(price.amount, price.currency)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Underwritten by Sanlam Allianz. Complete the traveller details below to continue to secure payment.
                    </p>
                  </div>

                  {coverType === "family" ? (
                    <p className="rounded-xl border border-sky/30 bg-sky-tint/40 p-4 text-sm text-navy-soft">
                      Note: all family members must share the <strong>same surname</strong> (required by the insurer).
                    </p>
                  ) : null}

                  {travellers.map((t, i) => (
                    <section key={i} className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
                      <h2 className="mb-4 text-lg font-bold text-navy">{travellerLabel(i)} details</h2>
                      <TravellerFields value={t} onChange={(patch) => setTraveller(i, patch)} opt={opt} />
                    </section>
                  ))}

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
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                          required
                        />
                        I confirm the details are correct and authorise Amazingfly to arrange this Sanlam Allianz policy.
                      </label>
                      <Button type="submit" size="lg" disabled={!consent || create.isPending}>
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
