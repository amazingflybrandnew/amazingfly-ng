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
};

const NAVY: PdfColor = [0.055, 0.12, 0.23];
const ORANGE: PdfColor = [0.94, 0.42, 0.1];
const TEXT: PdfColor = [0.12, 0.16, 0.22];
const MUTED: PdfColor = [0.42, 0.46, 0.52];
const LIGHT: PdfColor = [0.95, 0.96, 0.98];
const WHITE: PdfColor = [1, 1, 1];

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
    .replace(/[\u201C\u201D]/g, '"')
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

function drawHeader(page: PdfPage) {
  addFilledRect(page, 0, PAGE_HEIGHT - 92, PAGE_WIDTH, 92, NAVY);
  addFilledRect(page, 0, PAGE_HEIGHT - 96, PAGE_WIDTH, 4, ORANGE);
  addText(page, "AMAZINGFLY TRAVELS", MARGIN, PAGE_HEIGHT - 45, 20, "F2", WHITE);
  addText(page, "Hotel Booking Confirmation", MARGIN, PAGE_HEIGHT - 67, 11, "F1", WHITE);
  addText(page, "Amazingfly.ng", PAGE_WIDTH - MARGIN - 78, PAGE_HEIGHT - 50, 9, "F2", WHITE);
  page.cursorY = PAGE_HEIGHT - 125;
}

function makePage(): PdfPage {
  const page: PdfPage = { commands: [], cursorY: PAGE_HEIGHT - 125 };
  drawHeader(page);
  return page;
}

function ensureSpace(pages: PdfPage[], required: number): PdfPage {
  let page = pages[pages.length - 1];
  if (!page || page.cursorY - required < BOTTOM_LIMIT) {
    page = makePage();
    pages.push(page);
  }
  return page;
}

function addSectionTitle(pages: PdfPage[], title: string) {
  const page = ensureSpace(pages, 42);
  addFilledRect(page, MARGIN, page.cursorY - 3, CONTENT_WIDTH, 28, LIGHT);
  addFilledRect(page, MARGIN, page.cursorY - 3, 4, 28, ORANGE);
  addText(page, title, MARGIN + 14, page.cursorY + 6, 12, "F2", NAVY);
  page.cursorY -= 38;
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
  const firstPageId = 5;
  const objects: string[] = [];

  const pageKids = pages.map((_, index) => `${firstPageId + index * 2} 0 R`).join(" ");
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [${pageKids}] /Count ${pageCount} >>`;
  objects[fontRegularId] =
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  objects[fontBoldId] =
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;

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
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfNumber(PAGE_WIDTH)} ${pdfNumber(PAGE_HEIGHT)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`;
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

export function createHotelConfirmationPdf(
  confirmation: BookingConfirmation,
): { bytes: Uint8Array; filename: string } {
  const review = confirmation.review;
  const hotel = review.hotel;

  if (review.kind !== "hotel" || !hotel || review.bookingStatus !== "confirmed") {
    throw new Error("A confirmed hotel booking is required to generate this document.");
  }

  const pages: PdfPage[] = [makePage()];
  const transaction = review.transaction;
  const amount = transaction?.amount ?? review.amount;
  const currency = transaction?.currency ?? review.currency;
  const guestCount = hotel.guests ?? review.passengerCount ?? 1;
  const providerReference = confirmation.hotelSupplierReferences?.providerReference ?? null;
  const orderId = confirmation.hotelSupplierReferences?.orderId ?? null;
  const bookingReference = review.pnr;
  const amountLabel = transaction?.status === "successful" ? "Amount paid" : "Booking amount";

  addSectionTitle(pages, "Confirmation summary");
  addRow(pages, "Amazingfly reference", review.reference || review.requestId);
  addRow(pages, "Booking status", "Confirmed");
  addRow(pages, "Hotel supplier reference", providerReference);
  addRow(pages, "RateHawk order ID", orderId && orderId !== providerReference ? orderId : null);
  addRow(
    pages,
    "Booking reference",
    bookingReference && bookingReference !== providerReference && bookingReference !== orderId
      ? bookingReference
      : null,
  );
  addRow(pages, "Transaction reference", transaction?.transaction_reference ?? null);
  addRow(pages, amountLabel, money(amount, currency));
  addRow(pages, "Payment date", dateTime(transaction?.paid_at ?? null));
  addRow(pages, "Booking contact", confirmation.contactName || null);
  addRow(pages, "Contact email", confirmation.contactEmail || null);

  addSectionTitle(pages, "Hotel details");
  addRow(pages, "Property", hotel.name);
  addRow(pages, "Address", hotel.address ?? hotel.location);
  addRow(pages, "Location", hotel.location);
  addRow(pages, "Check-in", date(hotel.checkIn));
  addRow(pages, "Check-out", date(hotel.checkOut));
  addRow(
    pages,
    "Stay",
    hotel.nights != null
      ? `${hotel.nights} night${hotel.nights === 1 ? "" : "s"}`
      : null,
  );
  addRow(pages, "Room type", hotel.roomType);
  addRow(pages, "Board basis", hotel.boardType);
  addRow(pages, "Guests", `${guestCount}`);
  addRow(pages, "Rooms", hotel.rooms != null ? `${hotel.rooms}` : null);

  if (confirmation.passengers.length > 0) {
    addSectionTitle(pages, "Travellers");
    confirmation.passengers.forEach((passenger, index) => {
      const name = travellerName(passenger);
      addRow(
        pages,
        `Traveller ${index + 1}`,
        passenger.nationality ? `${name} - ${passenger.nationality}` : name,
      );
    });
  }

  addSectionTitle(pages, "Cancellation terms");
  if (hotel.cancellationPolicy) {
    addParagraph(pages, hotel.cancellationPolicy);
  } else {
    addParagraph(
      pages,
      "No detailed cancellation wording is stored for this booking. Supplier cancellation terms and any applicable penalties still apply. Contact Amazingfly Travels before cancelling if you need the current supplier terms.",
    );
  }

  addSectionTitle(pages, "Amazingfly service-fee note");
  addParagraph(
    pages,
    "Any Amazingfly Travels service fee is separate from supplier hotel cancellation penalties and third-party hotel charges. Service-fee refunds follow Amazingfly Travels' refund policy and depend on whether service work has already begun. This note does not change the supplier's cancellation terms above.",
    MUTED,
  );

  addSectionTitle(pages, "Important information");
  addParagraph(
    pages,
    "Keep this confirmation with your travel records. Hotel check-in requirements, local taxes, deposits, incidental charges and identification requirements may be set directly by the property. This document confirms the booking details held by Amazingfly Travels; it does not replace any supplier voucher where the accommodation provider issues one separately.",
  );

  const reference = (review.reference || review.requestId).replace(
    /[^a-zA-Z0-9_-]+/g,
    "-",
  );

  return {
    bytes: buildPdfBytes(pages),
    filename: `Amazingfly-Hotel-Confirmation-${reference}.pdf`,
  };
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
