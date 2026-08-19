import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, CreditCard, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";

import { AccountShell, useSessionQuery } from "@/components/AccountShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getVisaHotelReservationRequest } from "@/lib/visa-hotel-reservation.functions";
import { submitVisaHotelCardGuarantee } from "@/lib/visa-hotel-card-guarantee.functions";

export const Route = createFileRoute("/visa-hotel-guarantee/$requestId")({
  head: () => ({
    meta: [
      { title: "Hotel Guarantee Card | Amazingfly.ng" },
      {
        name: "description",
        content: "Securely register the guarantee card required for a pay-at-property hotel reservation.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VisaHotelGuaranteePage,
});

function VisaHotelGuaranteePage() {
  const { requestId } = Route.useParams();
  const navigate = useNavigate();
  const { data: session } = useSessionQuery();
  const fetchReservation = useServerFn(getVisaHotelReservationRequest);
  const submitGuarantee = useServerFn(submitVisaHotelCardGuarantee);

  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const reservation = useQuery({
    queryKey: ["visa-hotel-guarantee", requestId],
    queryFn: () => fetchReservation({ data: { request_id: requestId } }),
    enabled: Boolean(session?.user),
  });

  const complete = useMutation({
    mutationFn: () =>
      submitGuarantee({
        data: {
          request_id: requestId,
          card_number: cardNumber,
          card_holder: cardHolder,
          expiry_month: expiryMonth,
          expiry_year: expiryYear,
          ...(reservation.data?.hotel.paymentRequiresCvc ? { cvc } : {}),
        },
      }),
    onSuccess: (result) => {
      if (!result.ok) return;
      void navigate({
        to: "/booking-confirmation/$requestId",
        params: { requestId },
        replace: true,
      });
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const digits = cardNumber.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) {
      setFormError("Enter a valid card number containing 13 to 19 digits.");
      return;
    }
    if (cardHolder.trim().length < 2) {
      setFormError("Enter the cardholder name exactly as shown on the card.");
      return;
    }
    if (!/^(0[1-9]|1[0-2])$/.test(expiryMonth)) {
      setFormError("Enter the expiry month as two digits, for example 08.");
      return;
    }
    if (!/^\d{2}$/.test(expiryYear)) {
      setFormError("Enter the two-digit expiry year, for example 29.");
      return;
    }
    if (reservation.data?.hotel.paymentRequiresCvc && !/^\d{3}$/.test(cvc)) {
      setFormError("Enter the 3-digit card security code required by this property.");
      return;
    }

    complete.mutate();
  };

  const data = reservation.data;
  const requiresCvc = Boolean(data?.hotel.paymentRequiresCvc);
  const mutationError =
    complete.isError
      ? "We could not register this hotel guarantee card. Please try again."
      : complete.data && !complete.data.ok
        ? complete.data.message
        : null;

  return (
    <AccountShell
      title="Complete your hotel guarantee"
      subtitle="Your Amazingfly service fee is paid. This property needs a guarantee card before the supplier can confirm the pay-at-property reservation."
    >
      {reservation.isPending ? (
        <div className="glass-card flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      ) : !data ? (
        <div className="glass-card rounded-3xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            We could not find this Visa Hotel Reservation on your account.
          </p>
          <Button asChild variant="ghost" className="mt-4 text-navy">
            <Link to="/my-requests">Back to my requests</Link>
          </Button>
        </div>
      ) : data.paymentStatus !== "payment_received" ? (
        <div className="glass-card rounded-3xl p-8">
          <p className="flex items-start gap-2 text-sm text-navy">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
            The Amazingfly service fee has not been confirmed yet. Complete the ₦15,000 service-fee payment before registering a hotel guarantee card.
          </p>
          <Button asChild className="btn-gradient mt-5 text-white">
            <Link to="/checkout/$requestId" params={{ requestId }}>Return to checkout</Link>
          </Button>
        </div>
      ) : !data.hotel.paymentRequiresCard && !data.hotel.paymentRequiresCvc ? (
        <div className="glass-card rounded-3xl p-8">
          <p className="flex items-start gap-2 text-sm text-navy">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
            This rate no longer requires a guarantee card. You can continue to your booking status.
          </p>
          <Button asChild className="btn-gradient mt-5 text-white">
            <Link to="/booking-confirmation/$requestId" params={{ requestId }}>View booking status</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={onSubmit} className="glass-card rounded-3xl p-6 md:p-8">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mint-tint">
                <CreditCard className="h-5 w-5 text-navy" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-navy">Guarantee card</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  The accommodation remains pay at property. This card is registered with the hotel provider as the rate guarantee; Amazingfly does not charge the accommodation amount here.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="visa-card-number">Card number</Label>
                <Input
                  id="visa-card-number"
                  name="cc-number"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                  placeholder="1234 5678 9012 3456"
                  maxLength={24}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visa-card-holder">Name on card</Label>
                <Input
                  id="visa-card-holder"
                  name="cc-name"
                  autoComplete="cc-name"
                  value={cardHolder}
                  onChange={(event) => setCardHolder(event.target.value)}
                  placeholder="CARDHOLDER NAME"
                  maxLength={120}
                  required
                />
              </div>

              <div className={`grid gap-4 ${requiresCvc ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                <div className="space-y-2">
                  <Label htmlFor="visa-expiry-month">Expiry month</Label>
                  <Input
                    id="visa-expiry-month"
                    name="cc-exp-month"
                    inputMode="numeric"
                    autoComplete="cc-exp-month"
                    value={expiryMonth}
                    onChange={(event) => setExpiryMonth(event.target.value.replace(/\D/g, "").slice(0, 2))}
                    placeholder="MM"
                    maxLength={2}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visa-expiry-year">Expiry year</Label>
                  <Input
                    id="visa-expiry-year"
                    name="cc-exp-year"
                    inputMode="numeric"
                    autoComplete="cc-exp-year"
                    value={expiryYear}
                    onChange={(event) => setExpiryYear(event.target.value.replace(/\D/g, "").slice(0, 2))}
                    placeholder="YY"
                    maxLength={2}
                    required
                  />
                </div>
                {requiresCvc ? (
                  <div className="space-y-2">
                    <Label htmlFor="visa-cvc">CVC</Label>
                    <Input
                      id="visa-cvc"
                      name="cc-csc"
                      type="password"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      value={cvc}
                      onChange={(event) => setCvc(event.target.value.replace(/\D/g, "").slice(0, 3))}
                      placeholder="123"
                      maxLength={3}
                      required
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {formError || mutationError ? (
              <p className="mt-5 flex items-start gap-2 rounded-2xl bg-peach-tint px-4 py-3 text-sm text-navy">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
                {formError ?? mutationError}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="btn-gradient mt-6 w-full text-white"
              disabled={complete.isPending}
            >
              {complete.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <LockKeyhole className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {complete.isPending ? "Registering card and confirming hotel…" : "Register card & confirm reservation"}
            </Button>
          </form>

          <div className="space-y-6">
            <div className="glass-card rounded-3xl p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-navy-soft">Reservation</p>
              <h2 className="mt-2 text-xl font-extrabold text-navy">{data.hotel.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{data.hotel.location || data.hotel.address}</p>
              <div className="mt-5 space-y-2 text-sm text-navy">
                <p><span className="font-bold">Room:</span> {data.hotel.roomType}</p>
                <p><span className="font-bold">Stay:</span> {data.hotel.checkIn} → {data.hotel.checkOut}</p>
                <p><span className="font-bold">Payment:</span> Pay at property</p>
                <p><span className="font-bold">Card:</span> Guarantee only at this stage</p>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6">
              <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
                Amazingfly does not save your raw card number or CVC. The details are used for this provider tokenization request and are not written to the reservation database.
              </p>
            </div>
          </div>
        </div>
      )}
    </AccountShell>
  );
}
