import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plane, Loader2, ArrowRight, CheckCircle2, Plus, Trash2, ShieldCheck, Clock } from "lucide-react";

import { PageHero } from "@/components/PageParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSessionQuery } from "@/components/AccountShell";
import { submitCharterRequest } from "@/lib/charter/charter.functions";

export const Route = createFileRoute("/flight-charter")({
  head: () => ({
    meta: [
      { title: "Private Flight Charter | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Charter a private flight locally within Nigeria or internationally. Tell us your trip and get a personalised quote from Amazingfly Travels.",
      },
    ],
  }),
  component: FlightCharterPage,
});

const selectClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-sky";

const AIRCRAFT = ["No preference", "Private jet", "Turboprop", "Helicopter", "Group (large) aircraft"];
const PURPOSES = ["Business", "Leisure", "Medical / Evacuation", "Cargo", "VIP", "Other"];

type Leg = { from: string; to: string; date: string; time: string };
type TripType = "one_way" | "round_trip" | "multi_leg";
type TripScope = "local" | "international";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold uppercase tracking-[0.12em] text-navy-soft">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function FlightCharterPage() {
  const { data: session } = useSessionQuery();
  const submit = useServerFn(submitCharterRequest);

  const [tripScope, setTripScope] = useState<TripScope>("local");
  const [tripType, setTripType] = useState<TripType>("one_way");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [legs, setLegs] = useState<Leg[]>([
    { from: "", to: "", date: "", time: "" },
    { from: "", to: "", date: "", time: "" },
  ]);
  const [passengers, setPassengers] = useState("1");
  const [aircraftPreference, setAircraftPreference] = useState(AIRCRAFT[0]!);
  const [purpose, setPurpose] = useState(PURPOSES[0]!);
  const [specialRequests, setSpecialRequests] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [luggageCargo, setLuggageCargo] = useState("");
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill contact from the signed-in account.
  useEffect(() => {
    if (session?.user) {
      setEmail((e) => e || session.user!.email || "");
      setFullName((n) => n || session.user!.full_name || "");
    }
  }, [session?.user]);

  const signedIn = !!session?.user;

  const create = useMutation({
    mutationFn: () =>
      submit({
        data: {
          tripScope,
          tripType,
          fromLocation,
          toLocation,
          departureDate,
          departureTime,
          returnDate,
          returnTime,
          legs: tripType === "multi_leg" ? legs : [],
          passengers: Math.max(1, Number(passengers) || 1),
          aircraftPreference,
          purpose,
          specialRequests,
          budgetRange,
          luggageCargo,
          flexibleDates,
          fullName,
          email,
          phone,
          whatsapp,
          consentToContact: true as const,
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) setError(res.message);
      else setError(null);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not submit your request."),
  });

  const result = create.data;
  const setLeg = (i: number, patch: Partial<Leg>) =>
    setLegs((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  if (result?.ok) {
    return (
      <>
        <PageHero eyebrow="Flight Charter" title="Request received" description="Your private charter request is in." />
        <div className="container-page section-y">
          <div className="mx-auto max-w-2xl rounded-3xl border border-mint/40 bg-mint-tint/50 p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-mint" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-extrabold text-navy">Thank you, {fullName.split(" ")[0] || "traveller"}!</h2>
            <p className="mt-2 text-navy-soft">
              Your charter request <strong>{result.reference}</strong> has been received. Our charter team
              will review it and send you a personalised quotation. Once you accept the quote, you can pay
              securely online.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              A confirmation has been sent to {email}. You can also track this request in your account.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild className="btn-gradient border-0 text-white">
                <Link to="/dashboard">Go to my dashboard</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/flight-charter" onClick={() => window.location.reload()}>
                  Submit another request
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Flight Charter"
        title="Charter a Private Flight"
        description="Fly on your schedule - locally within Nigeria or internationally. Tell us your trip and our team sends you a personalised quote."
      >
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><Plane className="h-4 w-4 text-orange" /> Jets, turboprops &amp; helicopters</span>
          <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-orange" /> Fly on your own schedule</span>
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-orange" /> Vetted operators</span>
        </div>
      </PageHero>

      <div className="container-page section-y">
        <div className="mx-auto max-w-3xl">
          <form
            className="space-y-8"
            onSubmit={(e) => {
              e.preventDefault();
              if (!consent) {
                setError("Please confirm you authorise us to contact you with a quote.");
                return;
              }
              setError(null);
              create.mutate();
            }}
          >
            {/* Trip */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
              <h2 className="mb-4 text-lg font-bold text-navy">Trip details</h2>

              <div className="mb-4 flex flex-wrap gap-2">
                {(["local", "international"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTripScope(s)}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      tripScope === s ? "bg-navy text-white" : "bg-muted text-navy-soft"
                    }`}
                  >
                    {s === "local" ? "Local (within Nigeria)" : "International"}
                  </button>
                ))}
              </div>

              <div className="mb-5 flex flex-wrap gap-2">
                {(["one_way", "round_trip", "multi_leg"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTripType(t)}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      tripType === t ? "bg-orange text-white" : "bg-muted text-navy-soft"
                    }`}
                  >
                    {t === "one_way" ? "One way" : t === "round_trip" ? "Round trip" : "Multi-leg"}
                  </button>
                ))}
              </div>

              {tripType !== "multi_leg" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="From" hint="City or airport">
                    <Input value={fromLocation} onChange={(e) => setFromLocation(e.target.value)} placeholder="e.g. Lagos (LOS)" maxLength={120} />
                  </Field>
                  <Field label="To" hint="City or airport">
                    <Input value={toLocation} onChange={(e) => setToLocation(e.target.value)} placeholder="e.g. Abuja (ABV)" maxLength={120} />
                  </Field>
                  <Field label="Departure date">
                    <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
                  </Field>
                  <Field label="Departure time (optional)">
                    <Input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
                  </Field>
                  {tripType === "round_trip" ? (
                    <>
                      <Field label="Return date">
                        <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                      </Field>
                      <Field label="Return time (optional)">
                        <Input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} />
                      </Field>
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  {legs.map((leg, i) => (
                    <div key={i} className="rounded-xl border border-border/70 bg-muted/30 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-navy-soft">Leg {i + 1}</p>
                        {legs.length > 2 ? (
                          <button
                            type="button"
                            onClick={() => setLegs((prev) => prev.filter((_, idx) => idx !== i))}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-orange"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </button>
                        ) : null}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="From">
                          <Input value={leg.from} onChange={(e) => setLeg(i, { from: e.target.value })} maxLength={120} />
                        </Field>
                        <Field label="To">
                          <Input value={leg.to} onChange={(e) => setLeg(i, { to: e.target.value })} maxLength={120} />
                        </Field>
                        <Field label="Date">
                          <Input type="date" value={leg.date} onChange={(e) => setLeg(i, { date: e.target.value })} />
                        </Field>
                        <Field label="Time (optional)">
                          <Input type="time" value={leg.time} onChange={(e) => setLeg(i, { time: e.target.value })} />
                        </Field>
                      </div>
                    </div>
                  ))}
                  {legs.length < 8 ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setLegs((prev) => [...prev, { from: "", to: "", date: "", time: "" }])}
                    >
                      <Plus className="mr-1 h-4 w-4" /> Add another leg
                    </Button>
                  ) : null}
                </div>
              )}

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Number of passengers">
                  <Input type="number" min={1} max={500} value={passengers} onChange={(e) => setPassengers(e.target.value)} />
                </Field>
                <Field label="Aircraft preference">
                  <select className={selectClass} value={aircraftPreference} onChange={(e) => setAircraftPreference(e.target.value)}>
                    {AIRCRAFT.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Purpose">
                  <select className={selectClass} value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                    {PURPOSES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Budget range (optional)" hint="Helps us quote faster">
                  <Input value={budgetRange} onChange={(e) => setBudgetRange(e.target.value)} placeholder="e.g. ₦5m - ₦8m" maxLength={120} />
                </Field>
                <Field label="Luggage / cargo (optional)" hint="Approx. weight or description">
                  <Input value={luggageCargo} onChange={(e) => setLuggageCargo(e.target.value)} placeholder="e.g. 6 bags, ~120kg" maxLength={200} />
                </Field>
                <Field label="Dates flexible?">
                  <label className="flex h-11 items-center gap-2 text-sm text-navy-soft">
                    <input type="checkbox" checked={flexibleDates} onChange={(e) => setFlexibleDates(e.target.checked)} />
                    Yes - flexible dates may unlock better pricing
                  </label>
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Special requests (optional)" hint="Catering, ground transport, specific aircraft, accessibility, etc.">
                  <Textarea value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} maxLength={1500} rows={3} />
                </Field>
              </div>
            </section>

            {/* Contact */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
              <h2 className="mb-4 text-lg font-bold text-navy">Your contact details</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Full name">
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={160} required />
                </Field>
                <Field label="Email">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} required />
                </Field>
                <Field label="Phone">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} required />
                </Field>
                <Field label="WhatsApp (optional)">
                  <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} maxLength={40} />
                </Field>
              </div>
            </section>

            {!signedIn ? (
              <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
                <p className="text-sm text-muted-foreground">
                  Please sign in so we can save your request and send your quote. It only takes a moment.
                </p>
                <Button asChild size="lg" className="mt-4">
                  <Link to="/auth" search={{ redirect: "/flight-charter" }}>
                    Sign in or create an account <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="flex items-start gap-2 text-sm text-navy-soft">
                  <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
                  I confirm the details are correct and authorise Amazingfly to contact me with a charter quotation.
                </label>
                <Button type="submit" size="lg" disabled={!consent || create.isPending}>
                  {create.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
                  ) : (
                    <>Request my charter quote <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            )}

            {error ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>
            ) : null}
          </form>
        </div>
      </div>
    </>
  );
}
