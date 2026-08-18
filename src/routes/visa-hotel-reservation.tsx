import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { Disclaimer, PageHero } from "@/components/PageParts";
import { VisaHotelReservationSearch } from "@/components/VisaHotelReservationSearch";

export const Route = createFileRoute("/visa-hotel-reservation")({
  validateSearch: (search: Record<string, unknown>) => ({
    from: typeof search["from"] === "string" ? search["from"].slice(0, 80) : "",
    to: typeof search["to"] === "string" ? search["to"].slice(0, 80) : "",
  }),
  head: () => ({
    meta: [
      { title: "Visa Hotel Reservation | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Get a genuine supplier-backed hotel reservation for your visa application with clear cancellation terms and a separate Amazingfly processing fee.",
      },
      { property: "og:title", content: "Visa Hotel Reservation | Amazingfly.ng" },
      {
        property: "og:description",
        content:
          "Search eligible refundable pay-at-property hotel rates and create a genuine reservation for your visa application.",
      },
      { property: "og:url", content: "/visa-hotel-reservation" },
    ],
    links: [{ rel: "canonical", href: "/visa-hotel-reservation" }],
  }),
  component: VisaHotelReservationPage,
});

function VisaHotelReservationPage() {
  const search = Route.useSearch();
  const [roomRevealMessage, setRoomRevealMessage] = useState("");

  const revealRoomPanel = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    const button = target.closest("button");
    if (!button?.textContent?.includes("See visa-suitable rooms")) return;

    setRoomRevealMessage("Opening visa-suitable rooms…");

    window.setTimeout(() => {
      const headings = Array.from(document.querySelectorAll("h2"));
      const roomHeading = headings.find((heading) =>
        heading.textContent?.trim().startsWith("Eligible rooms at"),
      );

      if (!roomHeading) {
        setRoomRevealMessage(
          "The hotel was selected, but no room panel appeared. Please try another hotel.",
        );
        return;
      }

      roomHeading.setAttribute("tabindex", "-1");
      roomHeading.scrollIntoView({ behavior: "smooth", block: "start" });
      (roomHeading as HTMLElement).focus({ preventScroll: true });
      setRoomRevealMessage("Visa-suitable room options are now open below.");
    }, 80);
  };

  return (
    <>
      <PageHero
        eyebrow="Visa travel documents"
        title="Hotel reservation for your visa application"
        description="Choose a genuine live hotel reservation from eligible refundable pay-at-property rates. Amazingfly handles the reservation processing and documentation for a ₦15,000 service fee."
      />
      <section className="container-page section-y" onClickCapture={revealRoomPanel}>
        {roomRevealMessage ? (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 rounded-2xl border border-mint/30 bg-mint-tint/60 px-4 py-3 text-sm font-semibold text-navy"
          >
            {roomRevealMessage}
          </div>
        ) : null}

        <VisaHotelReservationSearch
          initialOrigin={search.from || "Nigeria"}
          initialDestination={search.to}
        />
        <div className="mt-10 max-w-4xl">
          <Disclaimer>
            The ₦15,000 charge is an Amazingfly processing and documentation service fee, not a hotel deposit and not part-payment of the accommodation. Hotel rates, cancellation rules and reservation status remain subject to the accommodation provider. Amazingfly does not guarantee visa approval.
          </Disclaimer>
        </div>
      </section>
    </>
  );
}
