import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Loader2, ShieldCheck, UserRound, Users } from "lucide-react";

import { AccountShell, useSessionQuery } from "@/components/AccountShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { getBookingPassengers, saveBookingPassengers } from "@/lib/booking/passengers.functions";
import { getVisaHotelReservationRequest } from "@/lib/visa-hotel-reservation.functions";
import { formatMoney } from "@/lib/payment-status";

export const Route = createFileRoute("/visa-hotel-reservation/travellers/$requestId")({
  head: () => ({
    meta: [
      { title: "Visa Reservation Traveller Details | Amazingfly.ng" },
      {
        name: "description",
        content: "Add the traveller and passport details required for your visa hotel reservation.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VisaReservationTravellersPage,
});

const selectClass =
  "h-10 w-full rounded-xl border border-white/70 bg-white/80 px-3 text-sm font-medium text-navy outline-none focus:ring-2 focus:ring-sky";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold uppercase tracking-[0.12em] text-navy-soft">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function VisaReservationTravellersPage() {
  const { requestId } = Route.useParams();
  const navigate = useNavigate();
  const { data: session } = useSessionQuery();
  const fetchReservation = useServerFn(getVisaHotelReservationRequest);
  const fetchPassengers = useServerFn(getBookingPassengers);
  const savePassengers = useServerFn(saveBookingPassengers);

  const reservation = useQuery({
    queryKey: ["visa-hotel-reservation", requestId],
    queryFn: () => fetchReservation({ data: { request_id: requestId } }),
    enabled: Boolean(session?.user),
  });
  const saved = useQuery({
    queryKey: ["booking-passengers", requestId],
    queryFn: () => fetchPassengers({ data: { request_id: requestId } }),
    enabled: Boolean(session?.user),
  });

  const count = Math.max(1, reservation.data?.hotel.guests ?? 1);
  const [contact, setContact] = useState<BookingContact>({
    fullName: "",
    email: "",
    phone: "",
    country: "Nigeria",
  });
  const [passengers, setPassengers] = useState<BookingPassenger[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!saved.data) return;
    setContact({
      fullName: saved.data.contact?.fullName || session?.user?.full_name || "",
      email: saved.data.contact?.email || session?.user?.email || "",
      phone: saved.data.contact?.phone || session?.user?.phone || "",
      country: saved.data.contact?.country || session?.user?.nationality || "Nigeria",
    });
    setPassengers(
      saved.data.passengers.length
        ? saved.data.passengers.map(({ id: _id, ...rest }) => rest)
        : Array.from({ length: count }, () => emptyPassenger()),
    );
  }, [saved.data, session, count]);

  const ready = useMemo(() => passengers.length === count && count > 0, [passengers.length, count]);

  const submit = useMutation({
    mutationFn: () =>
      savePassengers({
        data: {
          request_id: requestId,
          contact,
          passengers,
          passportRequired: true,
        },
      }),
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.message.replace("for this flight", "for this visa reservation"));
        return;
      }
      void navigate({ to: "/checkout/$requestId", params: { requestId } });
    },
    onError: () => setError("We could not save the traveller details. Please try again."),
  });

  const updatePassenger = (index: number, patch: Partial<BookingPassenger>) => {
    setPassengers((current) =>
      current.map((passenger, i) => (i === index ? { ...passenger, ...patch } : passenger)),
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
    if (passengers.length !== count) {
      setError(`Please provide details for all ${count} traveller(s).`);
      return;
    }
    const invalid = validatePassengers(passengers, true);
    if (invalid) {
      setError(invalid.replace("for this flight", "for this visa reservation"));
      return;
    }
    submit.mutate();
  };

  const data = reservation.data;

  return (
    <AccountShell
      title="Traveller & passport details"
      subtitle="Enter every guest exactly as shown on the passport that will be used for the visa application."
    >
      {reservation.isPending || saved.isPending ? (
        <div className="glass-card flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      ) : !data ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <p className="text-sm text-muted-foreground">We could not find this visa hotel reservation on your account.</p>
          <Button asChild variant="ghost" className="mt-4 text-navy">
            <Link to="/visa-hotel-reservation">Start again</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="glass-card rounded-3xl p-6 md:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange">Selected reservation</p>
                <h2 className="mt-2 text-xl font-extrabold text-navy">{data.hotel.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{data.hotel.location || data.hotel.address}</p>
                <p className="mt-3 text-sm font-semibold text-navy">
                  {data.hotel.checkIn} → {data.hotel.checkOut} · {data.hotel.nights} night{data.hotel.nights === 1 ? "" : "s"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.hotel.roomType}{data.hotel.boardType ? ` · ${data.hotel.boardType}` : ""} · {count} traveller{count === 1 ? "" : "s"}
                </p>
              </div>
              <div className="rounded-2xl border border-mint/30 bg-mint-tint/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-navy-soft">Amazingfly service fee</p>
                <p className="mt-1 text-2xl font-extrabold text-navy">{formatMoney(data.fee, data.feeCurrency)}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Paid separately from the accommodation. The hotel amount remains subject to the selected property's rate terms.
                </p>
              </div>
            </div>
          </section>

          <section className="glass-card rounded-3xl p-6 md:p-8">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-tint">
              <UserRound className="h-5 w-5 text-navy" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-extrabold text-navy">Reservation contact</h2>
            <p className="mt-1 text-sm text-muted-foreground">Booking confirmation and reservation updates will be sent here.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Full name"><Input value={contact.fullName} onChange={(event) => setContact({ ...contact, fullName: event.target.value })} maxLength={120} required /></Field>
              <Field label="Email"><Input type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} maxLength={255} required /></Field>
              <Field label="Phone number"><Input value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} maxLength={32} required /></Field>
              <Field label="Country / nationality"><Input value={contact.country} onChange={(event) => setContact({ ...contact, country: event.target.value })} maxLength={80} required /></Field>
            </div>
          </section>

          <section className="glass-card rounded-3xl p-6 md:p-8">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-peach-tint">
              <Users className="h-5 w-5 text-navy" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-extrabold text-navy">Travellers ({count})</h2>
            <p className="mt-1 text-sm text-muted-foreground">Passport details are required because the reservation document must identify the traveller accurately.</p>

            <div className="mt-6 space-y-6">
              {passengers.map((passenger, index) => (
                <div key={index} className="rounded-2xl border border-white/70 bg-white/60 p-4 md:p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-navy-soft">Traveller {index + 1}</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Title">
                      <select className={selectClass} value={passenger.title} onChange={(event) => updatePassenger(index, { title: event.target.value as BookingPassenger["title"] })}>
                        {PASSENGER_TITLES.map((title) => <option key={title} value={title}>{TITLE_LABELS[title]}</option>)}
                      </select>
                    </Field>
                    <Field label="First name"><Input value={passenger.firstName} onChange={(event) => updatePassenger(index, { firstName: event.target.value })} maxLength={80} required /></Field>
                    <Field label="Middle name (optional)"><Input value={passenger.middleName ?? ""} onChange={(event) => updatePassenger(index, { middleName: event.target.value })} maxLength={80} /></Field>
                    <Field label="Last name"><Input value={passenger.lastName} onChange={(event) => updatePassenger(index, { lastName: event.target.value })} maxLength={80} required /></Field>
                    <Field label="Date of birth"><Input type="date" value={passenger.dateOfBirth} onChange={(event) => updatePassenger(index, { dateOfBirth: event.target.value })} required /></Field>
                    <Field label="Gender">
                      <select className={selectClass} value={passenger.gender} onChange={(event) => updatePassenger(index, { gender: event.target.value as BookingPassenger["gender"] })}>
                        {PASSENGER_GENDERS.map((gender) => <option key={gender} value={gender}>{GENDER_LABELS[gender]}</option>)}
                      </select>
                    </Field>
                    <Field label="Nationality"><Input value={passenger.nationality} onChange={(event) => updatePassenger(index, { nationality: event.target.value })} maxLength={80} required /></Field>
                    <Field label="Passport number"><Input value={passenger.passportNumber ?? ""} onChange={(event) => updatePassenger(index, { passportNumber: event.target.value })} maxLength={40} required /></Field>
                    <Field label="Issuing country"><Input value={passenger.passportCountry ?? ""} onChange={(event) => updatePassenger(index, { passportCountry: event.target.value })} maxLength={80} required /></Field>
                    <Field label="Passport expiry"><Input type="date" value={passenger.passportExpiry ?? ""} onChange={(event) => updatePassenger(index, { passportExpiry: event.target.value })} required /></Field>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {error ? <p className="rounded-2xl bg-peach-tint p-4 text-sm font-medium text-navy">{error}</p> : null}

          <section className="rounded-3xl border border-mint/30 bg-mint-tint/60 p-5">
            <p className="flex items-start gap-2 text-sm leading-relaxed text-navy">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Your next step is secure Paystack checkout for the Amazingfly service fee. We submit the supplier-backed hotel reservation only after that payment is successfully verified.
            </p>
          </section>

          <div className="flex flex-wrap justify-between gap-3">
            <Button asChild type="button" variant="ghost" className="text-navy-soft">
              <Link to="/visa-hotel-reservation">Choose another hotel</Link>
            </Button>
            <Button type="submit" size="lg" className="btn-gradient text-white" disabled={!ready || submit.isPending}>
              {submit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Continue to ₦15,000 checkout
            </Button>
          </div>
        </form>
      )}
    </AccountShell>
  );
}
