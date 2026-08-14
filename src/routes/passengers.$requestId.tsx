import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Loader2, ShieldCheck, UserRound, Users } from "lucide-react";

import { AccountShell, useSessionQuery } from "@/components/AccountShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBookingReview } from "@/lib/payment/checkout.functions";
import { getFlightOfferInfo } from "@/lib/travel-api/flight-offer.functions";
import {
  contactSchema,
  emptyPassenger,
  PASSENGER_GENDERS,
  PASSENGER_TITLES,
  GENDER_LABELS,
  TITLE_LABELS,
  validatePassengers,
  type BookingContact,
  type BookingPassenger,
} from "@/lib/booking/passenger.types";
import {
  getBookingPassengers,
  saveBookingPassengers,
} from "@/lib/booking/passengers.functions";

export const Route = createFileRoute("/passengers/$requestId")({
  head: () => ({
    meta: [
      { title: "Traveller Details | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Add the booking contact and traveller details required to complete your Amazingfly Travels booking.",
      },
      { property: "og:title", content: "Traveller Details | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Enter traveller details for your Amazingfly Travels booking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PassengerDetailsPage,
});

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
      <Label className="text-xs font-bold uppercase tracking-[0.12em] text-navy-soft">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const selectClass =
  "h-10 w-full rounded-xl border border-white/70 bg-white/80 px-3 text-sm font-medium text-navy outline-none focus:ring-2 focus:ring-sky";

function PassengerDetailsPage() {
  const { requestId } = Route.useParams();
  const navigate = useNavigate();
  const { data: session } = useSessionQuery();

  const fetchReview = useServerFn(getBookingReview);
  const fetchPassengers = useServerFn(getBookingPassengers);
  const fetchOfferInfo = useServerFn(getFlightOfferInfo);
  const save = useServerFn(saveBookingPassengers);

  const review = useQuery({
    queryKey: ["booking-review", requestId],
    queryFn: () => fetchReview({ data: { request_id: requestId } }),
    enabled: Boolean(session?.user),
  });

  const saved = useQuery({
    queryKey: ["booking-passengers", requestId],
    queryFn: () => fetchPassengers({ data: { request_id: requestId } }),
    enabled: Boolean(session?.user),
  });

  const offerId = review.data?.offerId ?? null;
  const offer = useQuery({
    queryKey: ["flight-offer-info", offerId],
    queryFn: () => fetchOfferInfo({ data: { offer_id: offerId as string } }),
    enabled: Boolean(offerId),
  });

  const isHotel = review.data?.kind === "hotel";
  const passportRequired = review.data?.kind === "flight" && offer.data?.ok
    ? offer.data.info.passportRequired
    : false;
  const count =
    review.data?.flight?.passengers ?? review.data?.hotel?.guests ?? 1;

  const [contact, setContact] = useState<BookingContact>({
    fullName: "",
    email: "",
    phone: "",
    country: "Nigeria",
  });
  const [passengers, setPassengers] = useState<BookingPassenger[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bundle = saved.data;
    if (!bundle) return;
    if (bundle.contact) {
      setContact({
        fullName: bundle.contact.fullName || session?.user?.full_name || "",
        email: bundle.contact.email || session?.user?.email || "",
        phone: bundle.contact.phone || session?.user?.phone || "",
        country: bundle.contact.country || session?.user?.nationality || "Nigeria",
      });
    }
    setPassengers(
      bundle.passengers.length > 0
        ? bundle.passengers.map(({ id: _id, ...rest }) => rest)
        : Array.from({ length: Math.max(1, count) }, () => emptyPassenger()),
    );
  }, [saved.data, count, session]);

  const ready = useMemo(() => passengers.length > 0, [passengers]);

  const submit = useMutation({
    mutationFn: () =>
      save({
        data: { request_id: requestId, contact, passengers, passportRequired },
      }),
    onSuccess: (result) => {
      if (result.ok) {
        void navigate({ to: "/booking-review/$requestId", params: { requestId } });
      } else {
        setError(result.message);
      }
    },
  });

  const update = (index: number, patch: Partial<BookingPassenger>) => {
    setPassengers((list) =>
      list.map((passenger, i) => (i === index ? { ...passenger, ...patch } : passenger)),
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const contactCheck = contactSchema.safeParse(contact);
    if (!contactCheck.success) {
      setError(contactCheck.error.issues[0]?.message ?? "Please complete the contact details.");
      return;
    }
    const invalid = validatePassengers(passengers, passportRequired);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (passengers.length !== Math.max(1, count)) {
      setError(`Please provide details for all ${Math.max(1, count)} traveller(s).`);
      return;
    }
    submit.mutate();
  };

  return (
    <AccountShell
      title="Traveller details"
      subtitle={
        isHotel
          ? "Add the booking contact and every hotel guest exactly as their name should appear on the reservation."
          : "Names must match the passport or ID used to travel. Nothing is charged at this step."
      }
    >
      {review.isPending || saved.isPending ? (
        <div className="glass-card flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      ) : !review.data ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <p className="text-sm text-muted-foreground">
            We could not find this booking on your account.
          </p>
          <Button asChild variant="ghost" className="mt-4 text-navy">
            <Link to="/my-requests">Back to my requests</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="glass-card rounded-3xl p-6 md:p-8">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-tint">
              <UserRound className="h-5 w-5 text-navy" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-extrabold text-navy">Booking contact</h2>
            <p className="text-sm text-muted-foreground">
              We send your booking reference and status updates here.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <Input value={contact.fullName} onChange={(event) => setContact({ ...contact, fullName: event.target.value })} maxLength={120} required />
              </Field>
              <Field label="Email">
                <Input type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} maxLength={255} required />
              </Field>
              <Field label="Phone number">
                <Input value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} maxLength={32} required />
              </Field>
              <Field label="Country / nationality">
                <Input value={contact.country} onChange={(event) => setContact({ ...contact, country: event.target.value })} maxLength={80} required />
              </Field>
            </div>
          </section>

          <section className="glass-card rounded-3xl p-6 md:p-8">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-peach-tint">
              <Users className="h-5 w-5 text-navy" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-extrabold text-navy">
              Travellers ({passengers.length})
            </h2>
            <p className="text-sm text-muted-foreground">
              {isHotel
                ? "RateHawk requires the first and last name of every guest included in this hotel reservation."
                : passportRequired
                  ? "This airline requires passport details for every traveller."
                  : "Passport details are optional for this fare — add them if you already have them."}
            </p>

            <div className="mt-6 space-y-6">
              {passengers.map((passenger, index) => (
                <div key={index} className="rounded-2xl border border-white/70 bg-white/60 p-4 md:p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-navy-soft">Traveller {index + 1}</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Title">
                      <select className={selectClass} value={passenger.title} onChange={(event) => update(index, { title: event.target.value as BookingPassenger["title"] })}>
                        {PASSENGER_TITLES.map((title) => <option key={title} value={title}>{TITLE_LABELS[title]}</option>)}
                      </select>
                    </Field>
                    <Field label="First name">
                      <Input value={passenger.firstName} onChange={(event) => update(index, { firstName: event.target.value })} maxLength={80} required />
                    </Field>
                    <Field label="Middle name (optional)">
                      <Input value={passenger.middleName ?? ""} onChange={(event) => update(index, { middleName: event.target.value })} maxLength={80} />
                    </Field>
                    <Field label="Last name">
                      <Input value={passenger.lastName} onChange={(event) => update(index, { lastName: event.target.value })} maxLength={80} required />
                    </Field>
                    <Field label="Date of birth">
                      <Input type="date" value={passenger.dateOfBirth} onChange={(event) => update(index, { dateOfBirth: event.target.value })} required />
                    </Field>
                    <Field label="Gender">
                      <select className={selectClass} value={passenger.gender} onChange={(event) => update(index, { gender: event.target.value as BookingPassenger["gender"] })}>
                        {PASSENGER_GENDERS.map((gender) => <option key={gender} value={gender}>{GENDER_LABELS[gender]}</option>)}
                      </select>
                    </Field>
                    <Field label="Nationality">
                      <Input value={passenger.nationality} onChange={(event) => update(index, { nationality: event.target.value })} maxLength={80} required />
                    </Field>
                    {!isHotel ? (
                      <>
                        <Field label={`Passport number${passportRequired ? "" : " (optional)"}`}>
                          <Input value={passenger.passportNumber ?? ""} onChange={(event) => update(index, { passportNumber: event.target.value })} maxLength={40} />
                        </Field>
                        <Field label={`Issuing country${passportRequired ? "" : " (optional)"}`}>
                          <Input value={passenger.passportCountry ?? ""} onChange={(event) => update(index, { passportCountry: event.target.value })} maxLength={80} />
                        </Field>
                        <Field label={`Passport expiry${passportRequired ? "" : " (optional)"}`}>
                          <Input type="date" value={passenger.passportExpiry ?? ""} onChange={(event) => update(index, { passportExpiry: event.target.value })} />
                        </Field>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {error ? <p className="rounded-2xl bg-coral-tint px-4 py-3 text-sm font-medium text-navy">{error}</p> : null}

          <div className="glass-card flex flex-col gap-4 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Traveller details are stored securely against your booking and shared only with the relevant travel provider.
            </p>
            <Button type="submit" size="lg" className="btn-gradient text-white" disabled={submit.isPending || !ready}>
              {submit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="mr-2 h-4 w-4" aria-hidden="true" />}
              Continue to review
            </Button>
          </div>
        </form>
      )}
    </AccountShell>
  );
}
