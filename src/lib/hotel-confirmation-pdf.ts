import { contactDetails } from "@/data/contact";
import { PDF_LOGO } from "./pdf-logo";
import type { BookingConfirmation } from "./payment/verify.functions";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM_LIMIT = 62;

type PdfFont = "F1" | "F2";
type PdfColor = [number, number, number];

type PdfPage = {
  commands: string[];
  cursorY: number;
  documentTitle: string;
};

const NAVY: PdfColor = [0.055, 0.12, 0.23];
const ORANGE: PdfColor = [0.94, 0.42, 0.1];
const TEXT: PdfColor = [0.12, 0.16, 0.22];
const MUTED: PdfColor = [0.42, 0.46, 0.52];
const LIGHT: PdfColor = [0.95, 0.96, 0.98];
const WHITE: PdfColor = [1, 1, 1];
// Brand palette (logo): coral -> purple gradient, navy + orange lettering.
const BRAND_CORAL: PdfColor = [1, 0.37, 0.4];
const BRAND_PURPLE: PdfColor = [0.55, 0.36, 0.96];
const BRAND_NAVY: PdfColor = [0.11, 0.17, 0.45];
const GREEN: PdfColor = [0.07, 0.55, 0.36];
const GREEN_TINT: PdfColor = [0.9, 0.97, 0.93];
const LAVENDER: PdfColor = [0.96, 0.95, 1];
const HEADER_HEIGHT = 104;

const PASSENGER_TITLE_LABELS: Record<string, string> = {
  mr: "Mr",
  ms: "Ms",
  mrs: "Mrs",
  miss: "Miss",
  dr: "Dr",
};

function pdfNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function rgb([r, g, b]: PdfColor): string {
  return `${pdfNumber(r)} ${pdfNumber(g)} ${pdfNumber(b)}`;
}

function normaliseText(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "-")
    .replace(/\u2192/g, "to")
    .replace(/[^\x20-\x7E]/g, "?");
}

function escapePdfText(value: string): string {
  return normaliseText(value).replace(/([\\()])/g, "\\$1");
}

function wrapText(value: string, fontSize: number, maxWidth = CONTENT_WIDTH): string[] {
  const clean = normaliseText(value).trim();
  if (!clean) return [];
  const maxChars = Math.max(18, Math.floor(maxWidth / (fontSize * 0.52)));
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    if (word.length > maxChars) {
      if (line) {
        lines.push(line);
        line = "";
      }
      for (let index = 0; index < word.length; index += maxChars) {
        lines.push(word.slice(index, index + maxChars));
      }
      continue;
    }

    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function addText(
  page: PdfPage,
  value: string,
  x: number,
  y: number,
  fontSize: number,
  font: PdfFont = "F1",
  color: PdfColor = TEXT,
) {
  page.commands.push(
    `BT /${font} ${pdfNumber(fontSize)} Tf ${rgb(color)} rg ${pdfNumber(x)} ${pdfNumber(y)} Td (${escapePdfText(value)}) Tj ET`,
  );
}

function addFilledRect(
  page: PdfPage,
  x: number,
  y: number,
  width: number,
  height: number,
  color: PdfColor,
) {
  page.commands.push(
    `${rgb(color)} rg ${pdfNumber(x)} ${pdfNumber(y)} ${pdfNumber(width)} ${pdfNumber(height)} re f`,
  );
}

function addLine(
  page: PdfPage,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: PdfColor,
  width = 1,
) {
  page.commands.push(
    `${rgb(color)} RG ${pdfNumber(width)} w ${pdfNumber(x1)} ${pdfNumber(y1)} m ${pdfNumber(x2)} ${pdfNumber(y2)} l S`,
  );
}

/** Approximate Helvetica text width (points) for right-aligning. */
function textWidth(value: string, fontSize: number, font: PdfFont = "F1"): number {
  return normaliseText(value).length * fontSize * (font === "F2" ? 0.56 : 0.5);
}

function mix(a: PdfColor, b: PdfColor, t: number): PdfColor {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Horizontal coral -> purple gradient made of thin vertical strips. */
function addGradient(page: PdfPage, x: number, y: number, width: number, height: number) {
  const steps = 80;
  const strip = width / steps;
  for (let i = 0; i < steps; i += 1) {
    addFilledRect(
      page,
      x + i * strip,
      y,
      strip + 0.6,
      height,
      mix(BRAND_CORAL, BRAND_PURPLE, i / (steps - 1)),
    );
  }
}

/** Filled rectangle with rounded corners (Bezier arcs). */
function addRoundedRect(
  page: PdfPage,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: PdfColor,
) {
  const r = Math.min(radius, width / 2, height / 2);
  const k = r * 0.5523;
  const n = pdfNumber;
  page.commands.push(
    [
      `${rgb(color)} rg`,
      `${n(x + r)} ${n(y)} m`,
      `${n(x + width - r)} ${n(y)} l`,
      `${n(x + width - r + k)} ${n(y)} ${n(x + width)} ${n(y + r - k)} ${n(x + width)} ${n(y + r)} c`,
      `${n(x + width)} ${n(y + height - r)} l`,
      `${n(x + width)} ${n(y + height - r + k)} ${n(x + width - r + k)} ${n(y + height)} ${n(x + width - r)} ${n(y + height)} c`,
      `${n(x + r)} ${n(y + height)} l`,
      `${n(x + r - k)} ${n(y + height)} ${n(x)} ${n(y + height - r + k)} ${n(x)} ${n(y + height - r)} c`,
      `${n(x)} ${n(y + r)} l`,
      `${n(x)} ${n(y + r - k)} ${n(x + r - k)} ${n(y)} ${n(x + r)} ${n(y)} c`,
      "f",
    ].join(" "),
  );
}

function addLogo(page: PdfPage, x: number, y: number, size: number) {
  page.commands.push(
    `q ${pdfNumber(size)} 0 0 ${pdfNumber(size)} ${pdfNumber(x)} ${pdfNumber(y)} cm /Logo Do Q`,
  );
}

function drawHeader(page: PdfPage) {
  const top = PAGE_HEIGHT - HEADER_HEIGHT;
  addGradient(page, 0, top, PAGE_WIDTH, HEADER_HEIGHT);
  addLogo(page, MARGIN, top + 18, 68);
  addText(page, "Amazingfly Travels", MARGIN + 84, top + 58, 21, "F2", WHITE);
  addText(page, page.documentTitle, MARGIN + 84, top + 36, 11.5, "F1", WHITE);
  const site = "amazingfly.ng";
  addText(page, site, PAGE_WIDTH - MARGIN - textWidth(site, 10, "F2"), top + 58, 10, "F2", WHITE);
  const phone = contactDetails.phoneDisplay;
  addText(page, phone, PAGE_WIDTH - MARGIN - textWidth(phone, 9), top + 40, 9, "F1", WHITE);
  addFilledRect(page, 0, top - 4, PAGE_WIDTH, 4, ORANGE);
  page.cursorY = top - 34;
}

function makePage(documentTitle: string): PdfPage {
  const page: PdfPage = { commands: [], cursorY: PAGE_HEIGHT - HEADER_HEIGHT - 34, documentTitle };
  drawHeader(page);
  return page;
}

function ensureSpace(pages: PdfPage[], required: number): PdfPage {
  let page = pages[pages.length - 1];
  if (!page || page.cursorY - required < BOTTOM_LIMIT) {
    page = makePage(pages[0]?.documentTitle ?? "Booking Outcome");
    pages.push(page);
  }
  return page;
}

function addSectionTitle(pages: PdfPage[], title: string) {
  const page = ensureSpace(pages, 56);
  page.cursorY -= 12;
  addRoundedRect(page, MARGIN, page.cursorY - 5, CONTENT_WIDTH, 28, 8, LAVENDER);
  addGradient(page, MARGIN + 12, page.cursorY + 3, 22, 3);
  addText(page, title.toUpperCase(), MARGIN + 42, page.cursorY + 4, 10.5, "F2", BRAND_NAVY);
  page.cursorY -= 32;
}

function addRow(pages: PdfPage[], label: string, value: string | null | undefined) {
  const clean = value?.trim();
  if (!clean) return;

  const labelWidth = 145;
  const lines = wrapText(clean, 10, CONTENT_WIDTH - labelWidth - 12);
  const height = Math.max(26, lines.length * 14 + 10);
  const page = ensureSpace(pages, height);

  addText(page, label, MARGIN, page.cursorY, 9, "F2", MUTED);
  lines.forEach((line, index) => {
    addText(page, line, MARGIN + labelWidth, page.cursorY - index * 14, 10, "F1", TEXT);
  });
  addLine(
    page,
    MARGIN,
    page.cursorY - height + 8,
    MARGIN + CONTENT_WIDTH,
    page.cursorY - height + 8,
    LIGHT,
    0.8,
  );
  page.cursorY -= height;
}

function addParagraph(pages: PdfPage[], text: string, color: PdfColor = TEXT) {
  const lines = wrapText(text, 9.5);
  let index = 0;

  while (index < lines.length) {
    const page = ensureSpace(pages, 24);
    const availableLines = Math.max(1, Math.floor((page.cursorY - BOTTOM_LIMIT) / 14));
    const chunk = lines.slice(index, index + availableLines);

    chunk.forEach((line, lineIndex) => {
      addText(page, line, MARGIN, page.cursorY - lineIndex * 14, 9.5, "F1", color);
    });
    page.cursorY -= chunk.length * 14 + 10;
    index += chunk.length;
  }
}

function money(amount: number, currency: string): string {
  const numeric = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${currency.toUpperCase()} ${numeric}`;
}

function date(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function dateTime(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function travellerName(passenger: BookingConfirmation["passengers"][number]): string {
  return [
    PASSENGER_TITLE_LABELS[passenger.title] ?? passenger.title,
    passenger.firstName,
    passenger.middleName,
    passenger.lastName,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildPdfBytes(pages: PdfPage[]): Uint8Array {
  const pageCount = pages.length;
  const fontRegularId = 3;
  const fontBoldId = 4;
  const logoId = 5;
  const firstPageId = 6;
  const objects: string[] = [];

  const pageKids = pages.map((_, index) => `${firstPageId + index * 2} 0 R`).join(" ");
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [${pageKids}] /Count ${pageCount} >>`;
  objects[fontRegularId] =
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  objects[fontBoldId] =
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;
  // Hex-encoded JPEG keeps the whole file ASCII, so string offsets stay exact.
  const logoStream = `${PDF_LOGO.hex}>`;
  objects[logoId] =
    `<< /Type /XObject /Subtype /Image /Width ${PDF_LOGO.width} /Height ${PDF_LOGO.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${logoStream.length} >>\nstream\n${logoStream}\nendstream`;

  pages.forEach((page, index) => {
    const pageId = firstPageId + index * 2;
    const contentId = pageId + 1;

    addLine(page, MARGIN, 43, PAGE_WIDTH - MARGIN, 43, LIGHT, 0.8);
    addText(page, "Amazingfly Travels | Amazingfly.ng", MARGIN, 28, 8, "F1", MUTED);
    addText(
      page,
      `Page ${index + 1} of ${pageCount}`,
      PAGE_WIDTH - MARGIN - 62,
      28,
      8,
      "F1",
      MUTED,
    );

    const stream = page.commands.join("\n");
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfNumber(PAGE_WIDTH)} ${pdfNumber(PAGE_HEIGHT)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> /XObject << /Logo ${logoId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = "%PDF-1.4\n%Amazingfly\n";
  const offsets: number[] = [0];
  const objectCount = Math.max(...Object.keys(objects).map(Number));

  for (let id = 1; id <= objectCount; id += 1) {
    const body = objects[id] ?? "<<>>";
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${body}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objectCount + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let id = 1; id <= objectCount; id += 1) {
    pdf += `${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

export function createHotelConfirmationPdf(confirmation: BookingConfirmation): {
  bytes: Uint8Array;
  filename: string;
} {
  const review = confirmation.review;
  const hotel = review.hotel;

  if (review.kind !== "hotel" || !hotel || review.bookingStatus !== "confirmed") {
    throw new Error("A confirmed hotel booking is required to generate this document.");
  }

  const pages: PdfPage[] = [makePage("Hotel Booking Confirmation")];
  const page = pages[0]!;
  const transaction = review.transaction;
  const amount = transaction?.amount ?? review.amount;
  const currency = transaction?.currency ?? review.currency;
  const guestCount = hotel.guests ?? review.passengerCount ?? 1;
  const roomCount = hotel.rooms ?? 1;
  const providerReference = confirmation.hotelSupplierReferences?.providerReference ?? null;
  const orderId = confirmation.hotelSupplierReferences?.orderId ?? null;
  const hotelConfirmation = providerReference || orderId || review.pnr || null;
  const amazingflyReference = review.reference || review.requestId;
  const voucher = confirmation.hotelVoucher ?? null;
  const amountLabel = transaction?.status === "successful" ? "Amount paid" : "Booking amount";

  // ---- Confirmed banner ---------------------------------------------------
  let y = page.cursorY + 12;
  addRoundedRect(page, MARGIN, y - 62, CONTENT_WIDTH, 62, 12, GREEN_TINT);
  addRoundedRect(page, MARGIN + 16, y - 32, 148, 22, 11, GREEN);
  addText(page, "BOOKING CONFIRMED", MARGIN + 29, y - 25, 10, "F2", WHITE);
  if (hotelConfirmation) {
    addText(
      page,
      `Hotel confirmation no. ${hotelConfirmation}`,
      MARGIN + 18,
      y - 50,
      9.5,
      "F1",
      TEXT,
    );
  }
  const refLabel = "AMAZINGFLY REFERENCE";
  addText(
    page,
    refLabel,
    PAGE_WIDTH - MARGIN - 24 - textWidth(refLabel, 8, "F2"),
    y - 24,
    8,
    "F2",
    MUTED,
  );
  addText(
    page,
    amazingflyReference,
    PAGE_WIDTH - MARGIN - 24 - textWidth(amazingflyReference, 13, "F2"),
    y - 43,
    13,
    "F2",
    BRAND_NAVY,
  );
  y -= 62 + 30;

  // ---- Hotel ---------------------------------------------------------------
  const nameLines = wrapText(hotel.name ?? "Your hotel", 19, CONTENT_WIDTH);
  nameLines.slice(0, 2).forEach((line, index) => {
    addText(page, line, MARGIN, y - index * 23, 19, "F2", BRAND_NAVY);
  });
  y -= Math.min(2, nameLines.length) * 23;
  const address = hotel.address ?? hotel.location;
  wrapText(address ?? "", 10, CONTENT_WIDTH)
    .slice(0, 2)
    .forEach((line) => {
      addText(page, line, MARGIN, y, 10, "F1", MUTED);
      y -= 14;
    });
  y -= 14;

  // ---- Stay tiles ------------------------------------------------------------
  const gap = 10;
  const tileWidth = (CONTENT_WIDTH - gap * 2) / 3;
  const tileHeight = 78;
  const nights =
    hotel.nights != null ? `${hotel.nights} night${hotel.nights === 1 ? "" : "s"}` : "Your stay";
  const tiles: [string, string, string][] = [
    [
      "CHECK-IN",
      date(hotel.checkIn) ?? "-",
      voucher?.checkInTime ? `from ${voucher.checkInTime} (local time)` : "Hotel check-in time",
    ],
    [
      "CHECK-OUT",
      date(hotel.checkOut) ?? "-",
      voucher?.checkOutTime ? `until ${voucher.checkOutTime} (local time)` : "Hotel check-out time",
    ],
    [
      "YOUR STAY",
      nights,
      `${guestCount} guest${guestCount === 1 ? "" : "s"}, ${roomCount} room${roomCount === 1 ? "" : "s"}`,
    ],
  ];
  tiles.forEach(([label, value, sub], index) => {
    const x = MARGIN + index * (tileWidth + gap);
    addRoundedRect(page, x, y - tileHeight, tileWidth, tileHeight, 12, LAVENDER);
    addGradient(page, x + 14, y - 16, 18, 3);
    addText(page, label, x + 14, y - 32, 8, "F2", MUTED);
    addText(page, value, x + 14, y - 52, 13, "F2", BRAND_NAVY);
    addText(page, sub, x + 14, y - 67, 8.5, "F1", TEXT);
  });
  page.cursorY = y - tileHeight - 20;

  // ---- Details -------------------------------------------------------------
  addSectionTitle(pages, "Your room");
  addRow(pages, "Room type", hotel.roomType);
  addRow(pages, "Board basis", hotel.boardType);
  addRow(pages, "Guests", `${guestCount}`);
  addRow(pages, "Rooms", `${roomCount}`);

  if (confirmation.passengers.length > 0) {
    addSectionTitle(pages, "Guests");
    confirmation.passengers.forEach((passenger, index) => {
      const name = travellerName(passenger);
      addRow(
        pages,
        `Guest ${index + 1}`,
        passenger.nationality ? `${name} - ${passenger.nationality}` : name,
      );
    });
  }

  addSectionTitle(pages, "Payment");
  addRow(pages, amountLabel, money(amount, currency));
  addRow(pages, "Transaction reference", transaction?.transaction_reference ?? null);
  addRow(pages, "Payment date", dateTime(transaction?.paid_at ?? null));
  addRow(pages, "Booking contact", confirmation.contactName || null);
  addRow(pages, "Contact email", confirmation.contactEmail || null);
  if (orderId && providerReference && orderId !== providerReference) {
    addRow(pages, "Supplier order", orderId);
  }

  addSectionTitle(pages, "Cancellation terms");
  addParagraph(
    pages,
    hotel.cancellationPolicy ||
      "No detailed cancellation wording is stored for this booking. Supplier cancellation terms and any applicable penalties still apply. Contact Amazingfly Travels before cancelling if you need the current supplier terms.",
  );

  addSectionTitle(pages, "Important information");
  for (const section of voucher?.importantInfo ?? []) {
    addParagraph(pages, `${section.title}: ${section.items.join(" ").replace(/\s+/g, " ")}`);
  }
  addParagraph(
    pages,
    "Please present this confirmation (printed or on your phone) together with a valid passport or ID at check-in. Hotel check-in requirements, local taxes, deposits and incidental charges may be set directly by the property.",
  );
  addParagraph(
    pages,
    "Any Amazingfly Travels service fee is separate from supplier cancellation penalties and hotel charges, and follows Amazingfly Travels' refund policy.",
    MUTED,
  );

  // ---- Thank-you box -------------------------------------------------------
  const closing = ensureSpace(pages, 96);
  closing.cursorY -= 10;
  const boxTop = closing.cursorY;
  addRoundedRect(closing, MARGIN, boxTop - 78, CONTENT_WIDTH, 78, 12, LAVENDER);
  addGradient(closing, MARGIN, boxTop - 4, CONTENT_WIDTH, 4);
  addLogo(closing, MARGIN + 14, boxTop - 66, 50);
  addText(
    closing,
    "Thank you for booking with Amazingfly Travels",
    MARGIN + 76,
    boxTop - 28,
    12,
    "F2",
    BRAND_NAVY,
  );
  addText(
    closing,
    `Questions about your stay? Call or WhatsApp ${contactDetails.phoneDisplay}`,
    MARGIN + 76,
    boxTop - 46,
    9,
    "F1",
    TEXT,
  );
  addText(
    closing,
    `${contactDetails.email}  |  amazingfly.ng  |  ${contactDetails.businessHours}`,
    MARGIN + 76,
    boxTop - 60,
    9,
    "F1",
    MUTED,
  );
  closing.cursorY = boxTop - 90;

  const reference = amazingflyReference.replace(/[^a-zA-Z0-9_-]+/g, "-");
  return {
    bytes: buildPdfBytes(pages),
    filename: `Amazingfly-Hotel-Confirmation-${reference}.pdf`,
  };
}

function outcomeTitle(confirmation: BookingConfirmation): string {
  const { review } = confirmation;
  const visaReservation =
    review.kind === "flight" && review.catalogueId === "visa-flight-reservation";
  if (review.bookingStatus === "failed") return "Payment Receipt & Booking Status";
  if (visaReservation && review.bookingStatus === "on_hold") {
    return "Visa Flight Reservation - Temporary Itinerary";
  }
  if (review.bookingStatus === "confirmed") return "Booking Confirmation";
  return "Booking Status Document";
}

export function createBookingOutcomePdf(confirmation: BookingConfirmation): {
  bytes: Uint8Array;
  filename: string;
} {
  const { review } = confirmation;
  if (review.kind === "hotel" && review.bookingStatus === "confirmed") {
    return createHotelConfirmationPdf(confirmation);
  }

  const title = outcomeTitle(confirmation);
  const pages: PdfPage[] = [makePage(title)];
  const transaction = review.transaction;
  const paid = transaction?.status === "successful";
  const visaReservation =
    review.kind === "flight" && review.catalogueId === "visa-flight-reservation";

  addSectionTitle(pages, "Booking outcome");
  addRow(pages, "Amazingfly reference", review.reference || review.requestId);
  addRow(pages, "Service", review.serviceType);
  addRow(pages, "Payment status", paid ? "Payment received" : review.paymentStatus);
  addRow(pages, "Supplier booking status", review.bookingStatus);
  addRow(pages, "Transaction reference", transaction?.transaction_reference ?? null);
  addRow(
    pages,
    paid ? "Amount paid" : "Booking amount",
    money(transaction?.amount ?? review.amount, transaction?.currency ?? review.currency),
  );
  addRow(pages, "Payment date", dateTime(transaction?.paid_at ?? null));
  addRow(pages, "Booking contact", confirmation.contactName || null);
  addRow(pages, "Contact email", confirmation.contactEmail || null);

  if (review.kind === "flight" && review.flight) {
    addSectionTitle(pages, "Flight details");
    addRow(pages, "Airline", review.flight.airline);
    addRow(pages, "Flight number", review.flight.flightNumber);
    addRow(
      pages,
      "Route",
      review.flight.origin && review.flight.destination
        ? `${review.flight.origin} to ${review.flight.destination}`
        : null,
    );
    addRow(pages, "Departure", dateTime(review.flight.departureAt));
    addRow(pages, "Arrival", dateTime(review.flight.arrivalAt));
    addRow(pages, "Cabin", review.flight.cabinClass);
    addRow(pages, "Airline reference (PNR)", review.pnr);
    addRow(pages, "Airline order ID", review.duffelOrderId);
    if (!visaReservation) addRow(pages, "Ticket number", review.ticketNumber);
    if (visaReservation) addRow(pages, "Reservation expiry", dateTime(review.holdExpiresAt));
  }

  if (confirmation.passengers.length > 0) {
    addSectionTitle(pages, "Travellers");
    confirmation.passengers.forEach((passenger, index) => {
      addRow(pages, `Traveller ${index + 1}`, travellerName(passenger));
    });
  }

  addSectionTitle(pages, "Important status notice");
  if (review.bookingStatus === "failed") {
    addParagraph(
      pages,
      "Payment was received, but the supplier did not confirm the booking. This document is a payment receipt and status record only. It is not a ticket, confirmed reservation, PNR or visa-support itinerary. Do not make another payment for this request while Amazingfly Travels reviews rebooking or any applicable refund.",
    );
  } else if (visaReservation) {
    addParagraph(
      pages,
      "This is a temporary airline reservation for visa-application support, not a paid airline ticket. It is valid only until the stated expiry and only when genuine airline reference details are shown. Embassy and consulate requirements vary, and this document does not guarantee visa approval.",
    );
  } else if (review.bookingStatus === "on_hold") {
    addParagraph(
      pages,
      "This fare is temporarily held subject to the airline's expiry and payment deadline. It is not a ticket until full payment and airline ticket issuance are confirmed.",
    );
  } else {
    addParagraph(
      pages,
      "This document records the booking outcome currently held by Amazingfly Travels. Supplier references and ticket numbers are shown only when genuinely returned by the supplier.",
    );
  }

  const reference = (review.reference || review.requestId).replace(/[^a-zA-Z0-9_-]+/g, "-");
  return {
    bytes: buildPdfBytes(pages),
    filename: `Amazingfly-Booking-${reference}.pdf`,
  };
}

export function downloadBookingOutcomePdf(confirmation: BookingConfirmation) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const { bytes, filename } = createBookingOutcomePdf(confirmation);
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadHotelConfirmationPdf(confirmation: BookingConfirmation) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const { bytes, filename } = createHotelConfirmationPdf(confirmation);
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
